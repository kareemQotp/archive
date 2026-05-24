/**
 * تحسينات إضافية للقائمة الجانبية
 * Archive System v2.1
 */

class SidebarEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardShortcuts();
        this.setupNotificationSystem();
        this.setupThemeToggle();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
    }

    /**
     * إعداد اختصارات لوحة المفاتيح
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S - تبديل القائمة الجانبية
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (window.sidebarManager) {
                    window.sidebarManager.toggleSidebar();
                }
            }

            // Escape - إغلاق القائمة الجانبية
            if (e.key === 'Escape') {
                if (window.sidebarManager) {
                    window.sidebarManager.hideSidebar();
                }
            }

            // Alt+1-9 - التنقل السريع للصفحات
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                this.navigateToPageByIndex(parseInt(e.key) - 1);
            }

            // / - التركيز على البحث
            if (e.key === '/' && !e.ctrlKey && !e.altKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    const searchInput = document.getElementById('sidebarSearchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }
            }
        });
    }

    /**
     * التنقل السريع للصفحات بالرقم
     */
    navigateToPageByIndex(index) {
        const navLinks = document.querySelectorAll('.sidebar-nav-link[href]:not([href="#"])');
        if (navLinks[index]) {
            navLinks[index].click();
        }
    }

    /**
     * إعداد نظام الإشعارات المحسن
     */
    setupNotificationSystem() {
        // تحديث عدادات الإشعارات كل دقيقة
        setInterval(() => {
            this.updateNotificationCounts();
        }, 60000);

        // تحديث فوري عند تحميل الصفحة
        this.updateNotificationCounts();
    }

    /**
     * تحديث عدادات الإشعارات
     */
    async updateNotificationCounts() {
        try {
            // تحديث عدد المستخدمين المعلقين
            const pendingUsersCount = await this.getPendingUsersCount();
            localStorage.setItem('pending_users_count', pendingUsersCount.toString());

            // تحديث أخطاء الرفع
            const uploadErrors = await this.getUploadErrorsCount();
            localStorage.setItem('upload_errors', uploadErrors > 0 ? 'true' : 'false');

            // تحديث التقارير الجديدة
            const newReports = await this.getNewReportsCount();
            localStorage.setItem('new_reports', newReports > 0 ? 'true' : 'false');

            // إعادة رسم القائمة الجانبية إذا لزم الأمر
            if (window.sidebarManager) {
                const currentUser = await this.getCurrentUser();
                if (currentUser) {
                    window.sidebarManager.updateSidebarNav(true, currentUser.role);
                }
            }
        } catch (error) {
            console.warn('فشل في تحديث عدادات الإشعارات:', error);
        }
    }

    /**
     * الحصول على عدد المستخدمين المعلقين
     */
    async getPendingUsersCount() {
        try {
            if (window.firebase && window.firestore) {
                const snapshot = await window.firestore.collection('users')
                    .where('status', '==', 'pending')
                    .get();
                return snapshot.size;
            }
        } catch (error) {
            console.warn('فشل في الحصول على عدد المستخدمين المعلقين:', error);
        }
        return 0;
    }

    /**
     * الحصول على عدد أخطاء الرفع
     */
    async getUploadErrorsCount() {
        try {
            const errors = JSON.parse(localStorage.getItem('recent_upload_errors') || '[]');
            const recentErrors = errors.filter(error => {
                const errorTime = new Date(error.timestamp);
                const now = new Date();
                return now - errorTime < 24 * 60 * 60 * 1000; // آخر 24 ساعة
            });
            return recentErrors.length;
        } catch (error) {
            console.warn('فشل في الحصول على عدد أخطاء الرفع:', error);
        }
        return 0;
    }

    /**
     * الحصول على عدد التقارير الجديدة
     */
    async getNewReportsCount() {
        try {
            const lastCheck = localStorage.getItem('last_reports_check');
            const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
            
            if (window.firebase && window.firestore) {
                const snapshot = await window.firestore.collection('reports')
                    .where('created_at', '>', lastCheckTime)
                    .get();
                return snapshot.size;
            }
        } catch (error) {
            console.warn('فشل في الحصول على عدد التقارير الجديدة:', error);
        }
        return 0;
    }

    /**
     * الحصول على المستخدم الحالي
     */
    async getCurrentUser() {
        try {
            if (window.unifiedAuth && window.unifiedAuth.getCurrentUserData) {
                return await window.unifiedAuth.getCurrentUserData();
            }
        } catch (error) {
            console.warn('فشل في الحصول على بيانات المستخدم الحالي:', error);
        }
        return null;
    }

    /**
     * إعداد تبديل الثيم
     */
    setupThemeToggle() {
        // إضافة مستمع لزر تبديل الثيم
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle-btn')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // تطبيق الثيم المحفوظ
        this.applyStoredTheme();
    }

    /**
     * تبديل الثيم
     */
    toggleTheme() {
        const currentTheme = localStorage.getItem('archive_theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        localStorage.setItem('archive_theme', newTheme);
        this.applyTheme(newTheme);
        
        // إظهار إشعار
        this.showThemeChangeNotification(newTheme);
    }

    /**
     * تطبيق الثيم
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // تحديث أيقونة زر الثيم
        const themeBtn = document.querySelector('.theme-toggle-btn i');
        if (themeBtn) {
            themeBtn.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * تطبيق الثيم المحفوظ
     */
    applyStoredTheme() {
        const storedTheme = localStorage.getItem('archive_theme') || 'light';
        this.applyTheme(storedTheme);
    }

    /**
     * إظهار إشعار تغيير الثيم
     */
    showThemeChangeNotification(theme) {
        const message = theme === 'dark' ? 'تم التبديل إلى الوضع المظلم' : 'تم التبديل إلى الوضع المضيء';
        
        // إنشاء إشعار مؤقت
        const notification = document.createElement('div');
        notification.className = 'theme-change-notification';
        notification.innerHTML = `
            <i class="fas fa-${theme === 'dark' ? 'moon' : 'sun'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // إزالة الإشعار بعد 3 ثوانٍ
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * إعداد تحسينات إمكانية الوصول
     */
    setupAccessibility() {
        // إضافة تسميات ARIA
        this.addAriaLabels();
        
        // إعداد التنقل بلوحة المفاتيح
        this.setupKeyboardNavigation();
        
        // إعداد إعلانات قارئ الشاشة
        this.setupScreenReaderAnnouncements();
    }

    /**
     * إضافة تسميات ARIA
     */
    addAriaLabels() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.setAttribute('aria-label', 'القائمة الجانبية للتنقل');
            sidebar.setAttribute('role', 'navigation');
        }

        const searchInput = document.getElementById('sidebarSearchInput');
        if (searchInput) {
            searchInput.setAttribute('aria-label', 'البحث في قائمة التنقل');
            searchInput.setAttribute('role', 'searchbox');
        }

        // إضافة تسميات للروابط
        const navLinks = document.querySelectorAll('.sidebar-nav-link');
        navLinks.forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const text = link.querySelector('.nav-text')?.textContent;
                if (text) {
                    link.setAttribute('aria-label', `انتقل إلى ${text}`);
                }
            }
        });
    }

    /**
     * إعداد التنقل بلوحة المفاتيح
     */
    setupKeyboardNavigation() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.addEventListener('keydown', (e) => {
            const focusableElements = sidebar.querySelectorAll(
                'a[href], button, input, [tabindex]:not([tabindex="-1"])'
            );
            const focusedIndex = Array.from(focusableElements).indexOf(document.activeElement);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    const nextIndex = (focusedIndex + 1) % focusableElements.length;
                    focusableElements[nextIndex]?.focus();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    const prevIndex = focusedIndex === 0 ? focusableElements.length - 1 : focusedIndex - 1;
                    focusableElements[prevIndex]?.focus();
                    break;

                case 'Home':
                    e.preventDefault();
                    focusableElements[0]?.focus();
                    break;

                case 'End':
                    e.preventDefault();
                    focusableElements[focusableElements.length - 1]?.focus();
                    break;
            }
        });
    }

    /**
     * إعداد إعلانات قارئ الشاشة
     */
    setupScreenReaderAnnouncements() {
        // إنشاء منطقة الإعلانات
        const announcer = document.createElement('div');
        announcer.id = 'sidebar-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.position = 'absolute';
        announcer.style.left = '-10000px';
        announcer.style.width = '1px';
        announcer.style.height = '1px';
        announcer.style.overflow = 'hidden';
        
        document.body.appendChild(announcer);
    }

    /**
     * إعلان رسالة لقارئ الشاشة
     */
    announce(message) {
        const announcer = document.getElementById('sidebar-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    /**
     * إعداد تحسينات الأداء
     */
    setupPerformanceOptimizations() {
        // تأخير تحديث القائمة الجانبية
        this.debounceUpdateSidebar = this.debounce(() => {
            if (window.sidebarManager) {
                window.sidebarManager.handleResize();
            }
        }, 250);

        // مراقبة تغيير حجم النافذة
        window.addEventListener('resize', this.debounceUpdateSidebar);

        // تحسين أداء البحث
        this.debounceSearch = this.debounce((searchTerm) => {
            if (window.sidebarManager) {
                window.sidebarManager.filterNavigation(searchTerm);
            }
        }, 300);

        // إضافة مستمع للبحث المحسن
        const searchInput = document.getElementById('sidebarSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debounceSearch(e.target.value);
            });
        }
    }

    /**
     * دالة تأخير التنفيذ (Debounce)
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
    }

    /**
     * تسجيل النشاط
     */
    logActivity(action, details = {}) {
        if (window.activityLogger) {
            window.activityLogger.log('sidebar', action, {
                timestamp: new Date().toISOString(),
                ...details
            });
        }
    }
}

// تهيئة التحسينات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarEnhancements = new SidebarEnhancements();
});

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarEnhancements;
}