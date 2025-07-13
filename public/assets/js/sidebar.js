// Sidebar Navigation JavaScript - Always Visible with Toggle
class SidebarManager {
    constructor() {
        this.sidebar = null;
        this.sidebarOverlay = null;
        this.menuToggle = null;
        this.sidebarClose = null;
        this.sidebarNav = null;
        this.sidebarVisible = true;
        this.init();
    }

    init() {
        // Create sidebar HTML if it doesn't exist
        this.createSidebarHTML();
        
        // Get elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebarNav = document.getElementById('sidebarNav');

        // Add event listeners
        this.addEventListeners();
        
        // Initialize sidebar state
        this.initializeSidebar();
    }

    createSidebarHTML() {
        // Check if sidebar already exists
        if (document.getElementById('sidebar')) return;

        // Create sidebar overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);

        // Create sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        sidebar.id = 'sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h5 class="mb-0">القائمة الرئيسية</h5>
                <button class="sidebar-close" id="sidebarClose" title="إغلاق القائمة">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <ul class="sidebar-nav" id="sidebarNav">
                <!-- Will be populated by JavaScript -->
            </ul>
        `;
        document.body.appendChild(sidebar);

        // Add menu toggle to navbar if it doesn't exist
        const navbar = document.querySelector('.navbar .container');
        if (navbar && !document.getElementById('menuToggle')) {
            const navbarBrand = navbar.querySelector('.navbar-brand');
            if (navbarBrand) {
                const menuButton = document.createElement('button');
                menuButton.className = 'menu-toggle me-3';
                menuButton.id = 'menuToggle';
                menuButton.title = 'إغلاق القائمة';
                menuButton.innerHTML = '<i class="fas fa-times"></i>';
                
                const parentDiv = navbarBrand.parentElement;
                if (parentDiv.classList.contains('d-flex')) {
                    parentDiv.insertBefore(menuButton, navbarBrand);
                } else {
                    const flexDiv = document.createElement('div');
                    flexDiv.className = 'd-flex align-items-center';
                    parentDiv.insertBefore(flexDiv, navbarBrand);
                    flexDiv.appendChild(menuButton);
                    flexDiv.appendChild(navbarBrand);
                }
            }
        }
    }

    addEventListeners() {
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', () => this.hideSidebar());
        }
        
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.hideSidebar());
        }

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
        if (this.sidebarVisible) {
            this.showSidebar();
        } else {
            this.hideSidebar();
        }
    }

    showSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.remove('hidden');
        }
        document.body.classList.remove('sidebar-closed');
        this.sidebarVisible = true;
        
        // Update menu toggle icon
        if (this.menuToggle) {
            this.menuToggle.innerHTML = '<i class="fas fa-times"></i>';
            this.menuToggle.title = 'إغلاق القائمة';
        }

        // Show overlay on mobile
        if (window.innerWidth <= 768 && this.sidebarOverlay) {
            this.sidebarOverlay.classList.add('show');
        }
    }

    hideSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.add('hidden');
        }
        document.body.classList.add('sidebar-closed');
        this.sidebarVisible = false;
        
        // Update menu toggle icon  
        if (this.menuToggle) {
            this.menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            this.menuToggle.title = 'فتح القائمة';
        }

        // Hide overlay
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('show');
        }
    }

    closeSidebar() {
        this.hideSidebar();
    }

    initializeSidebar() {
        // Initialize sidebar as visible on desktop, hidden on mobile
        if (window.innerWidth <= 768) {
            this.hideSidebar();
        } else {
            this.showSidebar();
        }
    }

    handleResize() {
        if (window.innerWidth <= 768) {
            // On mobile
            document.body.classList.add('sidebar-closed');
            if (this.sidebarVisible && this.sidebarOverlay) {
                this.sidebarOverlay.classList.add('show');
            }
        } else {
            // On desktop
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.remove('show');
            }
            if (this.sidebarVisible) {
                document.body.classList.remove('sidebar-closed');
            }
        }
    }

    updateSidebarNav(isAuthenticated, userRole = null) {
        if (!this.sidebarNav) return;

        const currentPath = window.location.pathname;
        
        if (isAuthenticated && userRole) {
            // Load roles and page permissions
            Promise.all([
                this.loadRolesScript(),
                this.loadPagePermissionsScript()
            ]).then(() => {
                const roleInfo = window.getRoleInfo ? window.getRoleInfo(userRole) : null;
                
                // استخدام نظام إدارة صلاحيات الصفحات الجديد
                let navigationHTML = `
                    <li class="sidebar-nav-item">
                        <div class="sidebar-user-info p-3 mb-3 bg-light rounded">
                            <div class="d-flex align-items-center">
                                <div class="role-badge me-2" style="background-color: ${roleInfo?.color || '#6c757d'}">
                                    <i class="${roleInfo?.icon || 'fas fa-user'}"></i>
                                </div>
                                <div>
                                    <div class="fw-bold small">${roleInfo?.name || 'مستخدم'}</div>
                                    <div class="text-muted" style="font-size: 0.75rem">${roleInfo?.nameEn || 'User'}</div>
                                </div>
                            </div>
                        </div>
                    </li>
                `;

                // استخدام مدير صلاحيات الصفحات لإنشاء القائمة
                if (window.pagePermissionsManager && window.pagePermissionsManager.isPermissionsLoaded()) {
                    window.pagePermissionsManager.setUserRole(userRole);
                    const availablePages = window.pagePermissionsManager.getPagesByCategory(userRole);
                    
                    // ترتيب الفئات
                    const categoryOrder = ['main', 'files', 'tools', 'reports', 'admin', 'user'];
                    const categoryNames = {
                        main: 'الرئيسية',
                        files: 'إدارة الملفات',
                        tools: 'الأدوات',
                        reports: 'التقارير',
                        admin: 'الإدارة',
                        user: 'المستخدم'
                    };

                    categoryOrder.forEach(categoryKey => {
                        const pages = availablePages[categoryKey];
                        if (!pages || pages.length === 0) return;

                        if (categoryKey !== 'main') {
                            navigationHTML += `
                                <li class="sidebar-nav-item">
                                    <hr class="my-2">
                                </li>
                                <li class="sidebar-nav-section">
                                    <span class="sidebar-section-title">
                                        <i class="fas fa-${this.getCategoryIcon(categoryKey)} me-2"></i>
                                        ${categoryNames[categoryKey]}
                                    </span>
                                </li>
                            `;
                        }

                        pages.forEach(page => {
                            navigationHTML += `
                                <li class="sidebar-nav-item">
                                    <a href="${page.path}" class="sidebar-nav-link ${this.isActivePage([page.path]) ? 'active' : ''}" title="${page.description || ''}">
                                        <i class="${page.icon}"></i>
                                        ${page.name}
                                    </a>
                                </li>
                            `;
                        });
                    });
                } else {
                    // استخدام القائمة الافتراضية إذا لم يتم تحميل الصلاحيات
                    navigationHTML += this.getDefaultNavigation(userRole);
                }

                // إضافة الملف الشخصي وتسجيل الخروج
                navigationHTML += `
                    <li class="sidebar-nav-item">
                        <hr class="my-3">
                    </li>
                    <li class="sidebar-nav-item">
                        <a href="profile.html" class="sidebar-nav-link ${this.isActivePage(['profile.html']) ? 'active' : ''}">
                            <i class="fas fa-user"></i>
                            الملف الشخصي
                        </a>
                    </li>
                    <li class="sidebar-nav-item">
                        <a href="#" class="sidebar-nav-link" onclick="if(window.logout) logout(); return false;">
                            <i class="fas fa-sign-out-alt"></i>
                            تسجيل الخروج
                        </a>
                    </li>
                `;

                this.sidebarNav.innerHTML = navigationHTML;
            });
        } else if (isAuthenticated) {
            // إذا كان مسجل الدخول لكن بدون دور محدد
            this.sidebarNav.innerHTML = `
                <li class="sidebar-nav-item">
                    <a href="index.html" class="sidebar-nav-link ${this.isActivePage(['index.html', '/']) ? 'active' : ''}">
                        <i class="fas fa-home"></i>
                        الصفحة الرئيسية
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="dashboard.html" class="sidebar-nav-link ${this.isActivePage(['dashboard.html']) ? 'active' : ''}">
                        <i class="fas fa-tachometer-alt"></i>
                        لوحة التحكم
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item">
                    <a href="upload.html" class="sidebar-nav-link ${this.isActivePage(['upload.html']) ? 'active' : ''}">
                        <i class="fas fa-file-upload"></i>
                        رفع الملفات
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="search.html" class="sidebar-nav-link ${this.isActivePage(['search.html']) ? 'active' : ''}">
                        <i class="fas fa-search"></i>
                        البحث في الأرشيف
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="scanner.html" class="sidebar-nav-link ${this.isActivePage(['scanner.html']) ? 'active' : ''}">
                        <i class="fas fa-qrcode"></i>
                        مسح الباركود
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item">
                    <a href="file-tracking.html" class="sidebar-nav-link ${this.isActivePage(['file-tracking.html']) ? 'active' : ''}">
                        <i class="fas fa-route"></i>
                        تتبع حركة الملفات
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="movement-reports.html" class="sidebar-nav-link ${this.isActivePage(['movement-reports.html']) ? 'active' : ''}">
                        <i class="fas fa-chart-line"></i>
                        تقارير الحركة
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="file-management-dashboard.html" class="sidebar-nav-link ${this.isActivePage(['file-management-dashboard.html']) ? 'active' : ''}">
                        <i class="fas fa-tasks"></i>
                        إدارة الملفات
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item">
                    <a href="profile.html" class="sidebar-nav-link ${this.isActivePage(['profile.html']) ? 'active' : ''}">
                        <i class="fas fa-user"></i>
                        الملف الشخصي
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <hr class="my-3">
                </li>
                <li class="sidebar-nav-item">
                    <a href="#" class="sidebar-nav-link" onclick="if(window.logout) logout(); return false;">
                        <i class="fas fa-sign-out-alt"></i>
                        تسجيل الخروج
                    </a>
                </li>
            `;
        } else {
            // غير مسجل الدخول
            this.sidebarNav.innerHTML = `
                <li class="sidebar-nav-item">
                    <a href="index.html" class="sidebar-nav-link ${this.isActivePage(['index.html', '/']) ? 'active' : ''}">
                        <i class="fas fa-home"></i>
                        الصفحة الرئيسية
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="login.html" class="sidebar-nav-link ${this.isActivePage(['login.html']) ? 'active' : ''}">
                        <i class="fas fa-sign-in-alt"></i>
                        تسجيل الدخول
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="register.html" class="sidebar-nav-link ${this.isActivePage(['register.html']) ? 'active' : ''}">
                        <i class="fas fa-user-plus"></i>
                        إنشاء حساب جديد
                    </a>
                </li>
            `;
        }
    }

    // دالة لتحميل ملف الأدوار إذا لم يكن محملاً
    loadRolesScript() {
        return new Promise((resolve) => {
            if (window.USER_ROLES) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'assets/js/roles.js';
            script.onload = () => resolve();
            script.onerror = () => resolve(); // Continue even if failed to load
            document.head.appendChild(script);
        });
    }

    // دالة لتحميل ملف صلاحيات الصفحات
    loadPagePermissionsScript() {
        return new Promise((resolve) => {
            if (window.pagePermissionsManager) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'assets/js/page-permissions.js';
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.head.appendChild(script);
        });
    }

    // دالة للحصول على أيقونة الفئة
    getCategoryIcon(category) {
        const icons = {
            main: 'home',
            files: 'folder',
            tools: 'tools',
            reports: 'chart-bar',
            admin: 'cogs',
            user: 'user'
        };
        return icons[category] || 'circle';
    }

    // دالة للحصول على القائمة الافتراضية
    getDefaultNavigation(userRole) {
        let defaultNav = `
            <li class="sidebar-nav-item">
                <a href="index.html" class="sidebar-nav-link ${this.isActivePage(['index.html', '/']) ? 'active' : ''}">
                    <i class="fas fa-home"></i>
                    الصفحة الرئيسية
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="dashboard.html" class="sidebar-nav-link ${this.isActivePage(['dashboard.html']) ? 'active' : ''}">
                    <i class="fas fa-tachometer-alt"></i>
                    لوحة التحكم
                </a>
            </li>
        `;

        // الصفحات الأساسية للجميع
        defaultNav += `
            <li class="sidebar-nav-item">
                <hr class="my-2">
            </li>
            <li class="sidebar-nav-item">
                <a href="upload.html" class="sidebar-nav-link ${this.isActivePage(['upload.html']) ? 'active' : ''}">
                    <i class="fas fa-file-upload"></i>
                    رفع الملفات
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="search.html" class="sidebar-nav-link ${this.isActivePage(['search.html']) ? 'active' : ''}">
                    <i class="fas fa-search"></i>
                    البحث في الأرشيف
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="scanner.html" class="sidebar-nav-link ${this.isActivePage(['scanner.html']) ? 'active' : ''}">
                    <i class="fas fa-qrcode"></i>
                    مسح الباركود
                </a>
            </li>
        `;

        // إضافة الصفحات حسب الدور
        if (userRole === 'admin') {
            defaultNav += `
                <li class="sidebar-nav-item">
                    <a href="qr-generator.html" class="sidebar-nav-link ${this.isActivePage(['qr-generator.html']) ? 'active' : ''}">
                        <i class="fas fa-qrcode"></i>
                        إنشاء رموز QR
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item">
                    <a href="user-management.html" class="sidebar-nav-link ${this.isActivePage(['user-management.html']) ? 'active' : ''}">
                        <i class="fas fa-users"></i>
                        إدارة المستخدمين
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="admin-management.html" class="sidebar-nav-link ${this.isActivePage(['admin-management.html']) ? 'active' : ''}">
                        <i class="fas fa-user-shield"></i>
                        إدارة المدراء
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="activity-logs.html" class="sidebar-nav-link ${this.isActivePage(['activity-logs.html']) ? 'active' : ''}">
                        <i class="fas fa-history"></i>
                        سجل العمليات
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="page-permissions.html" class="sidebar-nav-link ${this.isActivePage(['page-permissions.html']) ? 'active' : ''}">
                        <i class="fas fa-key"></i>
                        صلاحيات الصفحات
                    </a>
                </li>
            `;
        }

        return defaultNav;
    }

    isActivePage(pages) {
        const currentPath = window.location.pathname;
        return pages.some(page => 
            currentPath.includes(page) || 
            (page === '/' && (currentPath === '/' || currentPath === '' || currentPath.endsWith('/index.html')))
        );
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.sidebarManager = new SidebarManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarManager;
}
