/**
 * إعدادات التطبيق المركزية
 * Central Application Configuration
 */

const APP_CONFIG = {
    // إعدادات Firebase
    firebase: {
        apiKey: "AIzaSyBn9zLcodNLKWlUPfqsnEGoA1z7QZw_Ezk",
        authDomain: "archive-tech.firebaseapp.com",
        projectId: "archive-tech",
        storageBucket: "archive-tech.firebasestorage.app",
        messagingSenderId: "911076711034",
        appId: "1:911076711034:web:7f190eed397becfe6779c3",
        measurementId: "G-1PQMDXZ714"
    },

    // App Check (reCAPTCHA v3) – ضع مفتاح الموقع هنا أو اتركه فارغاً للاختبار
    // للحصول على مفتاح: Google Cloud Console → reCAPTCHA v3 → Site Key
    // مؤقتاً: استخدام وضع التطوير
    appCheckSiteKey: 'debug',

    // إعدادات النظام
    system: {
        name: 'نظام الأرشيف الذكي',
        nameEn: 'Smart Archive System',
        version: '2.1.0',
        supportEmail: 'support@archive-tech.com',
        maxFileSize: 16 * 1024 * 1024, // 16MB
        allowedFileTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ],
        sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoSaveInterval: 30000, // 30 seconds
        defaultLanguage: 'ar',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm'
    },

    // إعدادات الأقسام
    departments: {
        'archive': {
            name: 'الأرشيف المركزي',
            nameEn: 'Central Archive',
            code: 'ARC',
            color: '#17a2b8',
            icon: 'fas fa-archive',
            description: 'القسم المسؤول عن حفظ وإدارة جميع الوثائق'
        },
        'legal': {
            name: 'الشؤون القانونية',
            nameEn: 'Legal Affairs',
            code: 'LEG',
            color: '#007bff',
            icon: 'fas fa-balance-scale',
            description: 'قسم إدارة الوثائق والعقود القانونية'
        },
        'governance': {
            name: 'الحوكمة والامتثال',
            nameEn: 'Governance & Compliance',
            code: 'GOV',
            color: '#28a745',
            icon: 'fas fa-shield-alt',
            description: 'قسم مراجعة العمليات والامتثال للوائح'
        },
        'collection': {
            name: 'إدارة التحصيل',
            nameEn: 'Collection Management',
            code: 'COL',
            color: '#fd7e14',
            icon: 'fas fa-hand-holding-usd',
            description: 'قسم إدارة التحصيل ومتابعة المدفوعات'
        },
        'securitization': {
            name: 'إدارة التوريق',
            nameEn: 'Securitization Management',
            code: 'SEC',
            color: '#6f42c1',
            icon: 'fas fa-chart-line',
            description: 'قسم إدارة التوريق والمحافظ المالية'
        }
    },

    // حالات حركة الملفات
    movementStatus: {
        'in_archive': {
            name: 'في الأرشيف',
            nameEn: 'In Archive',
            color: '#6c757d',
            icon: 'fas fa-archive',
            description: 'الملف متواجد في الأرشيف المركزي'
        },
        'transferred': {
            name: 'تم النقل',
            nameEn: 'Transferred',
            color: '#007bff',
            icon: 'fas fa-paper-plane',
            description: 'تم نقل الملف إلى القسم المختص'
        },
        'in_transit': {
            name: 'في الطريق',
            nameEn: 'In Transit',
            color: '#ffc107',
            icon: 'fas fa-truck',
            description: 'الملف في طريقه إلى القسم المطلوب'
        },
        'received': {
            name: 'تم الاستلام',
            nameEn: 'Received',
            color: '#28a745',
            icon: 'fas fa-check-circle',
            description: 'تم استلام الملف في القسم المطلوب'
        },
        'returned': {
            name: 'تم الإرجاع',
            nameEn: 'Returned',
            color: '#dc3545',
            icon: 'fas fa-undo',
            description: 'تم إرجاع الملف إلى الأرشيف'
        }
    },

    // أولويات الملفات
    priorities: {
        'low': {
            name: 'منخفضة',
            nameEn: 'Low',
            value: 1,
            color: '#28a745',
            icon: 'fas fa-arrow-down'
        },
        'normal': {
            name: 'عادية',
            nameEn: 'Normal',
            value: 2,
            color: '#007bff',
            icon: 'fas fa-minus'
        },
        'high': {
            name: 'عالية',
            nameEn: 'High',
            value: 3,
            color: '#ffc107',
            icon: 'fas fa-arrow-up'
        },
        'urgent': {
            name: 'عاجلة',
            nameEn: 'Urgent',
            value: 4,
            color: '#dc3545',
            icon: 'fas fa-exclamation-triangle'
        }
    },

    // إعدادات التقارير
    reports: {
        defaultDateRange: 30, // days
        maxExportRecords: 10000,
        exportFormats: ['csv', 'excel', 'pdf'],
        autoRefreshInterval: 60000 // 1 minute
    },

    // إعدادات الإشعارات
    notifications: {
        enabled: true,
        showDesktop: true,
        soundEnabled: true,
        autoHideDelay: 5000,
        maxVisible: 5
    },

    // مسارات API
    api: {
        baseUrl: '/api/v1',
        endpoints: {
            auth: '/auth',
            users: '/users',
            documents: '/documents',
            movements: '/movements',
            reports: '/reports',
            notifications: '/notifications',
            departments: '/departments'
        }
    },

    // إعدادات التخزين المؤقت
    cache: {
        userSessionKey: 'archive_user_session',
        preferencesKey: 'archive_user_preferences',
        tempDataKey: 'archive_temp_data',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// وظائف مساعدة
const AppUtils = {
    // الحصول على معلومات القسم
    getDepartmentInfo(deptCode) {
        return APP_CONFIG.departments[deptCode] || null;
    },

    // الحصول على معلومات حالة الحركة
    getMovementStatusInfo(status) {
        return APP_CONFIG.movementStatus[status] || null;
    },

    // الحصول على معلومات الأولوية
    getPriorityInfo(priority) {
        return APP_CONFIG.priorities[priority] || null;
    },

    // تنسيق التاريخ
    formatDate(date, format = null) {
    const F = window.FormatUtils || {};
    const dateObj = new Date(date);
    const fmt = format || APP_CONFIG.system.dateFormat;
    if (F.formatArabicDate) return F.formatArabicDate(dateObj);
    if (fmt === 'DD/MM/YYYY') return dateObj.toLocaleDateString('ar-SA');
    return dateObj.toLocaleDateString();
    },

    // تنسيق الوقت
    formatTime(date, format = null) {
    const F = window.FormatUtils || {};
    const dateObj = new Date(date);
    const fmt = format || APP_CONFIG.system.timeFormat;
    if (F.formatArabicTime) return F.formatArabicTime(dateObj);
    if (fmt === 'HH:mm') return dateObj.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
    return dateObj.toLocaleTimeString();
    },

    // تنسيق حجم الملف
    formatFileSize(bytes) {
        if (bytes === 0) return '0 بايت';
        
        const k = 1024;
        const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // التحقق من نوع الملف
    isValidFileType(mimeType) {
        return APP_CONFIG.system.allowedFileTypes.includes(mimeType);
    },

    // التحقق من حجم الملف
    isValidFileSize(size) {
        return size <= APP_CONFIG.system.maxFileSize;
    },

    // إنشاء ID فريد
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // حفظ في التخزين المحلي
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('خطأ في حفظ البيانات:', e);
            return false;
        }
    },

    // استرجاع من التخزين المحلي
    getFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('خطأ في استرجاع البيانات:', e);
            return defaultValue;
        }
    },

    // حذف من التخزين المحلي
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('خطأ في حذف البيانات:', e);
            return false;
        }
    }
};

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.APP_CONFIG = APP_CONFIG;
    window.AppUtils = AppUtils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, AppUtils };
}
