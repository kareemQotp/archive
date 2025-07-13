/**
 * إعداد عناصر التنقل للتحكم في الصلاحيات
 * Navigation Elements Setup for Permission Control
 */

document.addEventListener('DOMContentLoaded', function() {
    // انتظار تهيئة نظام الصلاحيات
    const waitForPermissionController = () => {
        if (window.permissionController && window.unifiedAuth) {
            setupNavigationElements();
        } else {
            setTimeout(waitForPermissionController, 100);
        }
    };
    
    waitForPermissionController();
});

function setupNavigationElements() {
    try {
        // تسجيل عناصر التنقل مع الصلاحيات المطلوبة
        const navigationElements = [
            { selector: '#nav-dashboard', permission: 'dashboard.access' },
            { selector: '#nav-upload', permission: 'files.create' },
            { selector: '#nav-search', permission: 'files.view' },
            { selector: '#nav-scanner', permission: 'scanner.access' },
            { selector: '#nav-users', permission: 'users.view' },
            { selector: '#nav-admin', permission: 'system.admin' },
            { selector: '#nav-roles', permission: 'roles.manage' },
            { selector: '#nav-invitations', permission: 'invitations.manage' },
            { selector: '#nav-reports', permission: 'reports.view' },
            { selector: '#nav-analytics', permission: 'reports.view' },
            { selector: '#nav-activity-logs', permission: 'system.admin' },
            { selector: '#nav-file-tracking', permission: 'files.view' },
            { selector: '#nav-file-management', permission: 'files.edit' },
            { selector: '#nav-permissions', permission: 'system.admin' }
        ];

        // تسجيل كل عنصر
        navigationElements.forEach(({ selector, permission }) => {
            if (window.permissionController && typeof window.permissionController.registerElement === 'function') {
                window.permissionController.registerElement(selector, permission, {
                    hideMethod: 'display',
                    showAlternative: null
                });
            }
        });

        console.log('✅ تم تسجيل عناصر التنقل بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تسجيل عناصر التنقل:', error);
    }
}

// إنشاء عناصر التنقل المفقودة ديناميكياً إذا لزم الأمر
function createMissingNavigationElements() {
    const missingElements = [
        { id: 'nav-dashboard', text: 'لوحة التحكم', icon: 'tachometer-alt' },
        { id: 'nav-upload', text: 'رفع الملفات', icon: 'file-upload' },
        { id: 'nav-search', text: 'البحث', icon: 'search' },
        { id: 'nav-scanner', text: 'الماسح الضوئي', icon: 'qrcode' },
        { id: 'nav-users', text: 'المستخدمين', icon: 'users' },
        { id: 'nav-admin', text: 'الإدارة', icon: 'user-shield' },
        { id: 'nav-roles', text: 'الأدوار', icon: 'users-cog' },
        { id: 'nav-invitations', text: 'الدعوات', icon: 'envelope' },
        { id: 'nav-reports', text: 'التقارير', icon: 'chart-line' },
        { id: 'nav-analytics', text: 'التحليلات', icon: 'analytics' },
        { id: 'nav-activity-logs', text: 'سجل الأنشطة', icon: 'history' },
        { id: 'nav-file-tracking', text: 'تتبع الملفات', icon: 'route' },
        { id: 'nav-file-management', text: 'إدارة الملفات', icon: 'tasks' },
        { id: 'nav-permissions', text: 'الصلاحيات', icon: 'key' }
    ];

    // البحث عن حاوية للعناصر
    let container = document.querySelector('.sidebar-nav') || 
                   document.querySelector('#sidebarNav') || 
                   document.querySelector('nav');

    if (!container) {
        // إنشاء حاوية مؤقتة مخفية
        container = document.createElement('div');
        container.style.display = 'none';
        container.id = 'hidden-nav-elements';
        document.body.appendChild(container);
    }

    // إنشاء العناصر المفقودة
    missingElements.forEach(({ id, text, icon }) => {
        if (!document.getElementById(id)) {
            const element = document.createElement('a');
            element.id = id;
            element.href = '#';
            element.className = 'nav-element';
            element.innerHTML = `<i class="fas fa-${icon}"></i> ${text}`;
            element.style.display = 'none'; // مخفي افتراضياً
            container.appendChild(element);
        }
    });
}

// تشغيل إنشاء العناصر المفقودة
document.addEventListener('DOMContentLoaded', createMissingNavigationElements);

// تصدير للاستخدام العام
window.setupNavigationElements = setupNavigationElements;
window.createMissingNavigationElements = createMissingNavigationElements;
