/**
 * مساعد الهجرة للنظام الموحد
 * Migration Helper for Unified Auth System
 */

class UnifiedAuthMigrationHelper {
    constructor() {
        this.pagesToMigrate = [];
        this.migrationResults = [];
    }

    // تحليل الصفحات الموجودة
    analyzeCurrentPages() {
        const pages = [
            'index.html',
            'dashboard.html', 
            'upload.html',
            'search.html',
            'scanner.html',
            'user-management.html',
            'admin-management.html',
            'file-tracking.html',
            'file-management-dashboard.html',
            'invitations.html',
            'role-manager.html',
            'movement-reports.html',
            'system-analytics.html',
            'page-permissions.html',
            'profile.html'
        ];

        pages.forEach(page => {
            this.analyzePageStructure(page);
        });
    }

    analyzePageStructure(pageName) {
        // تحليل هيكل الصفحة وتحديد ما يحتاج تحديث
        const analysis = {
            pageName: pageName,
            needsAuthUpdate: this.checkAuthUsage(pageName),
            needsPermissionSetup: this.checkPermissionElements(pageName),
            needsUIController: this.checkUIControllerNeeds(pageName),
            migrationPriority: this.calculateMigrationPriority(pageName)
        };

        this.pagesToMigrate.push(analysis);
    }

    checkAuthUsage(pageName) {
        // فحص استخدام المصادقة في الصفحة
        const commonAuthPatterns = [
            'auth.onAuthStateChanged',
            'requireAuth()',
            'auth.signOut',
            'firebase.auth()'
        ];
        
        return {
            hasOldAuth: true, // افتراض وجود نظام قديم
            patterns: commonAuthPatterns,
            needsReplacement: true
        };
    }

    checkPermissionElements(pageName) {
        // تحديد العناصر التي تحتاج صلاحيات
        const permissionMap = {
            'upload.html': ['files.create'],
            'user-management.html': ['users.view', 'users.edit'],
            'admin-management.html': ['users.create', 'system.admin'],
            'scanner.html': ['scanner.access'],
            'file-management-dashboard.html': ['files.edit', 'files.delete'],
            'invitations.html': ['invitations.manage'],
            'role-manager.html': ['roles.manage'],
            'system-analytics.html': ['system.admin'],
            'movement-reports.html': ['reports.view']
        };

        return permissionMap[pageName] || ['files.view'];
    }

    checkUIControllerNeeds(pageName) {
        // تحديد احتياجات وحدة التحكم في الواجهة
        const adminPages = [
            'admin-management.html',
            'user-management.html',
            'role-manager.html',
            'system-analytics.html'
        ];

        return {
            needsBasicController: true,
            needsAdvancedController: adminPages.includes(pageName),
            needsCustomPermissions: false
        };
    }

    calculateMigrationPriority(pageName) {
        // حساب أولوية الهجرة
        const priorities = {
            'login.html': 1, // أولوية عالية جداً
            'index.html': 2,
            'dashboard.html': 2,
            'admin-management.html': 3,
            'user-management.html': 3,
            'upload.html': 4,
            'scanner.html': 4,
            'search.html': 5
        };

        return priorities[pageName] || 6;
    }

    // توليد كود الهجرة
    generateMigrationCode(pageAnalysis) {
        const { pageName, needsPermissionSetup } = pageAnalysis;
        
        return {
            htmlIncludes: this.generateHTMLIncludes(),
            jsInitialization: this.generateJSInitialization(needsPermissionSetup),
            permissionSetup: this.generatePermissionSetup(needsPermissionSetup),
            uiUpdates: this.generateUIUpdates(pageName)
        };
    }

    generateHTMLIncludes() {
        return `
<!-- إضافة في <head> -->
<link rel="stylesheet" href="assets/css/permissions.css">

<!-- إضافة قبل إغلاق </body> -->
<script src="assets/js/unified-auth.js"></script>
<script src="assets/js/ui-permission-controller.js"></script>
        `.trim();
    }

    generateJSInitialization(permissions) {
        return `
// تهيئة نظام المصادقة الموحد
document.addEventListener('DOMContentLoaded', async function() {
    // انتظار تحميل النظام
    await new Promise(resolve => {
        if (window.unifiedAuth && unifiedAuth.isInitialized) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.unifiedAuth && unifiedAuth.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });

    // فحص المصادقة
    if (!unifiedAuth.requireAuth()) {
        return; // سيتم إعادة التوجيه
    }

    // فحص الصلاحيات المطلوبة
    ${permissions.map(p => `
    if (!unifiedAuth.hasPermission('${p}')) {
        unifiedAuth.showPermissionDenied();
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }`).join('')}

    // تهيئة الصفحة
    initializePage();
});

function initializePage() {
    // كود تهيئة الصفحة هنا
    console.log('تم تهيئة الصفحة بنجاح');
}
        `.trim();
    }

    generatePermissionSetup(permissions) {
        return `
// إعداد الصلاحيات للعناصر
function setupPagePermissions() {
    ${permissions.map(permission => `
    // إعداد العناصر التي تتطلب صلاحية ${permission}
    document.querySelectorAll('[data-permission="${permission}"]').forEach(element => {
        if (!unifiedAuth.hasPermission('${permission}')) {
            element.style.display = 'none';
        }
    });`).join('')}
}

// تشغيل إعداد الصلاحيات عند تغيير حالة المصادقة
unifiedAuth.onAuthStateChange(() => {
    setupPagePermissions();
});
        `.trim();
    }

    generateUIUpdates(pageName) {
        return `
// تحديثات واجهة المستخدم المخصصة لـ ${pageName}
function updatePageUI() {
    // تحديث معلومات المستخدم
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(el => el.textContent = unifiedAuth.userName);

    const userRoleElements = document.querySelectorAll('[data-user-role]');
    userRoleElements.forEach(el => el.textContent = unifiedAuth.userRole);

    // تحديث القائمة الجانبية بناءً على الصلاحيات
    updateNavigationBasedOnPermissions();
}

function updateNavigationBasedOnPermissions() {
    const navItems = [
        { id: 'nav-upload', permission: 'files.create' },
        { id: 'nav-users', permission: 'users.view' },
        { id: 'nav-admin', permission: 'system.admin' },
        { id: 'nav-scanner', permission: 'scanner.access' }
    ];

    navItems.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.style.display = unifiedAuth.hasPermission(item.permission) ? '' : 'none';
        }
    });
}
        `.trim();
    }

    // تنفيذ الهجرة
    async performMigration() {
        console.log('بدء عملية الهجرة للنظام الموحد...');
        
        // تحليل الصفحات
        this.analyzeCurrentPages();
        
        // ترتيب حسب الأولوية
        this.pagesToMigrate.sort((a, b) => a.migrationPriority - b.migrationPriority);
        
        // توليد التوجيهات لكل صفحة
        for (const pageAnalysis of this.pagesToMigrate) {
            const migrationCode = this.generateMigrationCode(pageAnalysis);
            
            this.migrationResults.push({
                page: pageAnalysis.pageName,
                priority: pageAnalysis.migrationPriority,
                code: migrationCode,
                status: 'ready_for_migration'
            });
        }
        
        this.generateMigrationReport();
    }

    generateMigrationReport() {
        console.log('\n=== تقرير الهجرة للنظام الموحد ===\n');
        
        this.migrationResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.page} (أولوية: ${result.priority})`);
            console.log('   التحديثات المطلوبة:');
            console.log('   - إضافة مراجع النظام الموحد');
            console.log('   - تحديث كود المصادقة');
            console.log('   - إعداد الصلاحيات');
            console.log('   - تحديث واجهة المستخدم');
            console.log('');
        });
        
        console.log('الخطوات التالية:');
        console.log('1. نسخ الملفات الأساسية للنظام الموحد');
        console.log('2. تحديث كل صفحة حسب الأولوية');
        console.log('3. اختبار كل صفحة بعد التحديث');
        console.log('4. نشر التحديثات تدريجياً');
    }

    // إنشاء ملف نسخ احتياطي
    generateBackupInstructions() {
        return `
# تعليمات النسخ الاحتياطي قبل الهجرة

## نسخ الملفات الحالية
mkdir backup/$(date +%Y%m%d_%H%M%S)
cp public/assets/js/auth.js backup/$(date +%Y%m%d_%H%M%S)/
cp public/assets/js/firebase-init.js backup/$(date +%Y%m%d_%H%M%S)/

## نسخ صفحات HTML الرئيسية
cp public/*.html backup/$(date +%Y%m%d_%H%M%S)/

## إنشاء قائمة بالتغييرات
echo "تم إنشاء نسخة احتياطية في $(date)" > backup/$(date +%Y%m%d_%H%M%S)/migration_log.txt
        `.trim();
    }

    // اختبار النظام بعد الهجرة
    generateTestPlan() {
        return `
# خطة اختبار ما بعد الهجرة

## اختبارات أساسية
1. تسجيل الدخول والخروج
2. فحص الصلاحيات لكل دور
3. عرض/إخفاء العناصر بناءً على الصلاحيات
4. عمل القائمة الجانبية
5. عرض معلومات المستخدم

## اختبارات متقدمة
1. انتهاء صلاحية الجلسة
2. منع الوصول غير المصرح به
3. تتبع أحداث المصادقة
4. أداء النظام

## صفحات للاختبار الشامل
${this.migrationResults.map(r => `- ${r.page}`).join('\n')}
        `.trim();
    }
}

// إنشاء مثيل وتنفيذ الهجرة
const migrationHelper = new UnifiedAuthMigrationHelper();

// تشغيل الهجرة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('مساعد الهجرة جاهز');
    console.log('استخدم migrationHelper.performMigration() لبدء التحليل');
});

// تصدير للاستخدام العام
window.migrationHelper = migrationHelper;
