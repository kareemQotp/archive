/**
 * نظام التوجيه بناءً على الدور والإدارة
 * Role-Based and Department-Based Routing System
 */

class RoleBasedRouter {
    constructor() {
        this.routes = {
            // إدارة الأرشيف
            'archive': {
                defaultDashboard: 'archive-dashboard.html',
                roles: {
                    'super_admin': 'archive-dashboard.html',
                    'admin': 'archive-dashboard.html',
                    'archive_officer': 'archive-dashboard.html',
                    'department_admin': 'archive-dashboard.html',
                    'supervisor': 'archive-dashboard.html',
                    'employee': 'archive-dashboard.html',
                    'viewer': 'archive-dashboard.html'
                }
            },
            
            // الإدارة القانونية
            'legal': {
                defaultDashboard: 'legal-dashboard.html',
                roles: {
                    'super_admin': 'legal-dashboard.html',
                    'admin': 'legal-dashboard.html',
                    'department_admin': 'legal-dashboard.html',
                    'supervisor': 'legal-dashboard.html',
                    'employee': 'legal-dashboard.html',
                    'viewer': 'legal-dashboard.html'
                }
            },
            
            // إدارة الملفات
            'file-management': {
                defaultDashboard: 'file-management-dashboard.html',
                roles: {
                    'super_admin': 'file-management-dashboard.html',
                    'admin': 'file-management-dashboard.html',
                    'archive_officer': 'file-management-dashboard.html',
                    'department_admin': 'file-management-dashboard.html',
                    'supervisor': 'file-management-dashboard.html',
                    'employee': 'file-management-dashboard.html',
                    'viewer': 'file-management-dashboard.html'
                }
            },
            
            // إدارة التحصيل
            'collection': {
                defaultDashboard: 'collection-dashboard.html',
                roles: {
                    'super_admin': 'collection-dashboard.html',
                    'admin': 'collection-dashboard.html',
                    'department_admin': 'collection-dashboard.html',
                    'supervisor': 'collection-dashboard.html',
                    'employee': 'collection-dashboard.html',
                    'viewer': 'collection-dashboard.html'
                }
            },
            
            // تقنية المعلومات
            'it': {
                defaultDashboard: 'it-dashboard.html', // لوحة تقنية المعلومات الخاصة
                roles: {
                    'super_admin': 'it-dashboard.html',
                    'admin': 'it-dashboard.html',
                    'department_admin': 'it-dashboard.html',
                    'supervisor': 'it-dashboard.html',
                    'employee': 'it-dashboard.html',
                    'viewer': 'it-dashboard.html'
                }
            },

            // الحوكمة والامتثال
            'governance': {
                defaultDashboard: 'governance-dashboard.html',
                roles: {
                    'super_admin': 'governance-dashboard.html',
                    'admin': 'governance-dashboard.html',
                    'department_admin': 'governance-dashboard.html',
                    'supervisor': 'governance-dashboard.html',
                    'employee': 'governance-dashboard.html',
                    'viewer': 'governance-dashboard.html'
                }
            },

            // إدارة التوريق
            'securitization': {
                defaultDashboard: 'securitization-dashboard.html',
                roles: {
                    'super_admin': 'securitization-dashboard.html',
                    'admin': 'securitization-dashboard.html',
                    'department_admin': 'securitization-dashboard.html',
                    'supervisor': 'securitization-dashboard.html',
                    'employee': 'securitization-dashboard.html',
                    'viewer': 'securitization-dashboard.html'
                }
            }
        };

        // الداشبوردات الافتراضية حسب الدور العام
        this.defaultRoutes = {
            'super_admin': 'user-management.html',
            'admin': 'dashboard.html',
            'archive_officer': 'archive-dashboard.html', // موظف الأرشيف → داشبورد الأرشيف (بديل)
            'department_admin': 'dashboard.html', // مدير الإدارة → الداشبورد الرئيسي
            'supervisor': 'dashboard.html',
            'employee': 'dashboard.html',
            'viewer': 'dashboard.html' // المشاهد → الداشبورد الرئيسي
        };
    }

    /**
     * الحصول على صفحة التوجيه بناءً على بيانات المستخدم
     * @param {Object} userData - بيانات المستخدم
     * @param {string} userData.role - دور المستخدم
     * @param {string} userData.department - إدارة المستخدم
     * @param {string} userData.departmentId - معرف الإدارة
     * @returns {string} رابط الصفحة المطلوب التوجيه إليها
     */
    getDashboardRoute(userData) {
        try {
            const role = this.normalizeRole(userData?.role);
            const department = this.normalizeDepartmentName(userData?.department);
            const departmentId = this.normalizeDepartmentName(userData?.departmentId);
            
            console.log('🔄 تحديد مسار التوجيه:', { role, department, departmentId });

            // فقط مدير النظام الأعلى يذهب لإدارة المستخدمين الحساسة.
            if (role === 'super_admin') {
                console.log('✅ مدير نظام أعلى → إدارة المستخدمين');
                return 'user-management.html';
            }

            // محاولة التوجيه حسب معرف الإدارة أولاً (مع تطبيع إذا لزم)
            if (departmentId) {
                if (this.routes[departmentId]) {
                    const departmentRoute = this.routes[departmentId];
                    const dashboardUrl = departmentRoute.roles[role] || departmentRoute.defaultDashboard;
                    console.log(`✅ توجيه حسب معرف الإدارة (${departmentId}) والدور (${role}):`, dashboardUrl);
                    return dashboardUrl;
                }
                if (this.routes[departmentId]) {
                    const departmentRoute = this.routes[departmentId];
                    const dashboardUrl = departmentRoute.roles[role] || departmentRoute.defaultDashboard;
                    console.log(`✅ توجيه حسب معرف الإدارة (مطبع: ${departmentId}) والدور (${role}):`, dashboardUrl);
                    return dashboardUrl;
                }
            }

            // محاولة التوجيه حسب اسم الإدارة
            if (department) {
                if (this.routes[department]) {
                    const departmentRoute = this.routes[department];
                    const dashboardUrl = departmentRoute.roles[role] || departmentRoute.defaultDashboard;
                    console.log(`✅ توجيه حسب اسم الإدارة (${department}) والدور (${role}):`, dashboardUrl);
                    return dashboardUrl;
                }
            }

            // التوجيه الافتراضي حسب الدور
            if (role && this.defaultRoutes[role]) {
                console.log(`✅ توجيه افتراضي حسب الدور (${role}):`, this.defaultRoutes[role]);
                return this.defaultRoutes[role];
            }

            // للمستخدمين من الإدارة العامة أو بدون إدارة محددة
            if (department === 'عام' || department === 'admin') {
                if (role === 'viewer' || role === 'user') {
                    console.log('📋 مستخدم عام → الداشبورد الرئيسي');
                    return 'dashboard.html';
                }
            }

            // التوجيه الافتراضي العام
            console.log('⚠️ توجيه افتراضي عام → الداشبورد الرئيسي');
            return 'dashboard.html';

        } catch (error) {
            console.error('❌ خطأ في تحديد مسار التوجيه:', error);
            return 'dashboard.html';
        }
    }

    /**
     * تطبيع أسماء الإدارات للمطابقة
     * @param {string} departmentName 
     * @returns {string}
     */
    normalizeDepartmentName(departmentName) {
        if (!departmentName) return '';
        
        const name = departmentName.toLowerCase().trim();
        
        // خريطة تطبيع أسماء الإدارات
        const mappings = {
            // الأرشيف
            'أرشيف': 'archive',
            'الأرشيف': 'archive',
            'إدارة الأرشيف': 'archive',
            'إدارة الأرشيف العام': 'archive',
            'archive': 'archive',

            // الشؤون القانونية
            'قانونية': 'legal',
            'الإدارة القانونية': 'legal',
            'القانونية': 'legal',
            'الشؤون القانونية': 'legal',
            'legal': 'legal',

            // إدارة الملفات
            'ملفات': 'file-management',
            'إدارة الملفات': 'file-management',
            'file-management': 'file-management',

            // التحصيل
            'تحصيل': 'collection',
            'التحصيل': 'collection',
            'إدارة التحصيل': 'collection',
            'collection': 'collection',

            // الإدارة العامة
            'عام': 'admin',
            'الإدارة العامة': 'admin',
            'general': 'admin',
            'admin': 'admin',

            // تقنية المعلومات
            'تقنية المعلومات': 'it',
            'إدارة تقنية المعلومات': 'it',
            'تقنية معلومات': 'it',
            'معلومات': 'it',
            'it': 'it',
            'تكنولوجيا': 'it',

            // الحوكمة والامتثال
            'الحوكمة': 'governance',
            'إدارة الحوكمة والامتثال': 'governance',
            'الامتثال': 'governance',
            'governance': 'governance',
            'governance': 'governance',

            // التوريق
            'التوريق': 'securitization',
            'securitization': 'securitization'
        };

        return mappings[name] || name;
    }

    normalizeRole(roleName) {
        if (window.AuthConstants) {
            return window.AuthConstants.normalizeRole(roleName);
        }

        if (!roleName) return 'viewer';

        const role = String(roleName).toLowerCase().trim().replace(/\s+/g, '_');
        const mappings = {
            admin: 'admin',
            system_admin: 'super_admin',
            super_admin: 'super_admin',
            dept_admin: 'department_admin',
            department_admin: 'department_admin',
            'department-admin': 'department_admin',
            manager: 'department_admin',
            supervisor: 'supervisor',
            employee: 'employee',
            user: 'viewer',
            viewer: 'viewer',
            archive_officer: 'archive_officer',
            'archive-officer': 'archive_officer',
            legal_officer: 'employee',
            'legal-officer': 'employee',
            collection_officer: 'employee',
            'collection-officer': 'employee',
            file_manager: 'employee'
        };

        return mappings[role] || role;
    }

    /**
     * إضافة مسار جديد أو تحديث مسار موجود
     * @param {string} departmentKey - مفتاح الإدارة
     * @param {Object} routeConfig - إعدادات المسار
     */
    addRoute(departmentKey, routeConfig) {
        this.routes[departmentKey] = routeConfig;
        console.log(`✅ تم إضافة مسار جديد لإدارة: ${departmentKey}`);
    }

    /**
     * الحصول على جميع المسارات المتاحة
     * @returns {Object}
     */
    getAllRoutes() {
        return this.routes;
    }

    /**
     * التحقق من صحة المسار
     * @param {string} route 
     * @returns {boolean}
     */
    isValidRoute(route) {
        if (!route) return false;
        
        // قائمة الصفحات المتاحة
        const availablePages = [
            'dashboard.html',
            'user-management.html',
            'archive-dashboard.html',
            'legal-dashboard.html',
            'file-management-dashboard.html',
            'collection-dashboard.html',
            'it-dashboard.html',
            'governance-dashboard.html',
            'securitization-dashboard.html'
        ];

        return availablePages.includes(route);
    }

    /**
     * تسجيل محاولة التوجيه للمراقبة
     * @param {string} fromPage 
     * @param {string} toPage 
     * @param {Object} userData 
     */
    logRedirection(fromPage, toPage, userData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            from: fromPage,
            to: toPage,
            user: userData?.email || 'unknown',
            role: userData?.role || 'unknown',
            department: userData?.department || 'unknown'
        };

        console.log('📊 سجل التوجيه:', logEntry);
        
        // يمكن إضافة إرسال السجل لخدمة التحليلات هنا
        if (window.gtag) {
            window.gtag('event', 'role_based_redirect', {
                from_page: fromPage,
                to_page: toPage,
                user_role: userData?.role,
                user_department: userData?.department
            });
        }
    }
}

// إنشاء مثيل عام من نظام التوجيه
window.roleBasedRouter = new RoleBasedRouter();

// دالة مساعدة للتوجيه مع معالجة الأخطاء
window.redirectToDashboard = async function(userData) {
    try {
        // فحص إذا كان التوجيه التلقائي معطل
        if (window.__DISABLE_AUTO_ROUTING__) {
            console.log('🚫 التوجيه التلقائي معطل في هذه الصفحة');
            return;
        }
        
        if (!userData) {
            console.warn('⚠️ لا توجد بيانات مستخدم للتوجيه');
            window.location.href = 'dashboard.html';
            return;
        }

        const targetPage = window.roleBasedRouter.getDashboardRoute(userData);
        const currentPage = window.location.pathname.split('/').pop();
        
        // لا تعيد التوجيه إذا كان المستخدم بالفعل في الصفحة الصحيحة
        if (currentPage === targetPage) {
            console.log('✅ المستخدم بالفعل في الصفحة الصحيحة:', currentPage);
            return;
        }
        
        if (!window.roleBasedRouter.isValidRoute(targetPage)) {
            console.error('❌ مسار غير صحيح:', targetPage);
            window.location.href = 'dashboard.html';
            return;
        }

        // تسجيل محاولة التوجيه
        window.roleBasedRouter.logRedirection(
            currentPage,
            targetPage,
            userData
        );

        console.log(`🚀 توجيه إلى: ${targetPage}`);
        window.location.href = targetPage;
        
    } catch (error) {
        console.error('❌ خطأ في التوجيه:', error);
        window.location.href = 'dashboard.html';
    }
};

console.log('✅ نظام التوجيه بناءً على الدور جاهز');
