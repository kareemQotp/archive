// Handle file upload preview
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Auto-fill title if empty
                const titleInput = document.getElementById('title');
                if (titleInput && !titleInput.value) {
                    titleInput.value = file.name.split('.')[0];
                }
                
                // Show preview for images
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.createElement('img');
                        preview.src = e.target.result;
                        preview.className = 'img-fluid mt-2';
                        
                        const previewContainer = document.getElementById('preview');
                        if (previewContainer) {
                            previewContainer.innerHTML = '';
                            previewContainer.appendChild(preview);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }
    
    // Handle tag input
    const tagInput = document.getElementById('tags');
    if (tagInput) {
        tagInput.addEventListener('keydown', function(e) {
            if (e.key === ',' || e.key === 'Enter') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'badge bg-secondary me-1';
                    tagSpan.textContent = value;
                    
                    const tagContainer = document.getElementById('tagContainer');
                    if (tagContainer) {
                        tagContainer.appendChild(tagSpan);
                        this.value = '';
                    }
                }
            }
        });
    }
    
    // Handle document search
    const searchForm = document.querySelector('form[action*="search"]');
    if (searchForm) {
        const searchInput = searchForm.querySelector('input[name="q"]');
        let timeout = null;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchForm.submit();
            }, 500);
        });
    }
    
    // Handle barcode scanner
    const barcodeInput = document.getElementById('barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    fetch('/scanner/lookup/' + encodeURIComponent(value))
                        .then(response => response.json())
                        .then(data => {
                            if (data.document) {
                                window.location.href = '/document/' + data.document.id;
                            }
                        });
                }
            }
        });
    }
    
    // Flash message handling
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(alert => {
            alert.style.transition = 'opacity 0.5s ease-out';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);
    
    // Add close button functionality
    document.querySelectorAll('.alert .btn-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const alert = btn.closest('.alert');
            alert.style.transition = 'opacity 0.5s ease-out';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        });
    });
    
    // Lazy loading images
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img.lazy').forEach(img => imageObserver.observe(img));
});

// Handle document sorting and filtering
function sortDocuments(criteria) {
    const container = document.querySelector('.document-grid');
    if (!container) return;
    
    const documents = Array.from(container.children);
    documents.sort((a, b) => {
        const aValue = a.dataset[criteria];
        const bValue = b.dataset[criteria];
        return aValue.localeCompare(bValue);
    });
    
    container.innerHTML = '';
    documents.forEach(doc => container.appendChild(doc));
}

function filterDocuments(tag) {
    const documents = document.querySelectorAll('.document-card');
    documents.forEach(doc => {
        if (tag === 'all' || doc.dataset.tags.includes(tag)) {
            doc.style.display = '';
        } else {
            doc.style.display = 'none';
        }
    });
}

// Handle modal dialogs
function showModal(id) {
    const modal = new bootstrap.Modal(document.getElementById(id));
    modal.show();
}

// Handle document deletion confirmation
function confirmDelete(documentId) {
    if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
        fetch('/document/delete/' + documentId, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(response => {
            if (response.ok) {
                const element = document.querySelector(`[data-document-id="${documentId}"]`);
                if (element) {
                    element.remove();
                }
            }
        });
    }
}

// Form validation
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
        }
        form.classList.add('was-validated');
    });
});

// Confirm actions
document.querySelectorAll('[data-confirm]').forEach(element => {
    element.addEventListener('click', (e) => {
        if (!confirm(element.getAttribute('data-confirm'))) {
            e.preventDefault();
        }
    });
});

// File size formatter
function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// RTL text direction detection
function isRTL(text) {
    const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlChars.test(text);
}

// Auto-detect text direction
document.querySelectorAll('input[type="text"], textarea').forEach(element => {
    element.addEventListener('input', () => {
        element.style.direction = isRTL(element.value) ? 'rtl' : 'ltr';
    });
});

// Click to copy
document.querySelectorAll('[data-copy]').forEach(element => {
    element.addEventListener('click', async () => {
        const text = element.getAttribute('data-copy');
        try {
            await navigator.clipboard.writeText(text);
            
            // Show tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip show';
            tooltip.textContent = 'تم النسخ!';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '1070';
            
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            tooltip.style.left = rect.left + (rect.width - tooltip.offsetWidth) / 2 + 'px';
            
            // Remove tooltip after delay
            setTimeout(() => {
                tooltip.style.opacity = '0';
                setTimeout(() => tooltip.remove(), 200);
            }, 1000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
});

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle back/forward cache
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page was loaded from bfcache
        window.location.reload();
    }
});

// Print helper
function printElement(element) {
    const printContents = element.innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
        <div class="print-only">${printContents}</div>
        <style>
            @media print {
                body * {
                    visibility: hidden;
                }
                .print-only, .print-only * {
                    visibility: visible;
                }
                .print-only {
                    position: absolute;
                    left: 0;
                    top: 0;
                }
            }
        </style>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
}

// Custom file input enhancement
document.querySelectorAll('.custom-file-input').forEach(input => {
    input.addEventListener('change', (e) => {
        let fileName = '';
        if (input.files && input.files.length > 1) {
            fileName = `${input.files.length} ملفات محددة`;
        } else {
            fileName = e.target.value.split('\\').pop();
        }
        if (fileName) {
            input.nextElementSibling.textContent = fileName;
        }
    });
});

// Handle service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registered');
        }).catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    });
}

// IndexedDB setup for offline support
const dbName = 'archiveDB';
const dbVersion = 1;

let db;
const request = indexedDB.open(dbName, dbVersion);

request.onerror = (event) => {
    console.error('IndexedDB error:', event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    
    // Create object stores
    if (!db.objectStoreNames.contains('pendingUploads')) {
        db.createObjectStore('pendingUploads', { keyPath: 'id', autoIncrement: true });
    }
    
    if (!db.objectStoreNames.contains('documents')) {
        const docsStore = db.createObjectStore('documents', { keyPath: 'id' });
        docsStore.createIndex('barcode', 'barcode', { unique: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
};

// Document Upload Handler
class DocumentUploader {
    constructor(dropZone, fileInput, progressBar) {
        this.dropZone = dropZone;
        this.fileInput = fileInput;
        this.progressBar = progressBar;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.dropZone.addEventListener(eventName, () => {
                    this.dropZone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.dropZone.addEventListener(eventName, () => {
                    this.dropZone.classList.remove('dragover');
                });
            });

            this.dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleFiles(files);
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', () => {
                this.handleFiles(this.fileInput.files);
            });
        }
    }

    async handleFiles(files) {
        for (const file of files) {
            try {
                await this.uploadFile(file);
            } catch (error) {
                if (!navigator.onLine) {
                    await this.saveForLater(file);
                } else {
                    console.error('Upload error:', error);
                    this.showAlert('خطأ في رفع الملف: ' + error.message, 'danger');
                }
            }
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tags', document.getElementById('tags').value || '');

        const response = await fetch('/document/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(await response.text());

        this.showAlert('تم رفع الملف بنجاح', 'success');
        this.updateProgress(100);
        setTimeout(() => this.updateProgress(0), 1000);
    }

    async saveForLater(file) {
        const reader = new FileReader();
        reader.onload = async () => {
            const upload = {
                file: reader.result,
                fileName: file.name,
                type: file.type,
                tags: document.getElementById('tags').value || '',
                timestamp: new Date().toISOString()
            };

            const transaction = db.transaction(['pendingUploads'], 'readwrite');
            await transaction.objectStore('pendingUploads').add(upload);

            this.showAlert('الملف محفوظ للرفع لاحقاً عند توفر الاتصال', 'warning');
            
            // Register for background sync
            if ('serviceWorker' in navigator && 'sync' in window.registration) {
                await window.registration.sync.register('document-upload');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    updateProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = percent + '%';
            this.progressBar.setAttribute('aria-valuenow', percent);
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const alertsContainer = document.querySelector('.alerts-container');
        if (alertsContainer) {
            alertsContainer.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }
}

// Barcode Scanner
class BarcodeScanner {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.isScanning = false;
        this.stream = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            this.video.srcObject = this.stream;
            this.isScanning = true;
            this.scan();
        } catch (error) {
            console.error('Camera error:', error);
            throw new Error('لا يمكن الوصول إلى الكاميرا');
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isScanning = false;
    }

    async scan() {
        if (!this.isScanning) return;

        const context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        try {
            const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = await this.detectBarcode(imageData);
            
            if (code) {
                this.stop();
                await this.handleBarcode(code);
            } else {
                requestAnimationFrame(() => this.scan());
            }
        } catch (error) {
            console.error('Scanning error:', error);
            requestAnimationFrame(() => this.scan());
        }
    }

    async detectBarcode(imageData) {
        // Using a barcode detection library (e.g., zxing-js)
        // Implementation depends on the chosen library
        return null;
    }

    async handleBarcode(code) {
        try {
            const response = await fetch(`/document/barcode/${code}`);
            if (!response.ok) throw new Error(await response.text());
            
            const document = await response.json();
            window.location.href = `/document/view/${document.id}`;
        } catch (error) {
            console.error('Barcode handling error:', error);
            this.showError('لا يمكن العثور على المستند المرتبط بهذا الباركود');
        }
    }

    showError(message) {
        // Implementation of error display
    }
}

// Initialize components based on page
document.addEventListener('DOMContentLoaded', () => {
    // Document upload initialization
    const dropZone = document.querySelector('.upload-zone');
    const fileInput = document.querySelector('input[type="file"]');
    const progressBar = document.querySelector('.progress-bar');
    
    if (dropZone || fileInput) {
        new DocumentUploader(dropZone, fileInput, progressBar);
    }

    // Barcode scanner initialization
    const video = document.getElementById('scanner-video');
    const canvas = document.getElementById('scanner-canvas');
    
    if (video && canvas) {
        const scanner = new BarcodeScanner(video, canvas);
        
        document.getElementById('start-scan')?.addEventListener('click', () => {
            scanner.start().catch(error => {
                console.error('Scanner error:', error);
                alert(error.message);
            });
        });
        
        document.getElementById('stop-scan')?.addEventListener('click', () => {
            scanner.stop();
        });
    }

    // Tag input enhancement
    const tagInput = document.querySelector('.tag-input');
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (tag) {
                    addTag(tag);
                    tagInput.value = '';
                }
            }
        });
    }
});

// Tag handling
function addTag(text) {
    const tagsContainer = document.querySelector('.tags-container');
    const input = document.getElementById('tags');
    
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary me-2 mb-2';
    badge.innerHTML = `
        ${text}
        <button type="button" class="btn-close btn-close-white" onclick="removeTag(this)"></button>
    `;
    
    tagsContainer.appendChild(badge);
    
    const currentTags = input.value ? input.value.split(',') : [];
    currentTags.push(text);
    input.value = currentTags.join(',');
}

function removeTag(button) {
    const badge = button.parentElement;
    const text = badge.textContent.trim();
    const input = document.getElementById('tags');
    
    badge.remove();
    
    const currentTags = input.value.split(',');
    input.value = currentTags.filter(tag => tag.trim() !== text).join(',');
}

// Lazy loading images
document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img.lazy');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }
});