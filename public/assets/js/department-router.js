/**
 * نظام توجيه المستخدمين لوحات التحكم الخاصة بالإدارات
 * Department Dashboard Router
 */

class DepartmentRouter {
    constructor(authSystem) {
        this.auth = authSystem;
        this.departmentDashboards = {
            'archive': 'archive-dashboard.html',
            'legal': 'legal-dashboard.html', 
            'collection': 'collection-dashboard.html',
            'governance': 'governance-dashboard.html',
            'securitization': 'securitization-dashboard.html',
            'it': 'it-dashboard.html',
            'إدارة الأرشيف العام': 'archive-dashboard.html',
            'إدارة الشؤون القانونية': 'legal-dashboard.html',
            'إدارة التحصيل': 'collection-dashboard.html',
            'إدارة الحوكمة والامتثال': 'governance-dashboard.html',
            'التوريق': 'securitization-dashboard.html',
            'إدارة تقنية المعلومات': 'it-dashboard.html'
        };
        
        this.departmentColors = {
            'archive': '#2E8B57',
            'legal': '#B8860B', 
            'collection': '#DC143C',
            'governance': '#4682B4',
            'securitization': '#8B4513',
            'it': '#2F4F4F'
        };
    }

    /**
     * توجيه المستخدم للوحة التحكم الخاصة بإدارته
     */
    async redirectToDepartmentDashboard() {
        if (!this.auth.isAuthenticated) {
            console.log('❌ المستخدم غير مسجل، لا يمكن التوجيه');
            return false;
        }

        const userDepartment = this.auth.userDepartment;
        const currentPage = window.location.pathname.split('/').pop();
        
        // تحقق من وجود لوحة تحكم خاصة بالإدارة
        let departmentDashboard = this.departmentDashboards[userDepartment];
        
        // Fallback by normalization (lowercase key)
        if (!departmentDashboard && typeof userDepartment === 'string') {
            const key = userDepartment.toLowerCase();
            departmentDashboard = this.departmentDashboards[key];
        }
        
        if (departmentDashboard && currentPage !== departmentDashboard) {
            console.log(`🔄 توجيه المستخدم من ${userDepartment} إلى ${departmentDashboard}`);
            
            // تسجيل نشاط التوجيه
            try {
                await this.auth.logActivity('redirect_to_department_dashboard', {
                    fromPage: currentPage,
                    toDashboard: departmentDashboard,
                    department: userDepartment
                }, `توجيه تلقائي للوحة ${userDepartment}`);
            } catch (error) {
                console.warn('لا يمكن تسجيل نشاط التوجيه:', error);
            }
            
            // التوجيه مع رسالة ترحيب
            window.location.href = `${departmentDashboard}?welcome=true&dept=${encodeURIComponent(userDepartment)}`;
            return true;
        }
        
        return false;
    }

    /**
     * تحقق من إمكانية الوصول للصفحة الحالية
     */
    checkPageAccess(currentPage) {
        const userDepartment = this.auth.userDepartment;
        
        // إذا كان المستخدم في صفحة لوحة تحكم إدارة أخرى
        for (const [dept, dashboard] of Object.entries(this.departmentDashboards)) {
            if (currentPage === dashboard && dept !== userDepartment && 
                !this.departmentDashboards[userDepartment]) {
                console.log(`❌ المستخدم لا يملك صلاحية للوصول لـ ${dashboard}`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * الحصول على معلومات الإدارة
     */
    getDepartmentInfo(department) {
        const departmentNames = {
            'archive': 'إدارة الأرشيف العام',
            'legal': 'إدارة الشؤون القانونية',
            'collection': 'إدارة التحصيل',
            'governance': 'إدارة الحوكمة والامتثال',
            'securitization': 'التوريق',
            'it': 'إدارة تقنية المعلومات'
        };

        const departmentDescriptions = {
            'archive': 'إدارة وحفظ الوثائق والملفات الرسمية',
            'legal': 'الاستشارات القانونية والعقود والمنازعات',
            'collection': 'متابعة وتحصيل المستحقات والديون',
            'governance': 'ضمان الامتثال للقوانين واللوائح',
            'securitization': 'إدارة عمليات التوريق والأصول المالية',
            'it': 'تطوير وصيانة الأنظمة التقنية'
        };

        const departmentIcons = {
            'archive': 'fas fa-archive',
            'legal': 'fas fa-balance-scale',
            'collection': 'fas fa-money-bill-wave',
            'governance': 'fas fa-shield-alt',
            'securitization': 'fas fa-coins',
            'it': 'fas fa-laptop-code'
        };

        return {
            name: departmentNames[department] || department,
            description: departmentDescriptions[department] || '',
            icon: departmentIcons[department] || 'fas fa-building',
            color: this.departmentColors[department] || '#6c757d',
            dashboard: this.departmentDashboards[department] || 'dashboard.html'
        };
    }

    /**
     * إنشاء قائمة بجميع الإدارات المتاحة
     */
    getAllDepartments() {
        const departments = [];
        const processedDepartments = new Set();
        
        for (const [key, dashboard] of Object.entries(this.departmentDashboards)) {
            // تجنب التكرار (نفس الإدارة بمفاتيح مختلفة)
            if (!processedDepartments.has(dashboard)) {
                const deptInfo = this.getDepartmentInfo(key);
                departments.push({
                    id: key,
                    ...deptInfo
                });
                processedDepartments.add(dashboard);
            }
        }
        
        return departments;
    }

    /**
     * إضافة رسالة ترحيب عند التوجيه
     */
    showWelcomeMessage() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('welcome') === 'true') {
            const department = urlParams.get('dept');
            if (department) {
                const deptInfo = this.getDepartmentInfo(department);
                
                // إنشاء toast ترحيبي
                this.createWelcomeToast(deptInfo);
                
                // إزالة المعاملات من URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }

    /**
     * إنشاء رسالة toast ترحيبية
     */
    createWelcomeToast(deptInfo) {
        const toastHTML = `
            <div class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true" 
                 style="background: linear-gradient(135deg, ${deptInfo.color} 0%, ${this.lightenColor(deptInfo.color, 20)} 100%);">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="${deptInfo.icon} me-2"></i>
                        مرحباً بك في ${deptInfo.name}
                        <small class="d-block mt-1 opacity-75">${deptInfo.description}</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // إنشاء container للtoast إذا لم يكن موجوداً
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1055';
            document.body.appendChild(toastContainer);
        }

        // إضافة toast
        const toastElement = document.createElement('div');
        toastElement.innerHTML = toastHTML;
        toastContainer.appendChild(toastElement.firstElementChild);

        // تشغيل toast
        const toast = new bootstrap.Toast(toastContainer.lastElementChild, {
            delay: 5000
        });
        toast.show();

        // إزالة toast بعد إخفائه
        toastContainer.lastElementChild.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }

    /**
     * تفتيح لون للtoast
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * تطبيق نمط الإدارة على الصفحة
     */
    applyDepartmentTheme(department) {
        const deptInfo = this.getDepartmentInfo(department);
        
        // تطبيق اللون الأساسي للإدارة
        const root = document.documentElement;
        root.style.setProperty('--department-color', deptInfo.color);
        root.style.setProperty('--department-color-light', this.lightenColor(deptInfo.color, 30));
        
        // تحديث title الصفحة
        if (document.title.indexOf('نظام الأرشيف') > -1 && !document.title.includes(deptInfo.name)) {
            document.title = `${deptInfo.name} - نظام الأرشيف`;
        }
    }

    /**
     * إنشاء قائمة تنقل بين الإدارات (للمديرين)
     */
    createDepartmentNavigator() {
        if (!this.auth.hasPermission('system.admin') && !this.auth.hasPermission('departments.manage')) {
            return null;
        }

        const departments = this.getAllDepartments();
        const currentDept = this.auth.userDepartment;
        
        const navigatorHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="fas fa-building me-2"></i>
                    تبديل الإدارة
                </button>
                <ul class="dropdown-menu">
                    ${departments.map(dept => `
                        <li>
                            <a class="dropdown-item ${dept.id === currentDept ? 'active' : ''}" 
                               href="${dept.dashboard}">
                                <i class="${dept.icon} me-2" style="color: ${dept.color}"></i>
                                ${dept.name}
                            </a>
                        </li>
                    `).join('')}
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" href="dashboard.html">
                            <i class="fas fa-home me-2"></i>
                            اللوحة العامة
                        </a>
                    </li>
                </ul>
            </div>
        `;

        return navigatorHTML;
    }
}

// تصدير النظام للاستخدام العام
window.DepartmentRouter = DepartmentRouter;

// إنشاء instance عند تهيئة نظام المصادقة
document.addEventListener('DOMContentLoaded', () => {
    if (window.unifiedAuth) {
        window.departmentRouter = new DepartmentRouter(window.unifiedAuth);
        
        // التحقق من إمكانية التوجيه التلقائي عند تسجيل الدخول
        window.unifiedAuth.onAuthStateChange(async (user) => {
            if (user && window.departmentRouter) {
                // انتظار قليل للتأكد من تحميل بيانات المستخدم
                setTimeout(async () => {
                    const currentPage = window.location.pathname.split('/').pop();
                    
                    // التوجيه التلقائي إذا كان في الصفحة الرئيسية أو لوحة التحكم العامة
                    if (currentPage === 'dashboard.html' || currentPage === 'index.html') {
                        await window.departmentRouter.redirectToDepartmentDashboard();
                    }
                    
                    // تطبيق نمط الإدارة
                    window.departmentRouter.applyDepartmentTheme(window.unifiedAuth.userDepartment);
                    
                    // إظهار رسالة الترحيب
                    window.departmentRouter.showWelcomeMessage();
                }, 1000);
            }
        });
    }
});

// تصدير للوحدات إذا لزم الأمر
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DepartmentRouter;
}
