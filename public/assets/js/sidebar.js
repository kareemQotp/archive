// Sidebar Navigation JavaScript - Always Visible with Toggle
if (!window.__UNIFIED_SIDEBAR_ACTIVE__) {

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
        this.menuToggle = document.getElementById('menuToggle') || document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebarNav = document.getElementById('sidebarNav');

        // Add event listeners
        this.addEventListeners();
        
        // Initialize sidebar state
        this.initializeSidebar();
    }

    normalizeRole(role) {
        if (window.AuthConstants && typeof window.AuthConstants.normalizeRole === 'function') {
            return window.AuthConstants.normalizeRole(role);
        }
        if (!role) return 'viewer';
        const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
        const aliases = {
            admin: 'admin',
            system_admin: 'super_admin',
            super_admin: 'super_admin',
            dept_admin: 'department_admin',
            manager: 'department_admin',
            'department-admin': 'department_admin',
            department_admin: 'department_admin',
            archive_officer: 'archive_officer',
            'archive-officer': 'archive_officer',
            employee: 'employee',
            user: 'viewer',
            viewer: 'viewer'
        };
        return aliases[normalized] || normalized;
    }

    isAdminRole(role) {
        const normalized = this.normalizeRole(role);
        return normalized === 'super_admin' || normalized === 'admin';
    }

    isArchiveRole(role) {
        const normalized = this.normalizeRole(role);
        return normalized === 'employee' || normalized === 'archive_officer' || normalized === 'department_admin' ||
            normalized === 'super_admin' || normalized === 'admin';
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
                <div class="sidebar-brand">
                    <i class="fas fa-archive text-primary me-2"></i>
                    <h5 class="mb-0">نظام الأرشيف</h5>
                </div>
                <button class="sidebar-close" id="sidebarClose" title="إغلاق القائمة">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="sidebar-search">
                <div class="input-group">
                    <input type="text" class="form-control sidebar-search-input" 
                           placeholder="البحث في القائمة..." id="sidebarSearchInput">
                    <span class="input-group-text">
                        <i class="fas fa-search"></i>
                    </span>
                </div>
            </div>
            <ul class="sidebar-nav" id="sidebarNav">
                <!-- Will be populated by JavaScript -->
            </ul>
            <div class="sidebar-footer">
                <div class="sidebar-footer-info">
                    <small class="text-muted">إصدار 2.1</small>
                    <br>
                    <small class="text-muted">© 2024 نظام الأرشيف</small>
                </div>
                <div class="sidebar-footer-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="toggleTheme()" title="تبديل المظهر">
                        <i class="fas fa-palette"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="showHelp()" title="المساعدة">
                        <i class="fas fa-question-circle"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(sidebar);

        // Add search functionality
        this.addSearchFunctionality();

        // Add menu toggle to navbar if it doesn't exist
        const navbar = document.querySelector('.navbar .container');
        if (navbar && !document.getElementById('menuToggle')) {
            const navbarBrand = navbar.querySelector('.navbar-brand');
            if (navbarBrand) {
                const menuButton = document.createElement('button');
                menuButton.className = 'menu-toggle me-3';
                menuButton.id = 'menuToggle';
                menuButton.title = 'تبديل القائمة';
                menuButton.innerHTML = '<i class="fas fa-bars"></i>';
                
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

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + S to toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.toggleSidebar();
            }
            // Escape to close sidebar on mobile
            if (e.key === 'Escape' && window.innerWidth <= 768) {
                this.hideSidebar();
            }
        });
    }

    addSearchFunctionality() {
        const searchInput = document.getElementById('sidebarSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterNavigation(e.target.value);
            });

            // Clear search on escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    this.filterNavigation('');
                }
            });
        }
    }

    filterNavigation(searchTerm) {
        const navItems = this.sidebarNav.querySelectorAll('.sidebar-nav-item');
        const searchTermLower = searchTerm.toLowerCase().trim();

        if (!searchTermLower) {
            // Show all items
            navItems.forEach(item => {
                item.style.display = '';
            });
            return;
        }

        navItems.forEach(item => {
            const link = item.querySelector('.sidebar-nav-link');
            const sectionTitle = item.querySelector('.sidebar-section-title');
            
            if (link) {
                const text = link.textContent.toLowerCase();
                const matches = text.includes(searchTermLower);
                item.style.display = matches ? '' : 'none';
                
                // Highlight matching text
                if (matches) {
                    const textNode = link.childNodes[link.childNodes.length - 1];
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        const originalText = textNode.textContent.trim();
                        const regex = new RegExp(`(${searchTermLower})`, 'gi');
                        if (originalText.match(regex)) {
                            const highlightedText = originalText.replace(regex, '<mark>$1</mark>');
                            const span = document.createElement('span');
                            span.innerHTML = highlightedText;
                            textNode.parentNode.replaceChild(span, textNode);
                        }
                    }
                }
            } else if (sectionTitle) {
                // Hide section headers when searching
                item.style.display = 'none';
            }
        });
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
                    
                    // ترتيب الفئات المحدث
                    const categoryOrder = ['main', 'files', 'users', 'tools', 'reports', 'admin', 'user'];
                    const categoryNames = {
                        main: 'الرئيسية',
                        files: 'إدارة الملفات',
                        users: 'إدارة المستخدمين',
                        tools: 'الأدوات والمرافق',
                        reports: 'التقارير والإحصائيات',
                        admin: 'إدارة النظام',
                        user: 'الحساب الشخصي'
                    };

                    const categoryIcons = {
                        main: 'home',
                        files: 'folder-open',
                        users: 'users-cog',
                        tools: 'tools',
                        reports: 'chart-line',
                        admin: 'cogs',
                        user: 'user-circle'
                    };

                    categoryOrder.forEach(categoryKey => {
                        const pages = availablePages[categoryKey];
                        if (!pages || pages.length === 0) return;

                        if (categoryKey !== 'main') {
                            navigationHTML += `
                                <li class="sidebar-nav-item sidebar-nav-divider">
                                    <hr class="my-2">
                                </li>
                                <li class="sidebar-nav-item sidebar-nav-section">
                                    <span class="sidebar-section-title">
                                        <i class="fas fa-${categoryIcons[categoryKey]} me-2"></i>
                                        ${categoryNames[categoryKey]}
                                        <span class="sidebar-section-count">${pages.length}</span>
                                    </span>
                                </li>
                            `;
                        }

                        pages.forEach(page => {
                            const isActive = this.isActivePage([page.path]);
                            const hasNotification = this.checkPageNotification(page.path);
                            
                            navigationHTML += `
                                <li class="sidebar-nav-item">
                                    <a href="${page.path}" 
                                       class="sidebar-nav-link ${isActive ? 'active' : ''}" 
                                       title="${page.description || ''}"
                                       data-page="${page.path}">
                                        <i class="${page.icon}"></i>
                                        <span class="nav-text">${page.name}</span>
                                        ${hasNotification ? '<span class="sidebar-notification-dot"></span>' : ''}
                                        ${isActive ? '<i class="fas fa-chevron-left nav-arrow"></i>' : ''}
                                    </a>
                                </li>
                            `;
                        });
                    });
                } else {
                    // استخدام القائمة الافتراضية المحسنة إذا لم يتم تحميل الصلاحيات
                    navigationHTML += this.getEnhancedDefaultNavigation(userRole);
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

    addNavigationEvents() {
        // إضافة أحداث للروابط الجديدة
        const navLinks = this.sidebarNav?.querySelectorAll('.sidebar-nav-link');
        if (navLinks) {
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    // إغلاق القائمة الجانبية عند النقر على رابط في الهواتف
                    if (window.innerWidth <= 768) {
                        this.hideSidebar();
                    }
                    
                    // تسجيل النشاط إذا كان متوفراً
                    if (window.activityLogger) {
                        const pageName = link.textContent?.trim();
                        window.activityLogger.log('navigation', 'page_visit', {
                            page: link.getAttribute('href'),
                            page_name: pageName
                        });
                    }
                });
            });
        }

        // إضافة أحداث للأقسام القابلة للطي
        const sectionTitles = this.sidebarNav?.querySelectorAll('.sidebar-section-title');
        if (sectionTitles) {
            sectionTitles.forEach(title => {
                title.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = title.closest('.sidebar-nav-section');
                    if (section) {
                        section.classList.toggle('collapsed');
                        
                        // حفظ حالة القسم
                        const sectionName = title.textContent?.trim();
                        if (sectionName) {
                            const isCollapsed = section.classList.contains('collapsed');
                            localStorage.setItem(`sidebar_section_${sectionName}`, isCollapsed);
                        }
                    }
                });
            });
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
        if (this.isAdminRole(userRole)) {
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

    checkPageNotification(pagePath) {
        // تحقق من وجود إشعارات للصفحة
        const notifications = {
            'user-management.html': localStorage.getItem('pending_users_count') > 0,
            'upload.html': localStorage.getItem('upload_errors') > 0,
            'reports.html': localStorage.getItem('new_reports') === 'true'
        };
        
        return notifications[pagePath] || false;
    }

    getEnhancedDefaultNavigation(userRole) {
        const isAdmin = this.isAdminRole(userRole);
        const isArchiveOfficer = this.isArchiveRole(userRole);
        
        let defaultNav = `
            <!-- الصفحات الرئيسية -->
            <li class="sidebar-nav-item">
                <a href="index.html" class="sidebar-nav-link ${this.isActivePage(['index.html', '/']) ? 'active' : ''}">
                    <i class="fas fa-home"></i>
                    <span class="nav-text">الصفحة الرئيسية</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="dashboard.html" class="sidebar-nav-link ${this.isActivePage(['dashboard.html']) ? 'active' : ''}">
                    <i class="fas fa-tachometer-alt"></i>
                    <span class="nav-text">لوحة التحكم</span>
                </a>
            </li>
            
            <!-- إدارة الملفات -->
            <li class="sidebar-nav-item sidebar-nav-divider">
                <hr class="my-2">
            </li>
            <li class="sidebar-nav-item sidebar-nav-section">
                <span class="sidebar-section-title">
                    <i class="fas fa-folder-open me-2"></i>
                    إدارة الملفات
                </span>
            </li>
            <li class="sidebar-nav-item">
                <a href="files.html" class="sidebar-nav-link ${this.isActivePage(['files.html']) ? 'active' : ''}">
                    <i class="fas fa-file-alt"></i>
                    <span class="nav-text">استعراض الملفات</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="upload.html" class="sidebar-nav-link ${this.isActivePage(['upload.html']) ? 'active' : ''}">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span class="nav-text">رفع الملفات</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="search.html" class="sidebar-nav-link ${this.isActivePage(['search.html']) ? 'active' : ''}">
                    <i class="fas fa-search"></i>
                    <span class="nav-text">البحث المتقدم</span>
                </a>
            </li>
        `;

        if (isArchiveOfficer) {
            defaultNav += `
                <li class="sidebar-nav-item">
                    <a href="bulk-upload.html" class="sidebar-nav-link ${this.isActivePage(['bulk-upload.html']) ? 'active' : ''}">
                        <i class="fas fa-upload"></i>
                        <span class="nav-text">الرفع المجمع</span>
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="file-movements.html" class="sidebar-nav-link ${this.isActivePage(['file-movements.html']) ? 'active' : ''}">
                        <i class="fas fa-exchange-alt"></i>
                        <span class="nav-text">حركة الملفات</span>
                    </a>
                </li>
            `;
        }

        if (isAdmin) {
            defaultNav += `
                <!-- إدارة المستخدمين -->
                <li class="sidebar-nav-item sidebar-nav-divider">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item sidebar-nav-section">
                    <span class="sidebar-section-title">
                        <i class="fas fa-users-cog me-2"></i>
                        إدارة المستخدمين
                    </span>
                </li>
                <li class="sidebar-nav-item">
                    <a href="users.html" class="sidebar-nav-link ${this.isActivePage(['users.html']) ? 'active' : ''}">
                        <i class="fas fa-users"></i>
                        <span class="nav-text">المستخدمين</span>
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="user-management.html" class="sidebar-nav-link ${this.isActivePage(['user-management.html']) ? 'active' : ''}">
                        <i class="fas fa-user-cog"></i>
                        <span class="nav-text">إدارة المستخدمين</span>
                        ${this.checkPageNotification('user-management.html') ? '<span class="sidebar-notification-dot"></span>' : ''}
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="departments.html" class="sidebar-nav-link ${this.isActivePage(['departments.html']) ? 'active' : ''}">
                        <i class="fas fa-building"></i>
                        <span class="nav-text">الإدارات</span>
                    </a>
                </li>
            `;
        }

        defaultNav += `
            <!-- الأدوات والمرافق -->
            <li class="sidebar-nav-item sidebar-nav-divider">
                <hr class="my-2">
            </li>
            <li class="sidebar-nav-item sidebar-nav-section">
                <span class="sidebar-section-title">
                    <i class="fas fa-tools me-2"></i>
                    الأدوات والمرافق
                </span>
            </li>
            <li class="sidebar-nav-item">
                <a href="barcode-scanner.html" class="sidebar-nav-link ${this.isActivePage(['barcode-scanner.html']) ? 'active' : ''}">
                    <i class="fas fa-qrcode"></i>
                    <span class="nav-text">مسح الباركود</span>
                </a>
            </li>
            <li class="sidebar-nav-item">
                <a href="file-tracking.html" class="sidebar-nav-link ${this.isActivePage(['file-tracking.html']) ? 'active' : ''}">
                    <i class="fas fa-route"></i>
                    <span class="nav-text">تتبع الملفات</span>
                </a>
            </li>
        `;

        if (isArchiveOfficer) {
            defaultNav += `
                <!-- التقارير والإحصائيات -->
                <li class="sidebar-nav-item sidebar-nav-divider">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item sidebar-nav-section">
                    <span class="sidebar-section-title">
                        <i class="fas fa-chart-line me-2"></i>
                        التقارير والإحصائيات
                    </span>
                </li>
                <li class="sidebar-nav-item">
                    <a href="reports.html" class="sidebar-nav-link ${this.isActivePage(['reports.html']) ? 'active' : ''}">
                        <i class="fas fa-chart-bar"></i>
                        <span class="nav-text">التقارير</span>
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="analytics.html" class="sidebar-nav-link ${this.isActivePage(['analytics.html']) ? 'active' : ''}">
                        <i class="fas fa-analytics"></i>
                        <span class="nav-text">التحليلات</span>
                    </a>
                </li>
            `;
        }

        if (isAdmin) {
            defaultNav += `
                <!-- إدارة النظام -->
                <li class="sidebar-nav-item sidebar-nav-divider">
                    <hr class="my-2">
                </li>
                <li class="sidebar-nav-item sidebar-nav-section">
                    <span class="sidebar-section-title">
                        <i class="fas fa-cogs me-2"></i>
                        إدارة النظام
                    </span>
                </li>
                <li class="sidebar-nav-item">
                    <a href="system-settings.html" class="sidebar-nav-link ${this.isActivePage(['system-settings.html']) ? 'active' : ''}">
                        <i class="fas fa-cog"></i>
                        <span class="nav-text">إعدادات النظام</span>
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="backup.html" class="sidebar-nav-link ${this.isActivePage(['backup.html']) ? 'active' : ''}">
                        <i class="fas fa-database"></i>
                        <span class="nav-text">النسخ الاحتياطي</span>
                    </a>
                </li>
                <li class="sidebar-nav-item">
                    <a href="activity-logs.html" class="sidebar-nav-link ${this.isActivePage(['activity-logs.html']) ? 'active' : ''}">
                        <i class="fas fa-history"></i>
                        <span class="nav-text">سجل الأنشطة</span>
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

// Export SidebarManager to window for global access
window.SidebarManager = SidebarManager;

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (!window.sidebarManager) {
            window.sidebarManager = new SidebarManager();
            console.log('✅ تم تهيئة SidebarManager بنجاح');
        }
    } catch (e) {
        console.error('SidebarManager initialization failed', e);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarManager;
}

}
