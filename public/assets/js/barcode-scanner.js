class BarcodeScanner {
    constructor(options = {}) {
        this.videoElement = options.videoElement;
        this.onScanSuccess = options.onScanSuccess;
        this.onScanError = options.onScanError;
        this.authSystem = options.authSystem;
        
        // Scanner state
        this.codeReader = null;
        this.currentStream = null;
        this.isScanning = false;
        this.supportedFormats = [
            ZXing.BarcodeFormat.QR_CODE,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.CODE_93,
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.DATA_MATRIX,
            ZXing.BarcodeFormat.PDF_417,
            ZXing.BarcodeFormat.AZTEC,
            ZXing.BarcodeFormat.CODABAR,
            ZXing.BarcodeFormat.ITF,
            ZXing.BarcodeFormat.MAXICODE
        ];
        this.scanCount = 0;
        this.successfulScans = 0;
        this.init();
    }

    async init() {
        try {
            // Initialize ZXing code reader
            this.codeReader = new ZXing.BrowserMultiFormatReader();
            
            // Set up hints for better recognition (check if setHints exists)
            if (this.codeReader.setHints) {
                const hints = new Map();
                hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, this.supportedFormats);
                hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
                hints.set(ZXing.DecodeHintType.CHARACTER_SET, 'UTF-8');
                
                this.codeReader.setHints(hints);
            } else {
                console.log('⚠️ setHints غير متوفرة في هذا الإصدار من ZXing');
            }
            
            console.log('Barcode Scanner initialized successfully');
            this.updateStatus('جاهز للمسح', 'info');
        } catch (error) {
            console.error('فشل في تهيئة ماسح الباركود:', error);
            this.updateStatus('خطأ في تهيئة الماسح الضوئي', 'error');
        }
    }

    async startScanning() {
        if (this.isScanning) {
            console.log('الماسح الضوئي يعمل بالفعل');
            return;
        }

        try {
            // Check if we have camera permissions
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('الكاميرا غير مدعومة في هذا المتصفح');
            }

            // Get video devices
            const videoDevices = await this.getVideoDevices();
            if (videoDevices.length === 0) {
                throw new Error('لم يتم العثور على كاميرا');
            }

            this.updateStatus('بدء المسح...', 'info');
            this.isScanning = true;
            document.getElementById('startScanBtn').disabled = true;
            document.getElementById('stopScanBtn').disabled = false;

            // Start scanning with the first available camera
            await this.startCameraScanning(videoDevices[0].deviceId);

        } catch (error) {
            console.error('فشل في بدء المسح:', error);
            this.updateStatus(`خطأ: ${error.message}`, 'error');
            this.stopScanning();
        }
    }

    async getVideoDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('فشل في الحصول على أجهزة الفيديو:', error);
            return [];
        }
    }

    async startCameraScanning(deviceId = null) {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera if available
                }
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            // Start the video stream
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoElement = document.getElementById('videoElement');
            videoElement.srcObject = this.currentStream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                videoElement.onloadedmetadata = resolve;
            });

            // Start barcode detection
            this.codeReader.decodeFromVideoDevice(
                deviceId,
                'videoElement',
                (result, error) => {
                    if (result) {
                        this.onBarcodeDetected(result);
                    }
                    if (error && error instanceof ZXing.NotFoundException) {
                        // This is normal - no barcode found in this frame
                        // Don't log this as an error
                    } else if (error) {
                        console.warn('خطأ في قراءة الباركود:', error);
                    }
                }
            );

            this.updateStatus('جاري البحث عن باركود...', 'info');

        } catch (error) {
            console.error('فشل في بدء الكاميرا:', error);
            throw new Error(`فشل في تشغيل الكاميرا: ${error.message}`);
        }
    }

    onBarcodeDetected(result) {
        const barcodeText = result.getText();
        const format = result.getBarcodeFormat();
        
        this.scanCount++;
        this.successfulScans++;
        
        console.log('تم اكتشاف باركود:', barcodeText, 'نوع:', format);
        
        // Update UI
        document.getElementById('barcodeResult').textContent = barcodeText;
        document.getElementById('barcodeFormat').textContent = this.getFormatName(format);
        
        // Show success message with stats
        this.updateStatus(`تم العثور على الباركود: ${barcodeText} (المسح رقم ${this.successfulScans})`, 'success');
        
        // Play success sound (if available)
        this.playSuccessSound();
        
        // Search for document
        this.searchDocument(barcodeText);
        
        // Auto-stop after successful scan (optional)
        setTimeout(() => {
            this.stopScanning();
        }, 3000);
    }

    getFormatName(format) {
        const formatNames = {
            [ZXing.BarcodeFormat.QR_CODE]: 'QR Code',
            [ZXing.BarcodeFormat.CODE_128]: 'Code 128',
            [ZXing.BarcodeFormat.CODE_39]: 'Code 39',
            [ZXing.BarcodeFormat.CODE_93]: 'Code 93',
            [ZXing.BarcodeFormat.EAN_13]: 'EAN-13',
            [ZXing.BarcodeFormat.EAN_8]: 'EAN-8',
            [ZXing.BarcodeFormat.UPC_A]: 'UPC-A',
            [ZXing.BarcodeFormat.UPC_E]: 'UPC-E',
            [ZXing.BarcodeFormat.DATA_MATRIX]: 'Data Matrix',
            [ZXing.BarcodeFormat.PDF_417]: 'PDF417',
            [ZXing.BarcodeFormat.AZTEC]: 'Aztec',
            [ZXing.BarcodeFormat.CODABAR]: 'Codabar',
            [ZXing.BarcodeFormat.ITF]: 'ITF',
            [ZXing.BarcodeFormat.MAXICODE]: 'MaxiCode'
        };
        return formatNames[format] || `Format ${format}`;
    }

    async searchDocument(barcodeValue) {
        try {
            this.updateStatus('البحث عن الوثيقة...', 'info');
            
            // Search in multiple collections and fields
            const searchQueries = [
                // Search in 'files' collection by qrCode
                db.collection('files').where('qrCode', '==', barcodeValue).limit(1),
                // Search in 'files' collection by id
                db.collection('files').where('id', '==', barcodeValue).limit(1),
                // Search in 'documents' collection by barcode
                db.collection('documents').where('barcode', '==', barcodeValue).limit(1),
                // Search in 'documents' collection by qrCode
                db.collection('documents').where('qrCode', '==', barcodeValue).limit(1)
            ];

            let foundDocument = null;
            let foundCollection = null;

            // Execute searches in parallel
            const searchPromises = searchQueries.map(async (query, index) => {
                try {
                    const snapshot = await query.get();
                    if (!snapshot.empty) {
                        const collections = ['files', 'files', 'documents', 'documents'];
                        return {
                            doc: snapshot.docs[0],
                            collection: collections[index],
                            index: index
                        };
                    }
                    return null;
                } catch (error) {
                    console.warn(`خطأ في البحث ${index}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(searchPromises);
            const validResults = results.filter(result => result !== null);

            if (validResults.length > 0) {
                // Use the first found result
                const result = validResults[0];
                foundDocument = result.doc;
                foundCollection = result.collection;
                
                const fileData = foundDocument.data();
                
                // Display document information
                this.displayDocumentInfo(fileData, foundDocument.id, foundCollection);
                this.updateStatus('تم العثور على الوثيقة بنجاح!', 'success');
            } else {
                // If no exact match, try partial search
                await this.performPartialSearch(barcodeValue);
            }
        } catch (error) {
            console.error('فشل في البحث عن الوثيقة:', error);
            this.updateStatus('خطأ في البحث عن الوثيقة', 'error');
            document.getElementById('documentInfo').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    حدث خطأ أثناء البحث عن الوثيقة: ${error.message}
                </div>
            `;
        }
    }

    async performPartialSearch(barcodeValue) {
        try {
            this.updateStatus('البحث الجزئي...', 'info');
            
            // Try to search by filename or partial match
            const partialQueries = [
                db.collection('files').where('fileName', '>=', barcodeValue).where('fileName', '<=', barcodeValue + '\uf8ff').limit(5),
                db.collection('documents').where('title', '>=', barcodeValue).where('title', '<=', barcodeValue + '\uf8ff').limit(5)
            ];

            const partialResults = await Promise.all(partialQueries.map(query => query.get()));
            let allResults = [];
            
            partialResults.forEach((snapshot, index) => {
                snapshot.forEach(doc => {
                    allResults.push({
                        doc: doc,
                        collection: index === 0 ? 'files' : 'documents'
                    });
                });
            });

            if (allResults.length > 0) {
                this.displayPartialResults(allResults, barcodeValue);
                this.updateStatus(`تم العثور على ${allResults.length} نتيجة محتملة`, 'warning');
            } else {
                this.updateStatus('لم يتم العثور على وثيقة بهذا الرمز', 'warning');
                document.getElementById('documentInfo').innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        لم يتم العثور على وثيقة تحتوي على الرمز: <strong>${barcodeValue}</strong>
                        <br><br>
                        <div class="mt-2">
                            <strong>اقتراحات:</strong>
                            <ul class="mt-2">
                                <li>تأكد من أن الرمز صحيح وواضح</li>
                                <li>جرب مسح الرمز مرة أخرى</li>
                                <li>تأكد من أن الوثيقة تم رفعها للنظام</li>
                            </ul>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('فشل في البحث الجزئي:', error);
            this.updateStatus('خطأ في البحث الجزئي', 'error');
        }
    }

    displayPartialResults(results, searchTerm) {
        const resultsHtml = results.map(result => {
            const data = result.doc.data();
            const name = data.fileName || data.title || 'بدون اسم';
            const collection = result.collection;
            
            return `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="card-title mb-1">${name}</h6>
                                <small class="text-muted">
                                    <i class="fas fa-database me-1"></i> ${collection}
                                    ${data.department ? `• <i class="fas fa-building me-1"></i> ${data.department}` : ''}
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                <button class="btn btn-sm btn-primary" onclick="barcodeScanner.displayDocumentInfo(${JSON.stringify(data).replace(/"/g, '&quot;')}, '${result.doc.id}', '${collection}')">
                                    <i class="fas fa-eye me-1"></i> عرض
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('documentInfo').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-search"></i>
                نتائج البحث الجزئي لـ: <strong>${searchTerm}</strong>
            </div>
            ${resultsHtml}
        `;
    }

    displayDocumentInfo(fileData, docId, collection = 'files') {
    const createdAt = fileData.createdAt ? new Date(fileData.createdAt.seconds * 1000) : new Date();
    const updatedAt = fileData.updatedAt ? new Date(fileData.updatedAt.seconds * 1000) : createdAt;
    const F = window.FormatUtils || {};
    const fmtDT = d => (F.formatArabicDateTime ? F.formatArabicDateTime(d) : (d.toLocaleDateString('ar-SA')+ ' ' + d.toLocaleTimeString('ar-SA')));
    const esc = s => { if(s===undefined||s===null) return ''; if(F.escapeHtml) return F.escapeHtml(String(s)); return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); };
    const documentHtml = `
            <div class="card document-info-card">
                <div class="card-header bg-success text-white">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-file-alt me-2"></i>
                        معلومات الوثيقة
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-primary">
                                    <i class="fas fa-file-signature me-1"></i> اسم الملف:
                                </label>
                                <p class="form-control-plaintext">${esc(fileData.fileName || 'غير محدد')}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-primary">
                                    <i class="fas fa-tag me-1"></i> النوع:
                                </label>
                                <p class="form-control-plaintext">${esc(fileData.type || 'غير محدد')}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-primary">
                                    <i class="fas fa-weight-hanging me-1"></i> الحجم:
                                </label>
                                <p class="form-control-plaintext">${esc(this.formatFileSize(fileData.size || 0))}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-primary">
                                    <i class="fas fa-building me-1"></i> القسم:
                                </label>
                                <p class="form-control-plaintext">${esc(fileData.department || 'غير محدد')}</p>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-success">
                                    <i class="fas fa-calendar-plus me-1"></i> تاريخ الإنشاء:
                                </label>
                                <p class="form-control-plaintext">${fmtDT(createdAt)}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-warning">
                                    <i class="fas fa-calendar-edit me-1"></i> آخر تحديث:
                                </label>
                                <p class="form-control-plaintext">${fmtDT(updatedAt)}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-info">
                                    <i class="fas fa-user me-1"></i> المستخدم:
                                </label>
                                <p class="form-control-plaintext">${esc(fileData.uploadedBy || 'غير محدد')}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-secondary">
                                    <i class="fas fa-qrcode me-1"></i> رمز QR:
                                </label>
                                <p class="form-control-plaintext font-monospace">${esc(fileData.qrCode || 'غير محدد')}</p>
                            </div>
                        </div>
                    </div>
                    ${fileData.description ? `
                        <div class="mb-4">
                            <label class="form-label fw-bold text-dark">
                                <i class="fas fa-comment-alt me-1"></i> الوصف:
                            </label>
                            <div class="p-3 bg-light rounded">${esc(fileData.description)}</div>
                        </div>
                    ` : ''}
                    <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                        <button class="btn btn-primary btn-lg me-md-2" onclick="window.open('${esc(fileData.downloadURL)}', '_blank')">
                            <i class="fas fa-download me-2"></i> تحميل الملف
                        </button>
                        <button class="btn btn-secondary btn-lg" onclick="barcodeScanner.copyToClipboard('${esc(fileData.downloadURL)}')">
                            <i class="fas fa-copy me-2"></i> نسخ الرابط
                        </button>
                        <button class="btn btn-info btn-lg" onclick="window.open('file-tracking.html?id=${esc(docId)}', '_blank')">
                            <i class="fas fa-search me-2"></i> تتبع الملف
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('documentInfo').innerHTML = documentHtml;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.updateStatus('تم نسخ الرابط بنجاح', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.updateStatus('تم نسخ الرابط', 'success');
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    stopScanning() {
        this.isScanning = false;
        
        // Stop the barcode reader
        if (this.codeReader) {
            this.codeReader.reset();
        }
        
        // Stop the video stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        // Reset video element
        const videoElement = document.getElementById('videoElement');
        if (videoElement) {
            videoElement.srcObject = null;
        }
        
        // Update UI
        document.getElementById('startScanBtn').disabled = false;
        document.getElementById('stopScanBtn').disabled = true;
        
        this.updateStatus('تم إيقاف المسح', 'info');
        console.log('تم إيقاف المسح الضوئي');
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('scanStatus');
        if (statusElement) {
            statusElement.className = `alert alert-${this.getBootstrapClass(type)}`;
            statusElement.innerHTML = `<i class="fas ${this.getStatusIcon(type)}"></i> ${message}`;
        }
    }

    getBootstrapClass(type) {
        const classes = {
            'info': 'info',
            'success': 'success',
            'warning': 'warning',
            'error': 'danger'
        };
        return classes[type] || 'info';
    }

    getStatusIcon(type) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-exclamation-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    playSuccessSound() {
        try {
            // Create a simple success beep
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Ignore audio errors
            console.log('تعذر تشغيل الصوت');
        }
    }

    async testScanner() {
        console.log('اختبار الماسح الضوئي...');
        
        try {
            const testResults = {
                browser: this.getBrowserInfo(),
                zxing: typeof ZXing !== 'undefined',
                firebase: typeof db !== 'undefined',
                camera: false,
                devices: []
            };

            // Test camera access
            try {
                const devices = await this.getVideoDevices();
                testResults.devices = devices;
                testResults.camera = devices.length > 0;
            } catch (error) {
                console.error('فشل في اختبار الكاميرا:', error);
            }

            // Display test results
            const resultHtml = `
                <div class="alert alert-info">
                    <h5><i class="fas fa-vial me-2"></i>نتائج اختبار الماسح الضوئي</h5>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li class="mb-2">
                                    <i class="fas ${testResults.browser.supported ? 'fa-check text-success' : 'fa-times text-danger'} me-2"></i>
                                    <strong>المتصفح:</strong> ${testResults.browser.name}
                                </li>
                                <li class="mb-2">
                                    <i class="fas ${testResults.camera ? 'fa-check text-success' : 'fa-times text-danger'} me-2"></i>
                                    <strong>الكاميرا:</strong> ${testResults.camera ? 'متاحة' : 'غير متاحة'}
                                </li>
                                <li class="mb-2">
                                    <i class="fas ${testResults.zxing ? 'fa-check text-success' : 'fa-times text-danger'} me-2"></i>
                                    <strong>مكتبة ZXing:</strong> ${testResults.zxing ? 'محملة' : 'غير محملة'}
                                </li>
                                <li class="mb-2">
                                    <i class="fas ${testResults.firebase ? 'fa-check text-success' : 'fa-times text-danger'} me-2"></i>
                                    <strong>Firebase:</strong> ${testResults.firebase ? 'متصل' : 'غير متصل'}
                                </li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <strong>الكاميرات المكتشفة:</strong>
                            <ul class="list-unstyled mt-2">
                                ${testResults.devices.map((device, index) => 
                                    `<li><small><i class="fas fa-camera me-1"></i> ${device.label || `كاميرا ${index + 1}`}</small></li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('documentInfo').innerHTML = resultHtml;
            
            const overallStatus = testResults.browser.supported && testResults.camera && testResults.zxing && testResults.firebase;
            this.updateStatus(
                overallStatus ? 'اكتمل الاختبار - جميع المكونات تعمل بشكل صحيح' : 'يوجد مشاكل في بعض المكونات',
                overallStatus ? 'success' : 'warning'
            );
            
        } catch (error) {
            console.error('فشل الاختبار:', error);
            this.updateStatus(`فشل في الاختبار: ${error.message}`, 'error');
        }
    }

    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        let isSupported = false;

        if (userAgent.includes('Chrome')) {
            browserName = 'Chrome';
            isSupported = true;
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox';
            isSupported = true;
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browserName = 'Safari';
            isSupported = true;
        } else if (userAgent.includes('Edge')) {
            browserName = 'Edge';
            isSupported = true;
        }

        return { name: browserName, supported: isSupported };
    }
}

// Initialize the scanner when DOM is loaded
let barcodeScanner;

document.addEventListener('DOMContentLoaded', function() {
    // Wait for ZXing library to load
    if (typeof ZXing !== 'undefined') {
        initializeScanner();
    } else {
        // Wait for library to load
        window.addEventListener('load', initializeScanner);
    }
});

function initializeScanner() {
    try {
        barcodeScanner = new BarcodeScanner();
        
        // Set up event listeners
        document.getElementById('startScanBtn').addEventListener('click', () => {
            barcodeScanner.startScanning();
        });
        
        document.getElementById('stopScanBtn').addEventListener('click', () => {
            barcodeScanner.stopScanning();
        });
        
        // Test button for development
        const testBtn = document.getElementById('testScannerBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                barcodeScanner.testScanner();
            });
        }
        
        console.log('تم تهيئة ماسح الباركود بنجاح');
        
    } catch (error) {
        console.error('فشل في تهيئة ماسح الباركود:', error);
    }
}

// Clean up when page is unloaded
window.addEventListener('beforeunload', () => {
    if (barcodeScanner) {
        barcodeScanner.stopScanning();
    }
});
