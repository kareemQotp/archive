// Page Access Control Middleware
// يتم تضمينه في جميع الصفحات للتحقق من الصلاحيات

class PageAccessControl {
    constructor() {
        this.currentPage = null;
        this.userRole = null;
        this.isAuthenticated = false;
        this.permissionsLoaded = false;
        this.init();
    }

    init() {
        // الحصول على اسم الصفحة الحالية
        this.currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        
        // إعداد المراقب لحالة المصادقة
        this.setupAuthStateListener();
        
        // إعداد مراقب تحميل الصفحة
        this.setupPageLoadListener();
    }

    setupAuthStateListener() {
        // التحقق من Firebase Auth
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                this.isAuthenticated = !!user;
                if (user) {
                    this.loadUserRole(user.uid);
                } else {
                    this.handleUnauthenticatedUser();
                }
            });
        } else {
            // التحقق من localStorage كبديل
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    this.isAuthenticated = true;
                    this.userRole = user.role;
                    this.checkPageAccess();
                } catch (error) {
                    console.error('خطأ في تحليل بيانات المستخدم:', error);
                    this.handleUnauthenticatedUser();
                }
            } else {
                this.handleUnauthenticatedUser();
            }
        }
    }

    setupPageLoadListener() {
        document.addEventListener('DOMContentLoaded', () => {
            this.filterPageElements();
        });
    }

    async loadUserRole(userId) {
        try {
            if (firebase && firebase.firestore) {
                const db = firebase.firestore();
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    this.userRole = userData.role;
                    
                    // حفظ دور المستخدم في localStorage للوصول السريع
                    localStorage.setItem('userRole', this.userRole);
                    
                    this.checkPageAccess();
                } else {
                    console.warn('لم يتم العثور على بيانات المستخدم');
                    this.handleUnauthenticatedUser();
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل دور المستخدم:', error);
            // محاولة الحصول على الدور من localStorage
            const savedRole = localStorage.getItem('userRole');
            if (savedRole) {
                this.userRole = savedRole;
                this.checkPageAccess();
            } else {
                this.handleUnauthenticatedUser();
            }
        }
    }

    async checkPageAccess() {
        // انتظار تحميل صلاحيات الصفحات
        if (window.pagePermissionsManager) {
            await window.pagePermissionsManager.waitForPermissions();
        }

        const hasAccess = this.hasPagePermission();
        
        if (!hasAccess) {
            this.handleUnauthorizedAccess();
        } else {
            this.onPageAccessGranted();
        }
    }

    hasPagePermission() {
        // الصفحات العامة التي لا تحتاج مصادقة
        const publicPages = ['index', 'login', 'register', 'forgot-password', 'reset-password'];
        
        if (publicPages.includes(this.currentPage)) {
            return true;
        }

        // إذا لم يكن مسجل الدخول
        if (!this.isAuthenticated) {
            return false;
        }

        // إذا لم يكن له دور محدد
        if (!this.userRole) {
            return false;
        }

        // التحقق من صلاحيات الصفحة باستخدام مدير الصلاحيات
        if (window.pagePermissionsManager && window.pagePermissionsManager.isPermissionsLoaded()) {
            return window.pagePermissionsManager.hasPageAccess(this.currentPage, this.userRole);
        }

        // صلاحيات افتراضية إذا لم يتم تحميل مدير الصلاحيات
        return this.getDefaultPagePermission();
    }

    getDefaultPagePermission() {
        const defaultPermissions = {
            // صفحات المدراء فقط
            'admin-management': ['admin'],
            'user-management': ['admin'],
            'page-permissions': ['admin'],
            'create-admin': ['admin'],
            'role-manager': ['admin'],
            'system-analytics': ['admin'],
            
            // صفحات المدراء والمديرين
            'movement-reports': ['admin', 'manager'],
            'system-integration-test': ['admin', 'manager'],
            
            // صفحات المدراء والموظفين
            'upload': ['admin', 'manager', 'employee'],
            'file-management': ['admin', 'manager', 'employee'],
            'qr-generator': ['admin', 'manager', 'employee'],
            
            // صفحات الجميع (المسجلين)
            'dashboard': ['admin', 'manager', 'employee', 'viewer'],
            'search': ['admin', 'manager', 'employee', 'viewer'],
            'file-tracking': ['admin', 'manager', 'employee', 'viewer'],
            'scanner': ['admin', 'manager', 'employee', 'viewer'],
            'profile': ['admin', 'manager', 'employee', 'viewer']
        };

        const allowedRoles = defaultPermissions[this.currentPage];
        return allowedRoles ? allowedRoles.includes(this.userRole) : false;
    }

    handleUnauthenticatedUser() {
        const publicPages = ['index', 'login', 'register', 'forgot-password', 'reset-password'];
        
        if (!publicPages.includes(this.currentPage)) {
            // إعادة توجيه لصفحة تسجيل الدخول
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
    }

    handleUnauthorizedAccess() {
        console.warn(`ليس لديك صلاحية للوصول للصفحة: ${this.currentPage}`);
        
        // إعادة توجيه للصفحة المناسبة حسب الدور
        const redirectPage = this.getRedirectPage();
        
        if (redirectPage !== this.currentPage + '.html') {
            // إظهار رسالة تحذير
            this.showAccessDeniedMessage();
            
            // إعادة التوجيه بعد 3 ثوان
            setTimeout(() => {
                window.location.href = redirectPage;
            }, 3000);
        }
    }

    getRedirectPage() {
        // تحديد الصفحة المناسبة للإعادة التوجيه حسب الدور
        const rolePages = {
            admin: 'dashboard.html',
            manager: 'dashboard.html',
            employee: 'dashboard.html',
            viewer: 'search.html'
        };

        return rolePages[this.userRole] || 'index.html';
    }

    showAccessDeniedMessage() {
        // إنشاء رسالة تحذير
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
        messageDiv.style.zIndex = '9999';
        messageDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                    <strong>ليس لديك صلاحية للوصول لهذه الصفحة</strong>
                    <br><small>سيتم إعادة توجيهك للصفحة المناسبة...</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // إزالة الرسالة بعد 3 ثوان
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    onPageAccessGranted() {
        // تنفيذ إجراءات عند منح الوصول للصفحة
        this.filterPageElements();
        this.updatePageUI();
        
        // إضافة معلومات الصفحة إلى السجل
        this.logPageAccess();
    }

    filterPageElements() {
        // إخفاء العناصر التي لا يملك المستخدم صلاحية لها
        if (!this.userRole) return;

        // العناصر المشروطة بالصلاحيات
        document.querySelectorAll('[data-role-permission]').forEach(element => {
            const requiredRoles = element.getAttribute('data-role-permission').split(',');
            if (!requiredRoles.includes(this.userRole)) {
                element.style.display = 'none';
            }
        });

        // العناصر المشروطة بصلاحيات الصفحات
        document.querySelectorAll('[data-page-permission]').forEach(element => {
            const requiredPage = element.getAttribute('data-page-permission');
            if (window.pagePermissionsManager) {
                if (!window.pagePermissionsManager.hasPageAccess(requiredPage, this.userRole)) {
                    element.style.display = 'none';
                }
            }
        });

        // أزرار الإجراءات المشروطة
        document.querySelectorAll('[data-action-permission]').forEach(element => {
            const requiredAction = element.getAttribute('data-action-permission');
            if (!this.hasActionPermission(requiredAction)) {
                element.style.display = 'none';
            }
        });
    }

    hasActionPermission(action) {
        // تحديد الصلاحيات للإجراءات المختلفة
        const actionPermissions = {
            'create': ['admin', 'manager', 'employee'],
            'edit': ['admin', 'manager', 'employee'],
            'delete': ['admin', 'manager'],
            'manage_users': ['admin'],
            'view_reports': ['admin', 'manager'],
            'export_data': ['admin', 'manager']
        };

        const allowedRoles = actionPermissions[action];
        return allowedRoles ? allowedRoles.includes(this.userRole) : false;
    }

    updatePageUI() {
        // تحديث واجهة الصفحة حسب دور المستخدم
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = this.getRoleDisplayName();
        }

        // إضافة كلاس CSS للدور
        document.body.classList.add(`role-${this.userRole}`);
    }

    getRoleDisplayName() {
        const roleNames = {
            admin: 'مدير النظام',
            manager: 'مدير',
            employee: 'موظف',
            viewer: 'مستعرض'
        };
        return roleNames[this.userRole] || 'مستخدم';
    }

    logPageAccess() {
        // تسجيل الوصول للصفحة (اختياري)
        if (window.console && window.console.info) {
            console.info(`تم الوصول للصفحة: ${this.currentPage} بدور: ${this.userRole}`);
        }

        // إرسال إحصائيات للخدمة (اختياري)
        if (window.analytics) {
            window.analytics.track('page_access', {
                page: this.currentPage,
                role: this.userRole,
                timestamp: new Date().toISOString()
            });
        }
    }

    // دوال مساعدة للاستخدام في الصفحات
    getCurrentUserRole() {
        return this.userRole;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    canAccessPage(pageId) {
        if (window.pagePermissionsManager) {
            return window.pagePermissionsManager.hasPageAccess(pageId, this.userRole);
        }
        return false;
    }

    // إعادة تحميل الصلاحيات
    async reloadPermissions() {
        if (window.pagePermissionsManager) {
            await window.pagePermissionsManager.loadPermissions();
            this.checkPageAccess();
        }
    }
}

// إنشاء مثيل عام للتحكم في الوصول
const pageAccessControl = new PageAccessControl();

// تصدير للاستخدام العام
window.PageAccessControl = PageAccessControl;
window.pageAccessControl = pageAccessControl;

// دوال مساعدة سريعة
window.getCurrentUserRole = function() {
    return pageAccessControl.getCurrentUserRole();
};

window.canAccessPage = function(pageId) {
    return pageAccessControl.canAccessPage(pageId);
};

window.isUserAuthenticated = function() {
    return pageAccessControl.isUserAuthenticated();
};

// تصدير للاستخدام في الوحدات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageAccessControl;
}
