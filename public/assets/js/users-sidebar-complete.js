/**
 * Enhanced sidebar system specifically for Users page
 * نظام القائمة الجانبية المحسن خصيصاً لصفحة المستخدمين
 */

if (!window.__UNIFIED_SIDEBAR_ACTIVE__) {

class UsersPageSidebar {
    constructor() {
        this.sidebar = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        // تشغيل التهيئة
        this.init();
    }
    
    async init() {
        console.log('🚀 بدء تهيئة القائمة الجانبية لصفحة المستخدمين...');
        
        // انتظار تحضير DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSidebar());
        } else {
            this.setupSidebar();
        }
    }
    
    async setupSidebar() {
        try {
            // البحث عن القائمة الجانبية
            this.sidebar = document.getElementById('sidebar');
            
            if (!this.sidebar) {
                console.warn('⚠️ عنصر القائمة الجانبية غير موجود، سيتم إنشاؤه...');
                this.createSidebarElement();
            }
            
            // التحقق من وجود SidebarManager
            if (typeof window.SidebarManager !== 'undefined' && window.SidebarManager) {
                console.log('✅ SidebarManager متوفر، تهيئة النظام المتقدم...');
                await this.initializeAdvancedSidebar();
            } else {
                console.warn('⚠️ SidebarManager غير متوفر، تهيئة النظام البديل...');
                await this.initializeBasicSidebar();
            }
            
            // إضافة وظائف إضافية
            this.addEnhancements();
            this.isInitialized = true;
            
            console.log('✅ تم تهيئة القائمة الجانبية بنجاح لصفحة المستخدمين');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة القائمة الجانبية:', error);
            this.handleRetry();
        }
    }
    
    createSidebarElement() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'sidebar';
        sidebar.className = 'sidebar';
        document.body.appendChild(sidebar);
        this.sidebar = sidebar;
        console.log('✅ تم إنشاء عنصر القائمة الجانبية');
    }
    
    async initializeAdvancedSidebar() {
        try {
            // تهيئة النظام المتقدم
            const sidebarManager = new window.SidebarManager();
            await sidebarManager.init();
            console.log('✅ تم تهيئة النظام المتقدم');
        } catch (error) {
            console.error('❌ فشل في تهيئة النظام المتقدم:', error);
            await this.initializeBasicSidebar();
        }
    }
    
    async initializeBasicSidebar() {
        console.log('🔧 تهيئة النظام البديل للقائمة الجانبية...');
        
        const sidebarHTML = `
            <div class="sidebar-header p-3">
                <div class="sidebar-brand d-flex align-items-center">
                    <div class="brand-icon me-3">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="brand-text">
                        <h4 class="m-0">إدارة المستخدمين</h4>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-content p-3">
                <nav class="sidebar-nav">
                    <ul class="nav nav-pills flex-column">
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link active" href="users.html">
                                <i class="fas fa-users"></i>
                                <span class="nav-text">جميع المستخدمين</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="admin-dashboard.html">
                                <i class="fas fa-tachometer-alt"></i>
                                <span class="nav-text">لوحة التحكم</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="departments.html">
                                <i class="fas fa-building"></i>
                                <span class="nav-text">الأقسام</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="files.html">
                                <i class="fas fa-file-alt"></i>
                                <span class="nav-text">الملفات</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="movements.html">
                                <i class="fas fa-exchange-alt"></i>
                                <span class="nav-text">حركة الملفات</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="notifications.html">
                                <i class="fas fa-bell"></i>
                                <span class="nav-text">الإشعارات</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="reports.html">
                                <i class="fas fa-chart-bar"></i>
                                <span class="nav-text">التقارير</span>
                            </a>
                        </li>
                        <li class="nav-item sidebar-nav-item">
                            <a class="nav-link sidebar-nav-link" href="settings.html">
                                <i class="fas fa-cog"></i>
                                <span class="nav-text">الإعدادات</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            
            <div class="sidebar-footer p-3 d-flex justify-content-between align-items-center">
                <button class="btn btn-outline-secondary btn-sm" onclick="this.toggleTheme()" title="تغيير المظهر">
                    <i class="fas fa-moon"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="this.showHelp()" title="المساعدة">
                    <i class="fas fa-question-circle"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="logout()" title="تسجيل الخروج">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        
        this.sidebar.innerHTML = sidebarHTML;
        console.log('✅ تم إنشاء المحتوى البديل للقائمة الجانبية');
    }
    
    addEnhancements() {
        // إضافة تأثيرات hover
        this.addHoverEffects();
        
        // إضافة وظائف التنقل
        this.setupNavigation();
        
        // إضافة وظائف الاختصارات
        this.setupKeyboardShortcuts();
        
        // تحديث الصفحة النشطة
        this.updateActivePage();
        
        console.log('✅ تم إضافة التحسينات الإضافية');
    }
    
    addHoverEffects() {
        const navLinks = this.sidebar.querySelectorAll('.sidebar-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateX(-5px)';
            });
            
            link.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateX(0)';
            });
        });
    }
    
    setupNavigation() {
        const navLinks = this.sidebar.querySelectorAll('.sidebar-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // إزالة الفئة النشطة من جميع الروابط
                navLinks.forEach(l => l.classList.remove('active'));
                
                // إضافة الفئة النشطة للرابط المحدد
                e.currentTarget.classList.add('active');
                
                // تسجيل النقرة
                console.log('🔄 تم النقر على:', e.currentTarget.querySelector('.nav-text').textContent);
            });
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + S لإظهار/إخفاء القائمة الجانبية
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                this.toggleSidebar();
            }
            
            // Alt + U للذهاب إلى صفحة المستخدمين
            if (e.altKey && e.key === 'u') {
                e.preventDefault();
                window.location.href = 'users.html';
            }
        });
    }
    
    updateActivePage() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = this.sidebar.querySelectorAll('.sidebar-nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || href === `./${currentPage}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    toggleSidebar() {
        if (this.sidebar.style.right === '-280px') {
            this.sidebar.style.right = '0';
        } else {
            this.sidebar.style.right = '-280px';
        }
    }
    
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // تحديث أيقونة المظهر
        const themeIcon = this.sidebar.querySelector('.fa-moon, .fa-sun');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    showHelp() {
        const helpContent = `
            <div class="text-center">
                <h5>مساعدة نظام إدارة المستخدمين</h5>
                <hr>
                <p><strong>اختصارات لوحة المفاتيح:</strong></p>
                <ul class="text-start list-unstyled">
                    <li>Alt + S: إظهار/إخفاء القائمة الجانبية</li>
                    <li>Alt + U: الذهاب إلى صفحة المستخدمين</li>
                </ul>
                <p><strong>الوظائف المتاحة:</strong></p>
                <ul class="text-start list-unstyled">
                    <li>• إدارة حسابات المستخدمين</li>
                    <li>• تعيين الأدوار والصلاحيات</li>
                    <li>• مراقبة النشاطات</li>
                    <li>• إدارة الأقسام</li>
                </ul>
            </div>
        `;
        
        // إنشاء modal للمساعدة
        if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(document.createElement('div'));
            // يمكن تطوير هذا أكثر حسب الحاجة
        } else {
            alert('نظام المساعدة\n\nاختصارات لوحة المفاتيح:\nAlt + S: إظهار/إخفاء القائمة الجانبية\nAlt + U: الذهاب إلى صفحة المستخدمين');
        }
    }
    
    handleRetry() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`🔄 محاولة إعادة التهيئة ${this.retryCount}/${this.maxRetries}...`);
            
            setTimeout(() => {
                this.setupSidebar();
            }, 1000 * this.retryCount);
        } else {
            console.error('❌ فشل في تهيئة القائمة الجانبية بعد عدة محاولات');
            this.showErrorMessage();
        }
    }
    
    showErrorMessage() {
        const errorHTML = `
            <div class="alert alert-warning m-3" role="alert">
                <h6><i class="fas fa-exclamation-triangle"></i> تنبيه</h6>
                <p class="mb-0">حدث خطأ في تحميل القائمة الجانبية. يرجى إعادة تحميل الصفحة.</p>
                <button class="btn btn-sm btn-outline-warning mt-2" onclick="location.reload()">
                    <i class="fas fa-redo"></i> إعادة تحميل
                </button>
            </div>
        `;
        
        if (this.sidebar) {
            this.sidebar.innerHTML = errorHTML;
        }
    }
    
    // وظائف المراقبة والتشخيص
    getDiagnostics() {
        return {
            isInitialized: this.isInitialized,
            sidebarExists: !!this.sidebar,
            sidebarVisible: this.sidebar ? window.getComputedStyle(this.sidebar).display !== 'none' : false,
            childrenCount: this.sidebar ? this.sidebar.children.length : 0,
            retryCount: this.retryCount,
            hasAdvancedManager: typeof window.SidebarManager !== 'undefined'
        };
    }
    
    logDiagnostics() {
        const diagnostics = this.getDiagnostics();
        console.log('📊 تشخيصات القائمة الجانبية:', diagnostics);
        return diagnostics;
    }
}

// تهيئة النظام عند تحميل الصفحة
let usersPageSidebar;

// انتظار تحميل DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 بدء تهيئة نظام القائمة الجانبية لصفحة المستخدمين...');
    usersPageSidebar = new UsersPageSidebar();
    
    // تسجيل النظام في window للوصول العام
    window.usersPageSidebar = usersPageSidebar;
});

// تهيئة فورية إذا كان DOM جاهزاً
if (document.readyState !== 'loading') {
    console.log('🔄 DOM جاهز، تهيئة فورية للقائمة الجانبية...');
    usersPageSidebar = new UsersPageSidebar();
    window.usersPageSidebar = usersPageSidebar;
}

// وظائف مساعدة عامة
window.toggleSidebar = function() {
    if (window.usersPageSidebar) {
        window.usersPageSidebar.toggleSidebar();
    }
};

window.getSidebarDiagnostics = function() {
    if (window.usersPageSidebar) {
        return window.usersPageSidebar.logDiagnostics();
    }
    return { error: 'النظام غير مهيأ' };
};

// مراقبة أخطاء التحميل
window.addEventListener('error', (e) => {
    if (e.filename && e.filename.includes('sidebar')) {
        console.error('❌ خطأ في تحميل ملف القائمة الجانبية:', e);
    }
});

console.log('✅ تم تحميل نظام القائمة الجانبية لصفحة المستخدمين');

}
