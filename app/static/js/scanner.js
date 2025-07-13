import { ScannerManager, SCANNER_STATE, EVENTS } from './modules/scanner.js';
import { eventBus } from './modules/events.js';
import { LoadingIndicator } from './modules/ui.js';

class ScannerPage {
    constructor() {
        // Initialize scanner UI elements
        this.scanButton = document.getElementById('toggle-scan');
        this.scannerContainer = document.getElementById('scanner-container');
        this.previewContainer = document.getElementById('scanner-preview');
        
        // Create loading indicator
        this.loading = new LoadingIndicator(this.scannerContainer, {
            text: 'جاري تهيئة الماسح الضوئي...'
        });

        // Initialize scanner
        this.initializeScanner();
    }

    async initializeScanner() {
        try {
            this.loading.show();
            
            // Create scanner manager
            this.scanner = new ScannerManager({
                containerId: 'scanner-container'
            });

            // Set up event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize scanner:', error);
        } finally {
            this.loading.hide();
        }
    }

    setupEventListeners() {
        // Handle scanner ready event
        eventBus.subscribe(EVENTS.SCANNER_READY, () => {
            this.updateScanButton();
            this.loading.hide();
        });

        // Handle scanner error event
        eventBus.subscribe(EVENTS.SCANNER_ERROR, () => {
            this.updateScanButton();
            this.loading.hide();
        });

        // Handle scan button click
        if (this.scanButton) {
            this.scanButton.addEventListener('click', () => this.toggleScanner());
        }

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.scanner) {
                this.scanner.stop();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (this.scanner) {
                this.scanner.destroy();
            }
        });
    }

    toggleScanner() {
        if (this.scanner.state === SCANNER_STATE.SCANNING) {
            this.scanner.stop();
        } else {
            this.scanner.resume();
        }
        this.updateScanButton();
    }

    updateScanButton() {
        if (!this.scanButton) return;

        const isScanning = this.scanner.state === SCANNER_STATE.SCANNING;
        this.scanButton.textContent = isScanning ? 'إيقاف المسح' : 'بدء المسح';
        this.scanButton.classList.toggle('btn-danger', isScanning);
        this.scanButton.classList.toggle('btn-primary', !isScanning);
    }
}

// Initialize scanner page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScannerPage();
});
