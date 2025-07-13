// Page Permissions Manager
// إدارة صلاحيات الصفحات والتحكم في الوصول

class PagePermissionsManager {
    constructor() {
        this.permissions = {};
        this.userRole = null;
        this.isLoaded = false;
    }

    // تحميل صلاحيات الصفحات من قاعدة البيانات
    async loadPermissions() {
        try {
            if (!firebase || !firebase.firestore) {
                console.warn('Firebase غير متاح لتحميل الصلاحيات');
                this.loadDefaultPermissions();
                return;
            }

            const db = firebase.firestore();
            const permissionsDoc = await db.collection('system_settings').doc('page_permissions').get();
            
            if (permissionsDoc.exists) {
                this.permissions = permissionsDoc.data().pages || {};
            } else {
                this.loadDefaultPermissions();
            }
            
            this.isLoaded = true;
            console.log('تم تحميل صلاحيات الصفحات بنجاح');
            
        } catch (error) {
            console.error('خطأ في تحميل صلاحيات الصفحات:', error);
            this.loadDefaultPermissions();
        }
    }

    // تحميل الصلاحيات الافتراضية
    loadDefaultPermissions() {
        this.permissions = {
            'dashboard': {
                name: 'لوحة التحكم',
                path: 'dashboard.html',
                icon: 'fas fa-tachometer-alt',
                description: 'الصفحة الرئيسية للنظام',
                category: 'main',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: true
                }
            },
            'file-management': {
                name: 'إدارة الملفات',
                path: 'file-management-dashboard.html',
                icon: 'fas fa-folder-open',
                description: 'إدارة وتنظيم الملفات والوثائق',
                category: 'files',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: false
                }
            },
            'file-tracking': {
                name: 'تتبع الملفات',
                path: 'file-tracking.html',
                icon: 'fas fa-route',
                description: 'تتبع حركة الملفات والوثائق',
                category: 'files',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: true
                }
            },
            'upload': {
                name: 'رفع الملفات',
                path: 'upload.html',
                icon: 'fas fa-cloud-upload-alt',
                description: 'رفع الملفات والوثائق الجديدة',
                category: 'files',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: false
                }
            },
            'search': {
                name: 'البحث',
                path: 'search.html',
                icon: 'fas fa-search',
                description: 'البحث في الملفات والوثائق',
                category: 'files',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: true
                }
            },
            'scanner': {
                name: 'الماسح الضوئي',
                path: 'scanner.html',
                icon: 'fas fa-camera',
                description: 'مسح الباركود والوثائق',
                category: 'tools',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: false
                }
            },
            'qr-generator': {
                name: 'مولد QR',
                path: 'qr-generator.html',
                icon: 'fas fa-qrcode',
                description: 'إنشاء رموز QR للملفات',
                category: 'tools',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: false
                }
            },
            'user-management': {
                name: 'إدارة المستخدمين',
                path: 'user-management.html',
                icon: 'fas fa-users',
                description: 'إدارة حسابات المستخدمين',
                category: 'admin',
                permissions: {
                    admin: true,
                    manager: false,
                    employee: false,
                    viewer: false
                }
            },
            'admin-management': {
                name: 'إدارة المدراء',
                path: 'admin-management.html',
                icon: 'fas fa-user-shield',
                description: 'إدارة حسابات المدراء',
                category: 'admin',
                permissions: {
                    admin: true,
                    manager: false,
                    employee: false,
                    viewer: false
                }
            },
            'role-manager': {
                name: 'إدارة الأدوار',
                path: 'role-manager.html',
                icon: 'fas fa-user-cog',
                description: 'إدارة أدوار وصلاحيات المستخدمين',
                category: 'admin',
                permissions: {
                    admin: true,
                    manager: false,
                    employee: false,
                    viewer: false
                }
            },
            'page-permissions': {
                name: 'صلاحيات الصفحات',
                path: 'page-permissions.html',
                icon: 'fas fa-key',
                description: 'إدارة صلاحيات الوصول للصفحات',
                category: 'admin',
                permissions: {
                    admin: true,
                    manager: false,
                    employee: false,
                    viewer: false
                }
            },
            'movement-reports': {
                name: 'تقارير الحركة',
                path: 'movement-reports.html',
                icon: 'fas fa-chart-line',
                description: 'تقارير حركة الملفات والأنشطة',
                category: 'reports',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: false,
                    viewer: false
                }
            },
            'system-analytics': {
                name: 'تحليلات النظام',
                path: 'system-analytics.html',
                icon: 'fas fa-chart-pie',
                description: 'إحصائيات وتحليلات النظام',
                category: 'reports',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: false,
                    viewer: false
                }
            },
            'profile': {
                name: 'الملف الشخصي',
                path: 'profile.html',
                icon: 'fas fa-user-circle',
                description: 'إدارة الملف الشخصي',
                category: 'user',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: true,
                    viewer: true
                }
            },
            'invitations': {
                name: 'دعوة المستخدمين',
                path: 'invitations.html',
                icon: 'fas fa-envelope',
                description: 'إرسال دعوات للمستخدمين الجدد',
                category: 'admin',
                permissions: {
                    admin: true,
                    manager: true,
                    employee: false,
                    viewer: false
                }
            }
        };
        
        this.isLoaded = true;
        console.log('تم تحميل الصلاحيات الافتراضية');
    }

    // تعيين دور المستخدم الحالي
    setUserRole(role) {
        this.userRole = role;
    }

    // التحقق من صلاحية الوصول لصفحة معينة
    hasPageAccess(pageId, userRole = null) {
        const role = userRole || this.userRole;
        if (!role || !this.permissions[pageId]) {
            return false;
        }
        
        return this.permissions[pageId].permissions[role] === true;
    }

    // الحصول على قائمة الصفحات المتاحة للمستخدم
    getAvailablePages(userRole = null) {
        const role = userRole || this.userRole;
        if (!role) return [];

        return Object.entries(this.permissions)
            .filter(([pageId, page]) => page.permissions[role])
            .map(([pageId, page]) => ({
                id: pageId,
                ...page
            }));
    }

    // الحصول على قائمة الصفحات مجمعة حسب الفئة
    getPagesByCategory(userRole = null) {
        const availablePages = this.getAvailablePages(userRole);
        const categories = {};

        availablePages.forEach(page => {
            const category = page.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(page);
        });

        return categories;
    }

    // إنشاء عناصر القائمة الجانبية بناءً على الصلاحيات
    generateSidebarItems(userRole = null) {
        const categories = this.getPagesByCategory(userRole);
        const categoryNames = {
            main: 'الرئيسية',
            files: 'إدارة الملفات',
            tools: 'الأدوات',
            reports: 'التقارير',
            admin: 'الإدارة',
            user: 'المستخدم',
            other: 'أخرى'
        };

        const sidebarHTML = [];

        Object.entries(categories).forEach(([categoryKey, pages]) => {
            if (pages.length === 0) return;

            const categoryName = categoryNames[categoryKey] || categoryKey;
            
            sidebarHTML.push(`
                <div class="nav-section">
                    <div class="nav-section-title">${categoryName}</div>
                    ${pages.map(page => `
                        <a href="${page.path}" class="nav-link" data-page="${page.id}">
                            <i class="${page.icon}"></i>
                            <span>${page.name}</span>
                        </a>
                    `).join('')}
                </div>
            `);
        });

        return sidebarHTML.join('');
    }

    // التحقق من الوصول للصفحة الحالية
    checkCurrentPageAccess() {
        const currentPage = window.location.pathname.split('/').pop();
        const pageId = currentPage.replace('.html', '');
        
        if (!this.hasPageAccess(pageId)) {
            this.handleUnauthorizedAccess();
            return false;
        }
        
        return true;
    }

    // التعامل مع الوصول غير المصرح به
    handleUnauthorizedAccess() {
        const allowedPages = this.getAvailablePages();
        
        if (allowedPages.length > 0) {
            // إعادة توجيه لأول صفحة متاحة
            const firstAvailablePage = allowedPages[0];
            window.location.href = firstAvailablePage.path;
        } else {
            // إعادة توجيه لصفحة تسجيل الدخول
            window.location.href = 'login.html';
        }
    }

    // الحصول على معلومات صفحة معينة
    getPageInfo(pageId) {
        return this.permissions[pageId] || null;
    }

    // الحصول على جميع الصلاحيات
    getAllPermissions() {
        return this.permissions;
    }

    // التحقق من تحميل الصلاحيات
    isPermissionsLoaded() {
        return this.isLoaded;
    }

    // انتظار تحميل الصلاحيات
    async waitForPermissions(timeout = 5000) {
        const startTime = Date.now();
        
        while (!this.isLoaded && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return this.isLoaded;
    }

    // تحديث القائمة الجانبية بناءً على الصلاحيات
    updateSidebar(sidebarElement, userRole = null) {
        if (!sidebarElement) return;
        
        const sidebarHTML = this.generateSidebarItems(userRole);
        sidebarElement.innerHTML = sidebarHTML;
        
        // تحديد الصفحة النشطة
        const currentPage = window.location.pathname.split('/').pop();
        const activeLink = sidebarElement.querySelector(`[href="${currentPage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // فلترة الأزرار والعناصر بناءً على الصلاحيات
    filterPageElements(userRole = null) {
        const role = userRole || this.userRole;
        
        // إخفاء الروابط غير المصرح بها
        document.querySelectorAll('[data-page-permission]').forEach(element => {
            const requiredPage = element.getAttribute('data-page-permission');
            if (!this.hasPageAccess(requiredPage, role)) {
                element.style.display = 'none';
            }
        });

        // إخفاء العناصر بناءً على الدور
        document.querySelectorAll('[data-role-permission]').forEach(element => {
            const requiredRoles = element.getAttribute('data-role-permission').split(',');
            if (!requiredRoles.includes(role)) {
                element.style.display = 'none';
            }
        });
    }
}

// إنشاء مثيل عام
const pagePermissionsManager = new PagePermissionsManager();

// تصدير للاستخدام العام
window.PagePermissionsManager = PagePermissionsManager;
window.pagePermissionsManager = pagePermissionsManager;

// دوال مساعدة للاستخدام السريع
window.hasPageAccess = function(pageId, userRole = null) {
    return pagePermissionsManager.hasPageAccess(pageId, userRole);
};

window.getAvailablePages = function(userRole = null) {
    return pagePermissionsManager.getAvailablePages(userRole);
};

window.checkPageAccess = function() {
    return pagePermissionsManager.checkCurrentPageAccess();
};

// تحميل الصلاحيات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    pagePermissionsManager.loadPermissions();
});

// تصدير الفئة للاستخدام العام
window.PagePermissionsManager = PagePermissionsManager;
