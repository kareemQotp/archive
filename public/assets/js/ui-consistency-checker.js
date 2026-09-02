/**
 * UI Consistency Checker
 * فاحص اتساق واجهة المستخدم
 */

class UIConsistencyChecker {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
        this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
    }

    /**
     * فحص شامل لاتساق الواجهة
     */
    async runFullCheck() {
        console.log('🔍 بدء فحص اتساق واجهة المستخدم');
        
        // فحص العناصر الأساسية
        this.checkBasicElements();
        
        // فحص النظام الموحد
        this.checkUnifiedSystem();
        
        // فحص القائمة الجانبية
        this.checkSidebar();
        
        // فحص إمكانية الوصول
        this.checkAccessibility();
        
        // فحص التصميم المتجاوب
        this.checkResponsiveDesign();

        // فحص نظام التصميم الجديد ومعايير القبول
        this.checkArchiveDesignSystem();
        this.checkNoHorizontalOverflow();
        this.checkTouchTargets();
        this.checkTableResponsiveness();
        
        // فحص الأيقونات والألوان
        this.checkIconsAndColors();
        
        // إنشاء التقرير
        this.generateReport();
        
        return this.results;
    }

    /**
     * فحص العناصر الأساسية المطلوبة
     */
    checkBasicElements() {
        const requiredElements = [
            { selector: '.navbar', name: 'شريط التنقل الرئيسي' },
            { selector: '.menu-toggle', name: 'زر فتح القائمة' },
            { selector: '.sidebar', name: 'القائمة الجانبية' },
            { selector: '.sidebar-overlay', name: 'طبقة القائمة الجانبية' },
            { selector: '#userInfo', name: 'معلومات المستخدم' }
        ];

        requiredElements.forEach(element => {
            const el = document.querySelector(element.selector);
            if (el) {
                this.results.passed.push(`✅ ${element.name} موجود`);
            } else {
                this.results.failed.push(`❌ ${element.name} مفقود`);
            }
        });
    }

    /**
     * فحص النظام الموحد
     */
    checkUnifiedSystem() {
        // فحص CSS الموحد
        const unifiedCSS = document.querySelector('link[href*="unified-sidebar.css"]');
        if (unifiedCSS) {
            this.results.passed.push('✅ CSS الموحد محمّل');
        } else {
            this.results.failed.push('❌ CSS الموحد مفقود');
        }

        // فحص JavaScript الموحد
        const unifiedJS = document.querySelector('script[src*="unified-ui-template.js"]');
        if (unifiedJS) {
            this.results.passed.push('✅ JavaScript الموحد محمّل');
        } else {
            this.results.failed.push('❌ JavaScript الموحد مفقود');
        }

        // فحص كائن UnifiedUITemplate
        if (window.UnifiedUITemplate) {
            this.results.passed.push('✅ فئة UnifiedUITemplate متاحة');
        } else {
            this.results.failed.push('❌ فئة UnifiedUITemplate غير متاحة');
        }

        // فحص تهيئة النظام
        if (window.unifiedUITemplate) {
            this.results.passed.push('✅ النظام الموحد مهيأ');
        } else {
            this.results.warnings.push('⚠️ النظام الموحد غير مهيأ بعد');
        }
    }

    /**
     * فحص القائمة الجانبية
     */
    checkSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            this.results.failed.push('❌ القائمة الجانبية مفقودة');
            return;
        }

        // فحص هيكل القائمة الجانبية
        const sidebarElements = [
            { selector: '.sidebar-header', name: 'رأس القائمة الجانبية' },
            { selector: '.sidebar-close', name: 'زر إغلاق القائمة' },
            { selector: '.user-info', name: 'معلومات المستخدم' },
            { selector: '.sidebar-nav', name: 'قائمة التنقل' },
            { selector: '.sidebar-footer', name: 'تذييل القائمة' }
        ];

        sidebarElements.forEach(element => {
            const el = sidebar.querySelector(element.selector);
            if (el) {
                this.results.passed.push(`✅ ${element.name} موجود في القائمة`);
            } else {
                this.results.failed.push(`❌ ${element.name} مفقود في القائمة`);
            }
        });

        // فحص ARIA attributes
        if (sidebar.hasAttribute('aria-hidden')) {
            this.results.passed.push('✅ ARIA hidden attribute موجود');
        } else {
            this.results.warnings.push('⚠️ ARIA hidden attribute مفقود');
        }
    }

    /**
     * فحص إمكانية الوصول
     */
    checkAccessibility() {
        // فحص alt text للصور
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length === 0) {
            this.results.passed.push('✅ جميع الصور تحتوي على alt text');
        } else {
            this.results.warnings.push(`⚠️ ${images.length} صورة بدون alt text`);
        }

        // فحص aria-label للأزرار
        const buttonsWithoutLabel = document.querySelectorAll('button:not([aria-label]):not([title])');
        if (buttonsWithoutLabel.length === 0) {
            this.results.passed.push('✅ جميع الأزرار تحتوي على تسميات');
        } else {
            this.results.warnings.push(`⚠️ ${buttonsWithoutLabel.length} زر بدون تسمية`);
        }

        // فحص skip links
        const skipLink = document.querySelector('.skip-link, .visually-hidden-focusable');
        if (skipLink) {
            this.results.passed.push('✅ رابط تخطي المحتوى موجود');
        } else {
            this.results.warnings.push('⚠️ رابط تخطي المحتوى مفقود');
        }

        // فحص role attributes
        const navElements = document.querySelectorAll('nav[role="navigation"]');
        if (navElements.length > 0) {
            this.results.passed.push('✅ عناصر التنقل تحتوي على role attributes');
        } else {
            this.results.warnings.push('⚠️ عناصر التنقل بدون role attributes');
        }
    }

    /**
     * فحص التصميم المتجاوب
     */
    checkResponsiveDesign() {
        // فحص viewport meta tag
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.includes('width=device-width')) {
            this.results.passed.push('✅ viewport meta tag صحيح');
        } else {
            this.results.failed.push('❌ viewport meta tag مفقود أو غير صحيح');
        }

        // فحص Bootstrap RTL
        const bootstrapRTL = document.querySelector('link[href*="bootstrap"][href*="rtl"]');
        if (bootstrapRTL) {
            this.results.passed.push('✅ Bootstrap RTL محمّل');
        } else {
            this.results.warnings.push('⚠️ Bootstrap RTL غير محمّل');
        }

        // فحص CSS variables
        const rootStyles = getComputedStyle(document.documentElement);
        const sidebarWidth = rootStyles.getPropertyValue('--sidebar-width');
        if (sidebarWidth) {
            this.results.passed.push('✅ CSS variables موجودة');
        } else {
            this.results.warnings.push('⚠️ CSS variables مفقودة');
        }
    }

    /**
     * فحص تحميل نظام التصميم الجديد واتجاه RTL
     */
    checkArchiveDesignSystem() {
        const designSystem = document.querySelector('link[href*="archive-design-system.css"]');
        const rootStyles = getComputedStyle(document.documentElement);
        const primary = rootStyles.getPropertyValue('--archive-primary').trim();
        const dir = document.documentElement.getAttribute('dir');
        const lang = document.documentElement.getAttribute('lang');

        if (designSystem || primary) {
            this.results.passed.push('✅ نظام التصميم الجديد محمّل');
        } else {
            this.results.failed.push('❌ نظام التصميم الجديد غير محمّل');
        }

        if (dir === 'rtl') {
            this.results.passed.push('✅ اتجاه الصفحة RTL');
        } else {
            this.results.failed.push('❌ اتجاه الصفحة ليس RTL');
        }

        if ((lang || '').toLowerCase().startsWith('ar')) {
            this.results.passed.push('✅ لغة الصفحة عربية');
        } else {
            this.results.warnings.push('⚠️ lang لا يشير إلى العربية');
        }
    }

    /**
     * فحص عدم وجود تمرير أفقي غير مقصود
     */
    checkNoHorizontalOverflow() {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if (overflow <= 2) {
            this.results.passed.push('✅ لا يوجد overflow أفقي ظاهر');
        } else {
            this.results.failed.push(`❌ يوجد overflow أفقي بمقدار ${overflow}px`);
        }
    }

    /**
     * فحص قابلية اللمس للأزرار والروابط المهمة
     */
    checkTouchTargets() {
        const controls = Array.from(document.querySelectorAll('button, .btn, input, select, textarea, .sidebar-item, .sidebar-nav-link'));
        const visibleControls = controls.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        });
        const tooSmall = visibleControls.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.height < 36 || rect.width < 32;
        });

        if (tooSmall.length === 0) {
            this.results.passed.push(`✅ أهداف اللمس مناسبة (${visibleControls.length} عنصر)`);
        } else {
            this.results.warnings.push(`⚠️ ${tooSmall.length} عنصر تفاعلي أصغر من الحجم الموصى به`);
        }
    }

    /**
     * فحص الجداول على الشاشات الصغيرة
     */
    checkTableResponsiveness() {
        const tables = Array.from(document.querySelectorAll('table'));
        if (tables.length === 0) {
            this.results.passed.push('✅ لا توجد جداول تحتاج فحصاً في هذه الصفحة');
            return;
        }

        const unwrapped = tables.filter(table => !table.closest('.table-responsive'));
        if (unwrapped.length === 0) {
            this.results.passed.push(`✅ كل الجداول داخل table-responsive (${tables.length})`);
        } else {
            this.results.warnings.push(`⚠️ ${unwrapped.length} جدول بدون حاوية table-responsive`);
        }
    }

    /**
     * فحص الأيقونات والألوان
     */
    checkIconsAndColors() {
        // فحص Font Awesome
        const fontAwesome = document.querySelector('link[href*="font-awesome"]');
        if (fontAwesome) {
            this.results.passed.push('✅ Font Awesome محمّل');
        } else {
            this.results.warnings.push('⚠️ Font Awesome غير محمّل');
        }

        // فحص الأيقونات في القائمة
        const sidebarIcons = document.querySelectorAll('.sidebar-nav i.fas, .sidebar-nav i.far');
        if (sidebarIcons.length > 0) {
            this.results.passed.push(`✅ ${sidebarIcons.length} أيقونة في القائمة الجانبية`);
        } else {
            this.results.warnings.push('⚠️ لا توجد أيقونات في القائمة الجانبية');
        }

        // فحص الألوان المتسقة
        const primaryButtons = document.querySelectorAll('.btn-primary');
        if (primaryButtons.length > 0) {
            this.results.passed.push(`✅ ${primaryButtons.length} زر أساسي بألوان متسقة`);
        }
    }

    /**
     * إنشاء تقرير الفحص
     */
    generateReport() {
        console.log('\n📊 تقرير فحص اتساق واجهة المستخدم');
        console.log('==========================================');
        console.log(`📄 الصفحة: ${this.currentPage}`);
        console.log(`✅ نجح: ${this.results.passed.length}`);
        console.log(`❌ فشل: ${this.results.failed.length}`);
        console.log(`⚠️ تحذيرات: ${this.results.warnings.length}`);
        console.log('');

        if (this.results.passed.length > 0) {
            console.log('✅ النقاط المطابقة:');
            this.results.passed.forEach(item => console.log(`  ${item}`));
            console.log('');
        }

        if (this.results.failed.length > 0) {
            console.log('❌ النقاط المفقودة:');
            this.results.failed.forEach(item => console.log(`  ${item}`));
            console.log('');
        }

        if (this.results.warnings.length > 0) {
            console.log('⚠️ التحذيرات:');
            this.results.warnings.forEach(item => console.log(`  ${item}`));
            console.log('');
        }

        // حساب نسبة النجاح
        const totalChecks = this.results.passed.length + this.results.failed.length;
        const successRate = totalChecks > 0 ? (this.results.passed.length / totalChecks * 100).toFixed(1) : 0;
        
        console.log(`📈 نسبة النجاح: ${successRate}%`);
        
        // عرض التوصيات
        this.showRecommendations();
    }

    /**
     * عرض التوصيات للتحسين
     */
    showRecommendations() {
        console.log('\n💡 التوصيات:');
        
        if (this.results.failed.length > 0) {
            console.log('🔧 إصلاحات مطلوبة:');
            if (this.results.failed.some(item => item.includes('CSS الموحد'))) {
                console.log('  - أضف مرجع unified-sidebar.css');
            }
            if (this.results.failed.some(item => item.includes('JavaScript الموحد'))) {
                console.log('  - أضف مرجع unified-ui-template.js');
            }
            if (this.results.failed.some(item => item.includes('القائمة الجانبية'))) {
                console.log('  - اطبق هيكل القائمة الجانبية الموحد');
            }
            if (this.results.failed.some(item => item.includes('overflow أفقي'))) {
                console.log('  - راجع عرض الجداول والفلاتر والبطاقات عند مقاسات الهاتف');
            }
            if (this.results.failed.some(item => item.includes('نظام التصميم الجديد'))) {
                console.log('  - أضف archive-design-system.css بعد الأنماط الخاصة بالصفحة');
            }
        }

        if (this.results.warnings.length > 0) {
            console.log('⚡ تحسينات مقترحة:');
            if (this.results.warnings.some(item => item.includes('ARIA'))) {
                console.log('  - أضف ARIA attributes للأزرار والعناصر التفاعلية');
            }
            if (this.results.warnings.some(item => item.includes('alt text'))) {
                console.log('  - أضف alt text لجميع الصور');
            }
            if (this.results.warnings.some(item => item.includes('skip link'))) {
                console.log('  - أضف رابط تخطي المحتوى للمساعدة في الوصول');
            }
            if (this.results.warnings.some(item => item.includes('table-responsive'))) {
                console.log('  - لف الجداول بحاوية .table-responsive أو وفر تخطيط موبايل بديل');
            }
        }
    }

    /**
     * تشغيل فحص سريع
     */
    quickCheck() {
        console.log('⚡ فحص سريع لاتساق الواجهة');
        
        const checks = [
            { test: () => document.querySelector('.sidebar'), name: 'القائمة الجانبية' },
            { test: () => document.querySelector('link[href*="unified-sidebar.css"], link[href*="archive-design-system.css"]'), name: 'CSS الموحد' },
            { test: () => window.UnifiedUITemplate, name: 'JavaScript الموحد' },
            { test: () => document.querySelector('.menu-toggle'), name: 'زر القائمة' },
            { test: () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2, name: 'عدم وجود overflow أفقي' }
        ];

        checks.forEach(check => {
            const result = check.test();
            console.log(`${result ? '✅' : '❌'} ${check.name}`);
        });
    }
}

// تصدير لواجهة النافذة العامة
window.UIConsistencyChecker = UIConsistencyChecker;

// تشغيل فحص تلقائي عند التحميل في وضع التطوير
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🔍 تشغيل فحص اتساق الواجهة التلقائي...');
            const checker = new UIConsistencyChecker();
            checker.quickCheck();
            
            // فحص شامل بعد 3 ثواني
            setTimeout(() => {
                checker.runFullCheck();
            }, 3000);
        }, 1000);
    });
}

// إضافة اختصار لوحة المفاتيح للفحص
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+U للفحص السريع
    if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        const checker = new UIConsistencyChecker();
        checker.quickCheck();
    }
    
    // Ctrl+Shift+I للفحص الشامل
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        const checker = new UIConsistencyChecker();
        checker.runFullCheck();
    }
});

console.log('🎨 نظام فحص اتساق الواجهة جاهز');
console.log('🔧 استخدم: new UIConsistencyChecker().runFullCheck()');
console.log('⚡ أو: Ctrl+Shift+U للفحص السريع');
console.log('📊 أو: Ctrl+Shift+I للفحص الشامل');
