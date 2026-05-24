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
                    'admin': 'archive-dashboard.html',
                    'archive-officer': 'archive-dashboard.html',
                    'department-admin': 'archive-dashboard.html',
                    'viewer': 'archive-dashboard.html'
                }
            },
            
            // الإدارة القانونية
            'legal': {
                defaultDashboard: 'legal-dashboard.html',
                roles: {
                    'admin': 'legal-dashboard.html',
                    'archive-officer': 'legal-dashboard.html',
                    'department-admin': 'legal-dashboard.html',
                    'viewer': 'legal-dashboard.html'
                }
            },
            
            // إدارة الملفات
            'file-management': {
                defaultDashboard: 'file-management-dashboard.html',
                roles: {
                    'admin': 'file-management-dashboard.html',
                    'archive-officer': 'file-management-dashboard.html',
                    'department-admin': 'file-management-dashboard.html',
                    'viewer': 'file-management-dashboard.html'
                }
            },
            
            // إدارة التحصيل
            'collection': {
                defaultDashboard: 'collection-dashboard.html',
                roles: {
                    'admin': 'collection-dashboard.html',
                    'archive-officer': 'collection-dashboard.html',
                    'department-admin': 'collection-dashboard.html',
                    'viewer': 'collection-dashboard.html'
                }
            },
            
            // تقنية المعلومات
            'it': {
                defaultDashboard: 'it-dashboard.html', // لوحة تقنية المعلومات الخاصة
                roles: {
                    'admin': 'it-dashboard.html',
                    'archive-officer': 'it-dashboard.html',
                    'department-admin': 'it-dashboard.html',
                    'viewer': 'it-dashboard.html'
                }
            },

            // الحوكمة والامتثال
            'governance': {
                defaultDashboard: 'governance-dashboard.html',
                roles: {
                    'admin': 'governance-dashboard.html',
                    'archive-officer': 'governance-dashboard.html',
                    'department-admin': 'governance-dashboard.html',
                    'viewer': 'governance-dashboard.html'
                }
            },

            // إدارة التوريق
            'securitization': {
                defaultDashboard: 'securitization-dashboard.html',
                roles: {
                    'admin': 'securitization-dashboard.html',
                    'archive-officer': 'securitization-dashboard.html',
                    'department-admin': 'securitization-dashboard.html',
                    'viewer': 'securitization-dashboard.html'
                }
            }
        };

        // الداشبوردات الافتراضية حسب الدور العام
        this.defaultRoutes = {
            'admin': 'user-management.html', // المسؤول العام → إدارة المستخدمين
            'system_admin': 'user-management.html', // مسؤول النظام → إدارة المستخدمين
            'archive-officer': 'archive-dashboard.html', // موظف الأرشيف → داشبورد الأرشيف
            'archive_officer': 'archive-dashboard.html', // موظف الأرشيف → داشبورد الأرشيف (بديل)
            'legal-officer': 'legal-dashboard.html', // موظف الشؤون القانونية → داشبورد القانونية
            'legal_officer': 'legal-dashboard.html', // موظف الشؤون القانونية → داشبورد القانونية (بديل)
            'collection-officer': 'collection-dashboard.html', // موظف التحصيل → داشبورد التحصيل
            'collection_officer': 'collection-dashboard.html', // موظف التحصيل → داشبورد التحصيل (بديل)
            'file-manager': 'file-management-dashboard.html', // مدير الملفات → داشبورد إدارة الملفات
            'file_manager': 'file-management-dashboard.html', // مدير الملفات → داشبورد إدارة الملفات (بديل)
            'department-admin': 'dashboard.html', // مدير الإدارة → الداشبورد الرئيسي
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
            const role = userData?.role;
            const department = userData?.department;
            const departmentId = userData?.departmentId;
            
            console.log('🔄 تحديد مسار التوجيه:', { role, department, departmentId });

            // إذا كان المستخدم مسؤول نظام عام، يذهب لإدارة المستخدمين
            if (role === 'admin') {
                console.log('✅ مسؤول نظام → إدارة المستخدمين');
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
                const normalizedDeptId = this.normalizeDepartmentName(departmentId);
                if (this.routes[normalizedDeptId]) {
                    const departmentRoute = this.routes[normalizedDeptId];
                    const dashboardUrl = departmentRoute.roles[role] || departmentRoute.defaultDashboard;
                    console.log(`✅ توجيه حسب معرف الإدارة (مطبع: ${normalizedDeptId}) والدور (${role}):`, dashboardUrl);
                    return dashboardUrl;
                }
            }

            // محاولة التوجيه حسب اسم الإدارة
            if (department) {
                const normalizedDepartment = this.normalizeDepartmentName(department);
                if (this.routes[normalizedDepartment]) {
                    const departmentRoute = this.routes[normalizedDepartment];
                    const dashboardUrl = departmentRoute.roles[role] || departmentRoute.defaultDashboard;
                    console.log(`✅ توجيه حسب اسم الإدارة (${normalizedDepartment}) والدور (${role}):`, dashboardUrl);
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
            'governنسe': 'governance',
            'governance': 'governance',

            // التوريق
            'التوريق': 'securitization',
            'securitization': 'securitization'
        };

        return mappings[name] || name;
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