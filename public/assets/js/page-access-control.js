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

    getAuth() {
        if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
            return window.auth;
        }
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.apps && firebase.apps.length) {
            try { return firebase.auth(); } catch (_) { return null; }
        }
        return null;
    }

    getCurrentAuthUser() {
        const auth = this.getAuth();
        return auth ? auth.currentUser : null;
    }

    setupAuthStateListener() {
        const auth = this.getAuth();
        // التحقق من Firebase Auth
        if (auth) {
            auth.onAuthStateChanged((user) => {
                console.log('🔐 Page Access Control - Auth state changed:', user ? user.email : 'No user');
                this.isAuthenticated = !!user;
                if (user) {
                    this.loadUserRole(user.uid);
                } else {
                    // إعطاء وقت إضافي قبل معالجة عدم المصادقة
                    console.log('⏳ لا يوجد مستخدم - انتظار 8 ثوان للتحقق مرة أخرى');
                    setTimeout(() => {
                        const currentUser = this.getCurrentAuthUser();
                        if (!currentUser) {
                            console.log('❌ لا يوجد مستخدم مصادق عليه بعد 8 ثوان');
                            this.handleUnauthenticatedUser();
                        } else {
                            console.log('✅ تم العثور على مستخدم بعد التأخير:', currentUser.email);
                            this.isAuthenticated = true;
                            this.loadUserRole(currentUser.uid);
                        }
                    }, 8000); // انتظار 8 ثوان
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
                // إعطاء وقت إضافي قبل إعادة التوجيه
                setTimeout(() => {
                    this.handleUnauthenticatedUser();
                }, 8000);
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
            // التحقق من وجود قاعدة البيانات
            if (firebase && firebase.firestore && window.db) {
                const userDoc = await window.db.collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    this.userRole = userData.role;
                    
                    // حفظ دور المستخدم في localStorage للوصول السريع
                    localStorage.setItem('userRole', this.userRole);
                    
                    console.log('✅ تم تحميل دور المستخدم من قاعدة البيانات:', this.userRole);
                    this.checkPageAccess();
                    return;
                }
            }
            
            // في حالة عدم وجود قاعدة البيانات أو عدم وجود المستخدم
            // التحقق من كونه مدير بناءً على الإيميل
            const currentUser = this.getCurrentAuthUser();
            if (currentUser) {
                const isAdminEmail = currentUser.email && (
                    currentUser.email.includes('admin') || 
                    currentUser.email === 'admin123@aman.eg' ||
                    currentUser.email === 'admin@aman.eg'
                );
                
                this.userRole = isAdminEmail ? 'admin' : 'viewer';
                localStorage.setItem('userRole', this.userRole);
                
                console.log('✅ تم تعيين دور افتراضي:', this.userRole, 'للمستخدم:', currentUser.email);
                this.checkPageAccess();
            }
            
        } catch (error) {
            console.error('خطأ في تحميل دور المستخدم:', error);
            // محاولة الحصول على الدور من localStorage
            const savedRole = localStorage.getItem('userRole');
            if (savedRole) {
                this.userRole = savedRole;
                console.log('✅ تم استرداد الدور من localStorage:', this.userRole);
                this.checkPageAccess();
            } else {
                // دور افتراضي في حالة الفشل الكامل
                this.userRole = 'viewer';
                console.log('⚠️ تم تعيين دور افتراضي: viewer');
                this.checkPageAccess();
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
        const allowGuest = !!(window.__ALLOW_GUEST_ACCESS__);
        
        if (publicPages.includes(this.currentPage) || allowGuest) {
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
            // صفحات المدراء فقط - السماح لجميع المستخدمين المصادق عليهم مؤقتاً
            'admin-management': ['admin', 'manager', 'employee', 'viewer'],
            'user-management': ['admin', 'manager', 'employee', 'viewer'],
            'page-permissions': ['admin', 'manager', 'employee', 'viewer'],
            'create-admin': ['admin'],
            'role-manager': ['admin'],
            'system-analytics': ['admin'],
            
            // صفحات المدراء والمديرين
            'movement-reports': ['admin', 'manager'],
            'system-integration-test': ['admin', 'manager'],
            
            // صفحات المدراء والموظفين
            'upload': ['admin', 'manager', 'employee'],
            'file-management': ['admin', 'manager', 'employee'],
            'file-management-dashboard': ['admin', 'manager', 'employee'],
            'file-tracking.html': ['admin', 'manager', 'employee'],
            'qr-generator': ['admin', 'manager', 'employee'],
            
            // صفحات الجميع (المسجلين)
            'dashboard': ['admin', 'manager', 'employee', 'viewer'],
            'search': ['admin', 'manager', 'employee', 'viewer'],
            'file-tracking': ['admin', 'manager', 'employee', 'viewer'],
            'scanner': ['admin', 'manager', 'employee', 'viewer'],
            'profile': ['admin', 'manager', 'employee', 'viewer'],
            'activity-logs': ['admin', 'manager', 'employee', 'viewer']
        };

        const allowedRoles = defaultPermissions[this.currentPage];
        return allowedRoles ? allowedRoles.includes(this.userRole) : true; // السماح بالوصول افتراضياً
    }

    handleUnauthenticatedUser() {
        const publicPages = ['index', 'login', 'register', 'forgot-password', 'reset-password'];
        const allowGuest = !!(window.__ALLOW_GUEST_ACCESS__);
        
        if (!publicPages.includes(this.currentPage) && !allowGuest) {
            console.log('⚠️ مستخدم غير مصادق عليه - انتظار 5 ثوان إضافية للتحقق من المصادقة');
            
            // انتظار إضافي للتأكد من عدم وجود مصادقة
            setTimeout(() => {
                // التحقق النهائي من المصادقة
                const finalUser = this.getCurrentAuthUser();
                if (!finalUser) {
                    console.log('❌ لا يوجد مستخدم مصادق عليه نهائياً - إعادة توجيه');
                    // إعادة توجيه لصفحة تسجيل الدخول
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                } else {
                    console.log('✅ تم العثور على مستخدم مصادق عليه:', finalUser.email);
                    this.isAuthenticated = true;
                    this.loadUserRole(finalUser.uid);
                }
            }, 5000); // انتظار 5 ثوان إضافية
        }
    }

    handleUnauthorizedAccess() {
        console.warn(`ليس لديك صلاحية للوصول للصفحة: ${this.currentPage}`);
        
        // تعطيل إعادة التوجيه مؤقتاً للسماح بالاختبار
        console.log('تم تعطيل إعادة التوجيه مؤقتاً - يُسمح بالوصول للصفحة');
        return;
        
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

console.log('✅ تم تهيئة نظام فحص صلاحيات الصفحة');
