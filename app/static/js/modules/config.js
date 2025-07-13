// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
    SESSION_EXPIRED: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    UNAUTHORIZED: 'غير مصرح لك بهذا الإجراء.',
    VALIDATION_ERROR: 'بيانات غير صالحة. يرجى التحقق من المدخلات.',
    FILE_TYPE_ERROR: 'نوع الملف غير مدعوم.',
    FILE_SIZE_ERROR: 'حجم الملف كبير جداً.',
    PERMISSION_ERROR: 'لا تملك الصلاحيات الكافية.'
};

// File Types
export const FILE_TYPES = {
    PDF: 'application/pdf',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    TIFF: 'image/tiff'
};

// File Icons
const FILE_ICONS = {
    'application/pdf': 'fa-file-pdf',
    'image/jpeg': 'fa-file-image',
    'image/png': 'fa-file-image',
    'image/tiff': 'fa-file-image',
    'text/plain': 'fa-file-text',
    'application/msword': 'fa-file-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
    'application/vnd.ms-excel': 'fa-file-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
    'application/vnd.ms-powerpoint': 'fa-file-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fa-file-powerpoint'
};

// Utility Functions
export const utils = {
    /**
     * Format a date string
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    },

    /**
     * Get file icon class based on MIME type
     * @param {string} mimeType - File MIME type
     * @returns {string} Font Awesome icon class
     */
    getFileIcon(mimeType) {
        return FILE_ICONS[mimeType] || 'fa-file';
    },

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 بايت';
        
        const k = 1024;
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get query parameters from URL
     * @returns {Object} Query parameters
     */
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Create a throttled function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Check if device supports touch
     * @returns {boolean} True if touch supported
     */
    isTouchDevice() {
        return ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
    },

    /**
     * Generate a random ID
     * @returns {string} Random ID
     */
    generateId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

// App Configuration
export const config = {
    // API endpoints
    api: {
        base: '/api',
        documents: '/api/documents',
        auth: '/api/auth',
        scanner: '/api/scanner'
    },

    // Upload settings
    upload: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff'
        ],
        maxFiles: 10
    },

    // Scanner settings
    scanner: {
        qrbox: 250,
        fps: 10,
        supportedFormats: ['QR_CODE', 'CODE_128', 'EAN_13', 'EAN_8']
    },

    // UI settings
    ui: {
        toastDuration: 5000,
        animationDuration: 300,
        debounceDelay: 300,
        throttleDelay: 300
    }
};
