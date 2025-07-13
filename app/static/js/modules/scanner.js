import { eventBus, EVENTS } from './events.js';
import { api } from './api.js';
import { toast } from './ui.js';

// Scanner states
const SCANNER_STATE = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    SCANNING: 'scanning',
    ERROR: 'error'
};

// Scanner options
const SCANNER_CONFIG = {
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    supportedScanTypes: ['qr', 'barcode']
};

export class ScannerManager {
    constructor(options = {}) {
        this.containerId = options.containerId || 'scanner-container';
        this.container = document.getElementById(this.containerId);
        this.previewContainer = document.getElementById('scanner-preview');
        this.state = SCANNER_STATE.INITIALIZING;
        this.scanner = null;

        // Reference to currently active scan callback
        this._activeScanCallback = null;

        if (this.container) {
            this.initialize();
        }
    }

    async initialize() {
        try {
            // Import Html5Qrcode dynamically
            const Html5QrcodeScanner = (await import('https://unpkg.com/html5-qrcode')).Html5QrcodeScanner;
            
            // Create scanner instance
            this.scanner = new Html5QrcodeScanner(
                this.containerId,
                {
                    ...SCANNER_CONFIG,
                    ...this._getScannerConfig()
                },
                /* verbose= */ false
            );

            // Initialize scanner
            await this.scanner.render(this._handleScanSuccess.bind(this), this._handleScanError.bind(this));
            
            // Update state
            this.state = SCANNER_STATE.READY;
            eventBus.publish(EVENTS.SCANNER_READY);
        } catch (error) {
            console.error('Scanner initialization failed:', error);
            this.state = SCANNER_STATE.ERROR;
            eventBus.publish(EVENTS.SCANNER_ERROR, error);
            
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في تهيئة الماسح الضوئي. يرجى التحقق من إذن الكاميرا والمحاولة مرة أخرى.'
            });
        }
    }

    _getScannerConfig() {
        return {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdgePercentage = 0.7;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            }
        };
    }

    async _handleScanSuccess(decodedText, decodedResult) {
        try {
            // Update state
            this.state = SCANNER_STATE.SCANNING;
            
            // Publish scan event
            eventBus.publish(EVENTS.SCANNER_DETECTED, {
                text: decodedText,
                result: decodedResult
            });

            // Stop scanning
            if (this.scanner) {
                await this.scanner.pause();
            }

            // Show preview if available
            this._showPreview(decodedText);

            // If there's an active callback, call it
            if (typeof this._activeScanCallback === 'function') {
                this._activeScanCallback(decodedText, decodedResult);
            }

            // Try to fetch document details
            const response = await api.get(`/api/documents/barcode/${decodedText}`);
            if (response.ok && response.data) {
                window.location.href = `/document/view/${response.data.id}`;
            } else {
                toast.show({
                    type: 'warning',
                    title: 'لم يتم العثور على المستند',
                    message: 'لم يتم العثور على مستند مرتبط بهذا الرمز'
                });
                
                // Resume scanning after a delay
                setTimeout(() => this.resume(), 2000);
            }
        } catch (error) {
            console.error('Scan handling failed:', error);
            this._handleScanError(error);
        }
    }

    _handleScanError(error) {
        console.error('Scanner error:', error);
        this.state = SCANNER_STATE.ERROR;
        
        // Publish error event
        eventBus.publish(EVENTS.SCANNER_ERROR, error);
        
        // Show error message
        toast.show({
            type: 'error',
            title: 'خطأ في المسح',
            message: 'حدث خطأ أثناء المسح. يرجى المحاولة مرة أخرى.'
        });
    }

    _showPreview(decodedText) {
        if (this.previewContainer) {
            this.previewContainer.innerHTML = `
                <div class="alert alert-info">
                    <h6 class="alert-heading mb-2">تم المسح بنجاح</h6>
                    <p class="mb-0">الرمز: ${decodedText}</p>
                </div>
            `;
        }
    }

    /**
     * Start or resume scanning
     */
    async resume() {
        if (this.scanner && this.state !== SCANNER_STATE.SCANNING) {
            try {
                await this.scanner.resume();
                this.state = SCANNER_STATE.READY;
                
                // Clear preview
                if (this.previewContainer) {
                    this.previewContainer.innerHTML = '';
                }
            } catch (error) {
                console.error('Failed to resume scanner:', error);
                this._handleScanError(error);
            }
        }
    }

    /**
     * Stop scanning
     */
    async stop() {
        if (this.scanner) {
            try {
                await this.scanner.stop();
                this.state = SCANNER_STATE.READY;
            } catch (error) {
                console.error('Failed to stop scanner:', error);
            }
        }
    }

    /**
     * Clean up scanner resources
     */
    async destroy() {
        if (this.scanner) {
            try {
                await this.scanner.clear();
                this.scanner = null;
                this.state = SCANNER_STATE.INITIALIZING;
            } catch (error) {
                console.error('Failed to destroy scanner:', error);
            }
        }
    }

    /**
     * Set callback for successful scans
     * @param {Function} callback 
     */
    onScan(callback) {
        this._activeScanCallback = callback;
    }
}

// Export scanner events
export { SCANNER_STATE, EVENTS };
