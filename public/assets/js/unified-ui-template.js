/**
 * Unified UI Template System
 * نظام قالب واجهة المستخدم الموحد
 * - Sidebar ثابتة على سطح المكتب (تظهر دائمًا)
 * - قائمة شاملة تحتوي على أغلب شاشات النظام
 * - شريط علوي موحد يتفاعل مع حالة المصادقة
 */
(function () {
    class UnifiedUITemplate {
        constructor() {
            this.currentPage = this.getCurrentPageName();
            this.userInfo = null;
            this.init();
        }

        getCurrentPageName() {
            const page = (window.location.pathname.split('/').pop() || 'index.html');
            return page.replace('.html', '') || 'index';
        }

        async init() {
            try {
                await this.loadUserInfo();
                this.renderNavbar();
                this.renderSidebar();
                this.enforcePageAccessGuard();
                this.setupEventListeners();
                this.bindAuthEvents();
                this.applyConsistentStyling();
                this.setupFixedSidebarMode();
                window.addEventListener('resize', () => this.setupFixedSidebarMode());
            } catch (error) {
                console.error('خطأ في تهيئة واجهة المستخدم الموحدة:', error);
            }
        }

        async loadUserInfo(forceRefresh = false) {
            try {
                let uid = null, email = null, displayName = null, role = null, department = null;
                // استخدم unifiedAuth إن توفر
                if (window.unifiedAuth) {
                    const ua = window.unifiedAuth;
                    if (ua.currentUser || ua.user) {
                        const u = ua.currentUser || ua.user;
                        uid = u.uid; email = u.email; displayName = u.displayName || u.email;

                        // Force refresh profile/token in sensitive guards to avoid stale role reads.
                        if (forceRefresh) {
                            try {
                                if (typeof u.getIdToken === 'function') {
                                    await u.getIdToken(true);
                                }
                            } catch (_) {}
                            try {
                                if (typeof ua.loadUserProfile === 'function' && uid) {
                                    await ua.loadUserProfile(uid);
                                }
                            } catch (_) {}
                        }
                    }
                    // Do not trust early defaults (viewer/عام) before profile is hydrated.
                    const hasHydratedProfile = !!(ua.userProfile || ua.profile);
                    if (hasHydratedProfile) {
                        role = ua.userRole || role;
                        department = ua.userDepartment || department;
                    }
                }

                // Fallback: read role/department from unifiedAuth current user token claims.
                if ((!role || role === 'viewer' || !department || department === 'عام') && window.unifiedAuth && (window.unifiedAuth.currentUser || window.unifiedAuth.user)) {
                    try {
                        const u = window.unifiedAuth.currentUser || window.unifiedAuth.user;
                        if (u && typeof u.getIdTokenResult === 'function') {
                            const token = await u.getIdTokenResult(forceRefresh === true);
                            uid = uid || u.uid;
                            email = email || u.email;
                            displayName = displayName || u.displayName || u.email;
                            role = role || (token && token.claims ? token.claims.role : null);
                            department = department || (token && token.claims ? token.claims.department : null);
                        }
                    } catch (_) {}
                }

                // Fallback: read role/department from auth token claims when profile is not ready yet.
                if ((!role || role === 'viewer' || !department || department === 'عام') && window.firebase && firebase.auth && typeof firebase.auth === 'function') {
                    try {
                        const authUser = firebase.auth().currentUser;
                        if (authUser) {
                            uid = uid || authUser.uid;
                            email = email || authUser.email;
                            displayName = displayName || authUser.displayName || authUser.email;
                            const token = await authUser.getIdTokenResult();
                            role = role || (token && token.claims ? token.claims.role : null);
                            department = department || (token && token.claims ? token.claims.department : null);
                        }
                    } catch (_) {}
                }

                // Last fallback: read role/department from Firestore users/{uid} directly.
                if ((uid && !role) && window.firebase && firebase.firestore && firebase.apps && firebase.apps.length) {
                    try {
                        const app = firebase.apps[0];
                        const snap = await app.firestore().collection('users').doc(uid).get();
                        if (snap.exists) {
                            const data = snap.data() || {};
                            role = role || data.role || null;
                            department = department || data.department || data.departmentId || null;
                        }
                    } catch (_) {}
                }

                // لا تعتمد على firebase.auth هنا لتجنب استدعاء مبكر قبل تهيئة التطبيق.
                if (uid) {
                    this.userInfo = { uid, email, displayName, role: role || '', department: department || '' };
                    await this.loadUserOverrides();
                } else {
                    this.userInfo = null;
                }
            } catch (e) {
                console.warn('loadUserInfo failed:', e);
            }
        }

        async loadUserOverrides() {
            try {
                if (!this.userInfo || !this.userInfo.uid) return;
                window.__userPagePermissionsCache = window.__userPagePermissionsCache || {};
                if (window.__userPagePermissionsCache[this.userInfo.uid]) return;
                if (!window.firebase || !firebase.firestore || !firebase.apps || !firebase.apps.length) return;
                const app = firebase.apps[0];
                const doc = await app.firestore().collection('user_page_permissions').doc(this.userInfo.uid).get();
                if (doc.exists) {
                    const data = doc.data() || {};
                    window.__userPagePermissionsCache[this.userInfo.uid] = {
                        pages: data.pages || {},
                        updatedAt: data.updatedAt || null,
                        updatedBy: data.updatedBy || null
                    };
                } else {
                    window.__userPagePermissionsCache[this.userInfo.uid] = { pages: {} };
                }
            } catch (e) {
                console.warn('⚠️ تعذر تحميل صلاحيات المستخدم (Overrides):', e && (e.message || e));
            }
        }

        renderNavbar() {
            // أنشئ شريط علوي بسيط موحد إن لم يوجد
            // إزالة أي أشرطة علوية موجودة مسبقًا من الصفحات لمنع التكرار
            try {
                const navbars = document.querySelectorAll('nav.navbar');
                navbars.forEach(el => {
                    if (el.id !== 'unified-navbar') {
                        // لا تحتفظ إلا بالشريط الموحد
                        el.parentNode && el.parentNode.removeChild(el);
                    }
                });
            } catch (_) { /* ignore */ }

            let nav = document.getElementById('unified-navbar');
            if (!nav) {
                nav = document.createElement('nav');
                nav.id = 'unified-navbar';
                nav.className = 'navbar';
                document.body.insertBefore(nav, document.body.firstChild);
            }
            const showMenuToggle = !(window.__HIDE_SIDEBAR__ || window.__LANDING_PAGE__);
            const brandHTML = `
                <a href="index.html" class="navbar-brand">
                    <i class="fas fa-archive me-2"></i> نظام الأرشيف
                </a>`;
            const rightControls = this.userInfo ? `
                <div class="d-flex align-items-center gap-2">
                    <span class="navbar-text me-3" id="userInfo">${this.getUserDisplayText()}</span>
                    <button class="btn btn-outline-danger btn-sm" onclick="logout()">
                        <i class="fas fa-sign-out-alt me-1"></i> خروج
                    </button>
                </div>
            ` : `
                <div class="d-flex align-items-center">
                    <a class="btn btn-outline-primary btn-sm me-2" href="login.html">
                        <i class="fas fa-sign-in-alt me-1"></i> تسجيل الدخول
                    </a>
                    <a class="btn btn-primary btn-sm" href="register.html">
                        <i class="fas fa-user-plus me-1"></i> إنشاء حساب
                    </a>
                </div>
            `;
            nav.innerHTML = `
                <div class="container">
                    <div class="d-flex align-items-center">
                        ${showMenuToggle ? '<button class="menu-toggle me-3" id="menuToggle" title="فتح القائمة"><i class="fas fa-bars"></i></button>' : ''}
                        ${brandHTML}
                    </div>
                    <div class="navbar-nav ms-auto">
                        ${rightControls}
                    </div>
                </div>
            `;
        }

        renderSidebar() {
            if (window.__HIDE_SIDEBAR__ || window.__LANDING_PAGE__) {
                document.body.classList.remove('with-fixed-sidebar', 'sidebar-open');
                const existing = document.getElementById('sidebar');
                if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
                const overlayEl = document.querySelector('.sidebar-overlay');
                if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
                return;
            }
            let sidebar = document.querySelector('#sidebar');
            if (!sidebar) sidebar = this.createSidebarElement();
            const sidebarItems = this.filterSidebarItems(this.getSidebarItems());
            sidebar.innerHTML = `
                <div class="sidebar-header">
                    <div class="d-flex align-items-center">
                        <div class="logo me-3"><i class="fas fa-archive"></i></div>
                        <div>
                            <h5 class="mb-0">نظام الأرشيف</h5>
                            <small class="text-muted">إدارة الوثائق المتطورة</small>
                        </div>
                    </div>
                    <button class="sidebar-close" id="sidebarClose" title="إغلاق القائمة"><i class="fas fa-times"></i></button>
                </div>
                <div class="user-info" id="sidebarUserInfo">${this.getUserInfoSection()}</div>
                <nav class="sidebar-nav" id="sidebarNav">${sidebarItems.map(item => this.renderSidebarItem(item)).join('')}</nav>
                <div class="sidebar-footer"><div class="text-center text-muted"><small>نظام الأرشيف v2.1</small></div></div>
            `;
            if (!document.querySelector('.sidebar-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.id = 'sidebarOverlay';
                document.body.appendChild(overlay);
            }
        }

        createSidebarElement() {
            const sidebar = document.createElement('aside');
            sidebar.id = 'sidebar';
            sidebar.className = 'sidebar';
            try { sidebar.setAttribute('aria-hidden', 'true'); } catch (_) {}
            document.body.appendChild(sidebar);
            return sidebar;
        }

        getSidebarItems() {
            return [
                { icon: 'fas fa-home', title: 'الصفحة الرئيسية', href: 'index.html', page: 'index' },
                { icon: 'fas fa-tachometer-alt', title: 'لوحة التحكم', href: 'dashboard.html', page: 'dashboard' },
                { separator: true, title: 'لوحات الإدارات' },
                { icon: 'fas fa-archive', title: 'إدارة الأرشيف', href: 'archive-dashboard.html', page: 'archive-dashboard', departments: ['archive'] },
                { icon: 'fas fa-balance-scale', title: 'الشؤون القانونية', href: 'legal-dashboard.html', page: 'legal-dashboard', departments: ['legal'] },
                { icon: 'fas fa-money-bill-wave', title: 'التحصيل', href: 'collection-dashboard.html', page: 'collection-dashboard', departments: ['collection'] },
                { icon: 'fas fa-laptop-code', title: 'تقنية المعلومات', href: 'it-dashboard.html', page: 'it-dashboard', departments: ['it'] },
                { icon: 'fas fa-shield-alt', title: 'الحوكمة والامتثال', href: 'governance-dashboard.html', page: 'governance-dashboard', departments: ['governance'] },
                { icon: 'fas fa-coins', title: 'التوريق', href: 'securitization-dashboard.html', page: 'securitization-dashboard', departments: ['securitization'] },
                { separator: true, title: 'العمليات' },
                { icon: 'fas fa-folder-open', title: 'إدارة الملفات', href: 'file-management-dashboard.html', page: 'file-management-dashboard' },
                { icon: 'fas fa-address-book', title: 'ملفات العملاء', href: 'client-files.html', page: 'client-files' },
                { icon: 'fas fa-file-upload', title: 'رفع الملفات', href: 'upload.html', page: 'upload' },
                { icon: 'fas fa-search', title: 'البحث', href: 'search.html', page: 'search' },
                { icon: 'fas fa-qrcode', title: 'ماسح الباركود', href: 'scanner.html', page: 'scanner' },
                { icon: 'fas fa-route', title: 'تتبع الملفات', href: 'file-tracking.html', page: 'file-tracking' },
                { icon: 'fas fa-chart-line', title: 'تقارير الحركة', href: 'movement-reports.html', page: 'movement-reports' },
                { icon: 'fas fa-history', title: 'سجل العمليات', href: 'activity-logs.html', page: 'activity-logs' },
                { separator: true, title: 'الإدارة' },
                { icon: 'fas fa-users-cog', title: 'إدارة المستخدمين', href: 'user-management.html', page: 'user-management', requiresAdmin: true },
                { icon: 'fas fa-users', title: 'قائمة المستخدمين', href: 'users.html', page: 'users' },
                { icon: 'fas fa-envelope-open-text', title: 'الدعوات', href: 'invitations.html', page: 'invitations' },
                { icon: 'fas fa-bell', title: 'إعدادات الإشعارات', href: 'notification-settings.html', page: 'notification-settings' },
                { icon: 'fas fa-cog', title: 'إدارة النظام', href: 'admin-management.html', page: 'admin-management', requiresAdmin: true },
                { icon: 'fas fa-chart-bar', title: 'إحصائيات النظام', href: 'system-analytics.html', page: 'system-analytics', requiresAdmin: true },
                { icon: 'fas fa-vial', title: 'Smoke Matrix', href: 'admin-access-smoke.html', page: 'admin-access-smoke', requiresSuperAdmin: true }
            ];
        }

        isStrictSuperAdminRole(rawRole) {
            if (!rawRole) return false;
            const normalized = String(rawRole).trim().toLowerCase().replace(/\s+/g, '_');
            return normalized === 'super_admin' || normalized === 'system_admin';
        }

        isAdminRole(role) {
            const normalizedRole = this.normalizeRole(role);
            return normalizedRole === 'admin';
        }

        filterSidebarItems(items) {
            try {
                if (window.__DISABLE_SIDEBAR_FILTER__) return items;
                if (!this.userInfo) return items;
                const uid = this.userInfo.uid;
                const role = this.normalizeRole(this.userInfo.role || '');
                const strictSuperAdmin = this.isStrictSuperAdminRole(this.userInfo.role || '');
                const department = this.normalizeDepartment(this.userInfo.department || '');
                if (this.isAdminRole(role)) {
                    return items.filter(item => !(item && item.requiresSuperAdmin) || strictSuperAdmin);
                }
                const externalConfig = window.__DEPT_SIDEBAR_CONFIG__ || null;
                const userOverrides = (window.__userPagePermissionsCache && window.__userPagePermissionsCache[uid]) || { pages: {} };
                const userPages = userOverrides.pages || {};
                const hasUserWhitelist = Object.keys(userPages).length > 0;

                return items.filter(item => {
                    if (item.separator) return true;
                    if (item.requiresAdmin && !this.isAdminRole(role)) return false;
                    if (item.requiresSuperAdmin && !strictSuperAdmin) return false;
                    const pageKey = item.page ? this.mapPageAlias(item.page) : null;
                    const eqKeys = pageKey ? this.getEquivalentPageKeys(pageKey) : [];
                    if (hasUserWhitelist) {
                        if (!pageKey) return false;
                        return eqKeys.some(k => !!userPages[k]);
                    }
                    if (Array.isArray(item.departments) && item.departments.length > 0) {
                        if (!item.departments.includes(department)) return false;
                    }
                    if (externalConfig && externalConfig[department] && pageKey) {
                        const allowList = externalConfig[department];
                        if (Array.isArray(allowList) && !eqKeys.some(k => allowList.includes(k))) return false;
                    }
                    if (pageKey && typeof window.hasPagePermissionUnifiedSync === 'function') {
                        try {
                            const allowed = window.hasPagePermissionUnifiedSync(pageKey, role, department, uid);
                            if (allowed === false) return false;
                        } catch (_) {}
                    }
                    return true;
                });
            } catch (e) {
                console.warn('⚠️ فشل التصفية حسب الإدارة/المستخدم، سيتم عرض القائمة كاملة:', e);
                return items;
            }
        }

        isPublicPage(pageId) {
            const p = (pageId || this.currentPage || '').toLowerCase();
            const publicPages = new Set(['index', 'login', 'register', 'forgot-password', 'terms', 'privacy', 'contact', 'access-denied']);
            return publicPages.has(p);
        }

        canAccessPage(pageId) {
            try {
                if (window.__DISABLE_SIDEBAR_FILTER__) return true;
                const pageKey = this.mapPageAlias(pageId);
                const eqKeys = this.getEquivalentPageKeys(pageKey);
                if (this.isPublicPage(pageKey)) return true;
                if (!this.userInfo) return false;
                const role = this.normalizeRole(this.userInfo.role || '');
                const strictSuperAdmin = this.isStrictSuperAdminRole(this.userInfo.role || '');
                const department = this.normalizeDepartment(this.userInfo.department || '');
                const items = this.getSidebarItems();
                const item = items.find(i => i.page === pageKey);
                if (item && item.requiresSuperAdmin && !strictSuperAdmin) return false;
                if (this.isAdminRole(role)) return true;
                if (item && item.requiresAdmin && !this.isAdminRole(role)) return false;
                const uid = this.userInfo.uid;
                const userOverrides = (window.__userPagePermissionsCache && window.__userPagePermissionsCache[uid]) || { pages: {} };
                const userPages = userOverrides.pages || {};
                const hasUserWhitelist = Object.keys(userPages).length > 0;
                if (hasUserWhitelist) {
                    return eqKeys.some(k => !!userPages[k]);
                }
                if (item && Array.isArray(item.departments) && item.departments.length > 0) {
                    if (!item.departments.includes(department)) return false;
                }
                const externalConfig = window.__DEPT_SIDEBAR_CONFIG__ || null;
                if (externalConfig && externalConfig[department]) {
                    const allowList = externalConfig[department];
                    if (Array.isArray(allowList) && pageKey) {
                        if (!eqKeys.some(k => allowList.includes(k))) return false;
                    }
                }
                if (typeof window.hasPagePermissionUnifiedSync === 'function' && pageKey) {
                    try {
                        const allowed = window.hasPagePermissionUnifiedSync(pageKey, role, department, this.userInfo.uid);
                        if (allowed === false) return false;
                    } catch (_) {}
                }
                return true;
            } catch (e) {
                console.warn('canAccessPage() فشل، سيتم السماح افتراضيًا:', e);
                return true;
            }
        }

        async enforcePageAccessGuard() {
            try {
                if (window.__ALLOW_GUEST_ACCESS__) return;
                if (window.__PAGE_ACCESS_ENFORCED__) return;
                window.__PAGE_ACCESS_ENFORCED__ = true;
                const pageKey = this.mapPageAlias(this.currentPage);
                if (this.isPublicPage(pageKey)) return;
                const ADMIN_GUARD_PAGES = new Set([
                    'user-management',
                    'admin-management',
                    'page-permissions',
                    'admin-access-smoke',
                    'invitations',
                    'department-management'
                ]);
                // Deep wait pages: pages known to load auth/profile slower due to additional modules
                const DEEP_WAIT_PAGES = new Set(['storage-management','classification','archive-reports']);
                const isDeepWait = DEEP_WAIT_PAGES.has(pageKey);
                const redirectToLogin = () => {
                    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `login.html?redirect=${redirect}`;
                };
                if (!this.userInfo) {
                    try {
                        const maybeAuth = window.auth || null;
                        // Base delay plus deep-wait multiplier for selected pages
                        const baseDelay = window.__ACCESS_GUARD_DELAY_MS__ || 4000;
                        const guardDelayMs = isDeepWait ? baseDelay + 4000 : baseDelay; // extend for deep pages

                        if (maybeAuth || document) {
                            const userPresent = await new Promise((resolve) => {
                                let settled = false;
                                const finish = (present) => { if (settled) return; settled = true; try { clearTimeout(timeout); } catch (_) {} try { unsub && unsub(); } catch (_) {} resolve(!!present); };
                                const timeout = setTimeout(() => finish(false), guardDelayMs);
                                let unsub = null;
                                try {
                                    if (maybeAuth && typeof maybeAuth.onAuthStateChanged === 'function') {
                                        unsub = maybeAuth.onAuthStateChanged((u) => finish(!!u));
                                    }
                                } catch (_) {}
                                try {
                                    window.addEventListener('firebaseAuthReady', () => {
                                        const hasUser = !!(window.unifiedAuth && (window.unifiedAuth.currentUser || window.unifiedAuth.user));
                                        finish(hasUser);
                                    }, { once: true });
                                } catch (_) {}
                            });

                            if (userPresent) {
                                await this.loadUserInfo();
                            } else {
                                // Progressive backoff retries before redirect (especially for deep pages)
                                const extraAttempts = isDeepWait ? 4 : 2;
                                let attempt = 0;
                                while (attempt < extraAttempts && !this.userInfo) {
                                    attempt++;
                                    await new Promise(r => setTimeout(r, 500 + attempt * 250));
                                    try { await this.loadUserInfo(); } catch(_) {}
                                    if (this.userInfo && this.userInfo.uid) break;
                                }
                                if (!this.userInfo) {
                                    redirectToLogin();
                                    return;
                                }
                            }
                        } else {
                            redirectToLogin();
                            return;
                        }
                    } catch (_) {
                        redirectToLogin();
                        return;
                    }
                }
                try {
                    if (this.userInfo && this.userInfo.uid) {
                        window.__userPagePermissionsCache = window.__userPagePermissionsCache || {};
                        if (!window.__userPagePermissionsCache[this.userInfo.uid]) {
                            await this.loadUserOverrides();
                        }
                    }
                } catch (_) {}
                // Avoid premature deny while role/profile is still loading.
                const unresolvedRole = this.userInfo && this.userInfo.uid && (!this.userInfo.role || this.userInfo.role === 'user' || this.userInfo.role === 'viewer');
                if (unresolvedRole) {
                    const enrichAttempts = [450, 700, 1000];
                    for (const waitMs of enrichAttempts) {
                        await new Promise(r => setTimeout(r, waitMs));
                        await this.loadUserInfo();
                        if (this.userInfo && this.userInfo.role && this.userInfo.role !== 'user' && this.userInfo.role !== 'viewer') {
                            break;
                        }
                    }

                    if (!this.userInfo || !this.userInfo.role || this.userInfo.role === 'user' || this.userInfo.role === 'viewer') {
                        window.__PAGE_ACCESS_ENFORCED__ = false;
                        setTimeout(() => this.enforcePageAccessGuard(), 1200);
                        return;
                    }
                }

                let allowed = this.canAccessPage(pageKey);
                if (!allowed && this.userInfo && (!this.userInfo.role || !this.userInfo.department)) {
                    // Additional staged waits for deep pages to allow profile enrichment
                    const adjustAttempts = isDeepWait ? [700, 900, 1200] : [700];
                    for (const waitMs of adjustAttempts) {
                        await new Promise(r => setTimeout(r, waitMs));
                        await this.loadUserInfo(true);
                        allowed = this.canAccessPage(pageKey);
                        if (allowed) break;
                    }
                }

                // Admin pages are sensitive to stale profile races; force-refresh before final deny.
                if (!allowed && ADMIN_GUARD_PAGES.has(pageKey)) {
                    const retries = [350, 650, 1000];
                    for (const waitMs of retries) {
                        await new Promise(r => setTimeout(r, waitMs));
                        await this.loadUserInfo(true);
                        try {
                            if (this.userInfo && this.userInfo.uid) {
                                window.__userPagePermissionsCache = window.__userPagePermissionsCache || {};
                                delete window.__userPagePermissionsCache[this.userInfo.uid];
                                await this.loadUserOverrides();
                            }
                        } catch (_) {}
                        allowed = this.canAccessPage(pageKey);
                        if (allowed) break;
                    }
                }
                if (!allowed) {
                    const from = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.replace(`access-denied.html?from=${from}&page=${encodeURIComponent(pageKey)}`);
                }
            } catch (e) {
                console.warn('enforcePageAccessGuard() تعذر التنفيذ:', e);
            }
        }

        mapPageAlias(pageId) {
            if (!pageId) return pageId;
            const aliases = { 'file-management-dashboard': 'file-management' };
            return aliases[pageId] || pageId;
        }

        getEquivalentPageKeys(pageId) {
            if (!pageId) return [];
            const keys = new Set();
            const pid = pageId;
            keys.add(pid);
            if (pid.endsWith('-dashboard')) {
                keys.add(pid.replace(/-dashboard$/, ''));
            } else {
                keys.add(`${pid}-dashboard`);
            }
            const pairs = [
                ['file-management-dashboard', 'file-management'],
                ['archive-dashboard', 'archive'],
                ['legal-dashboard', 'legal'],
                ['collection-dashboard', 'collection'],
                ['governance-dashboard', 'governance'],
                ['securitization-dashboard', 'securitization']
            ];
            pairs.forEach(([a, b]) => { if (pid === a) keys.add(b); if (pid === b) keys.add(a); });
            return Array.from(keys);
        }

        normalizeDepartment(dep) {
            if (!dep) return dep;
            const map = {
                'ارشيف': 'archive', 'الأرشيف': 'archive', 'الأرشيفية': 'archive',
                'قانونية': 'legal', 'الشؤون القانونية': 'legal',
                'تحصيل': 'collection', 'التحصيل': 'collection',
                'حوكمة': 'governance', 'الحوكمة': 'governance', 'الامتثال': 'governance',
                'تقنية المعلومات': 'it', 'تكنولوجيا المعلومات': 'it', 'IT': 'it',
                'توريق': 'securitization', 'التوريق': 'securitization'
            };
            try { const cleaned = dep.trim().toLowerCase(); return map[dep] || map[cleaned] || dep; } catch (_) { return dep; }
        }

        normalizeRole(role) {
            if (!role) return 'viewer';
            const cleaned = String(role).trim().toLowerCase().replace(/\s+/g, '_');
            const map = {
                admin: 'admin',
                system_admin: 'admin',
                super_admin: 'admin',
                department_admin: 'department_admin',
                'department-admin': 'department_admin',
                manager: 'department_admin',
                supervisor: 'supervisor',
                user: 'employee',
                employee: 'employee',
                archive_officer: 'employee',
                'archive-officer': 'employee',
                viewer: 'viewer'
            };
            return map[cleaned] || cleaned;
        }

        renderSidebarItem(item) {
            if (item.separator) return `<div class="sidebar-separator"><span>${item.title}</span></div>`;
            const isActive = item.page === this.currentPage;
            const colorStyle = item.color ? `style="--item-color: ${item.color}"` : '';
            return `
                <a href="${item.href}" class="sidebar-item${isActive ? ' active' : ''}" ${colorStyle}>
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }

        getUserDisplayText() {
            if (!this.userInfo) return '';
            return `<i class="fas fa-user me-1"></i>${this.userInfo.displayName || this.userInfo.email || 'مستخدم'}`;
        }

        getUserInfoSection() {
            if (!this.userInfo) {
                return `
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-3" id="userAvatar"><i class="fas fa-user"></i></div>
                            <div>
                                <div class="user-name" id="userName">زائر</div>
                                <div class="user-role" id="userRole">غير مسجل</div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <a class="btn btn-outline-primary btn-sm" href="login.html"><i class="fas fa-sign-in-alt"></i> دخول</a>
                            <a class="btn btn-primary btn-sm" href="register.html"><i class="fas fa-user-plus"></i> تسجيل</a>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-3" id="userAvatar"><i class="fas fa-user"></i></div>
                    <div>
                        <div class="user-name" id="userName">${this.userInfo.displayName || 'مستخدم'}</div>
                        <div class="user-role" id="userRole">${this.getRoleText(this.userInfo.role)}</div>
                    </div>
                </div>
            `;
        }

        getRoleText(role) {
            const normalizedRole = this.normalizeRole(role);
            const roleTexts = {
                admin: 'مدير النظام',
                department_admin: 'مدير إدارة',
                supervisor: 'مشرف',
                employee: 'موظف',
                viewer: 'مشاهد'
            };
            return roleTexts[normalizedRole] || 'مستخدم';
        }

        setupEventListeners() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('#menuToggle')) this.toggleSidebar();
                if (e.target.closest('#sidebarClose')) this.closeSidebar();
                if (e.target.closest('.sidebar-overlay')) this.closeSidebar();
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeSidebar(); });
        }

        bindAuthEvents() {
            try {
                if (window.unifiedAuth && typeof window.unifiedAuth.onAuthStateChange === 'function') {
                    window.unifiedAuth.onAuthStateChange(async (state, user) => {
                        if (state === 'login' && user) { await this.loadUserInfo(); }
                        else if (state === 'logout') { this.userInfo = null; }
                        this.renderNavbar(); this.renderSidebar(); this.enforcePageAccessGuard();
                    });
                }
                window.addEventListener('unifiedAuthReady', async () => { await this.loadUserInfo(); this.renderNavbar(); this.renderSidebar(); this.enforcePageAccessGuard(); });
                window.addEventListener('userAuthenticated', async () => { await this.loadUserInfo(); this.renderNavbar(); this.renderSidebar(); this.enforcePageAccessGuard(); });
                window.addEventListener('userSignedOut', () => { this.userInfo = null; this.renderNavbar(); this.renderSidebar(); this.enforcePageAccessGuard(); });
            } catch (e) { console.warn('bindAuthEvents failed:', e); }
        }

        toggleSidebar() {
            const isMobile = window.matchMedia('(max-width: 991.98px)').matches;
            if (!isMobile) return;
            const sidebar = document.querySelector('#sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && overlay) {
                const willOpen = !sidebar.classList.contains('active');
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
                document.body.classList.toggle('sidebar-open');
                try { sidebar.setAttribute('aria-hidden', willOpen ? 'false' : 'true'); } catch (_) {}
            }
        }

        closeSidebar() {
            const sidebar = document.querySelector('#sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');
                try { sidebar.setAttribute('aria-hidden', 'true'); } catch (_) {}
            }
        }

        setupFixedSidebarMode() {
            const isDesktop = window.matchMedia('(min-width: 992px)').matches;
            const sidebar = document.querySelector('#sidebar');
            if (window.__HIDE_SIDEBAR__ || window.__LANDING_PAGE__) {
                document.body.classList.remove('with-fixed-sidebar');
                if (sidebar) { try { sidebar.setAttribute('aria-hidden', 'true'); } catch (_) {} }
                return;
            }
            if (isDesktop) {
                document.body.classList.add('with-fixed-sidebar');
                if (sidebar) { try { sidebar.setAttribute('aria-hidden', 'false'); } catch (_) {} }
            } else {
                document.body.classList.remove('with-fixed-sidebar');
                if (sidebar) { const visible = sidebar.classList.contains('active'); try { sidebar.setAttribute('aria-hidden', visible ? 'false' : 'true'); } catch (_) {} }
            }
        }

        applyConsistentStyling() { if (!document.querySelector('#unified-ui-styles')) this.injectUnifiedStyles(); }

        injectUnifiedStyles() {
            const styles = document.createElement('style');
            styles.id = 'unified-ui-styles';
            styles.textContent = `
                .navbar { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-bottom: 1px solid rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1100; min-height: 56px; }
                .navbar-brand { font-weight: 700; font-size: 1.3rem; color: var(--primary, #007bff); text-decoration: none; }
                .navbar > .container { max-width: 1260px; margin: 0 auto; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
                .navbar .navbar-nav { display:flex; align-items:center; gap:12px; }
                .navbar .navbar-text { color: var(--text-primary, #003566); font-weight:600; }
                .menu-toggle { background: none; border: none; font-size: 1.2rem; color: var(--primary, #007bff); cursor: pointer; padding: .5rem; border-radius: 8px; transition: all .3s ease; }
                .menu-toggle:hover { background: rgba(0,123,255,.1); transform: scale(1.05); }
                .sidebar { position: fixed; right: 0; top: 0; width: 280px; height: 100vh; background: #fff; box-shadow: -2px 0 10px rgba(0,0,0,0.1); z-index: 1050; overflow-y: auto; }
                .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1040; opacity: 0; visibility: hidden; transition: all .3s ease; }
                .sidebar-overlay.active { opacity: 1; visibility: visible; }
                .sidebar-header { padding: 1.5rem; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, var(--primary, #007bff) 0%, var(--secondary, #6f42c1) 100%); color: #fff; display: flex; justify-content: space-between; align-items: center; }
                .sidebar-header .logo { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
                .sidebar-close { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; padding: .5rem; border-radius: 4px; transition: background .3s ease; }
                .sidebar-close:hover { background: rgba(255,255,255,0.1); }
                .user-info { padding: 1rem 1.5rem; border-bottom: 1px solid #e9ecef; background: #f8f9fa; }
                .user-avatar { width: 40px; height: 40px; background: var(--primary, #007bff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
                .user-name { font-weight: 600; font-size: .9rem; color: #333; }
                .user-role { font-size: .8rem; color: #666; }
                .sidebar-nav { padding: 1rem 0; }
                .sidebar-item { display: flex; align-items: center; padding: .8rem 1.5rem; color: #333; text-decoration: none; transition: all .3s ease; border-right: 3px solid transparent; }
                .sidebar-item:hover { background: #f8f9fa; color: var(--primary, #007bff); text-decoration: none; }
                .sidebar-item.active { background: rgba(0,123,255,.1); color: var(--primary, #007bff); border-right-color: var(--primary, #007bff); font-weight: 600; }
                .sidebar-item i { width: 20px; margin-left: .8rem; text-align: center; }
                .sidebar-separator { padding: 1rem 1.5rem .5rem; font-size: .8rem; font-weight: 600; color: #666; text-transform: uppercase; border-bottom: 1px solid #e9ecef; margin-bottom: .5rem; }
                .sidebar-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem; border-top: 1px solid #e9ecef; background: #f8f9fa; }
                body.with-fixed-sidebar { padding-right: 280px; }
                @media (max-width: 991.98px) { body.with-fixed-sidebar { padding-right: 0; } .sidebar { right: -250px; width: 250px; transition: right .3s ease; } .sidebar.active { right: 0; } .navbar-brand { font-size: 1.1rem; } .menu-toggle { font-size: 1.1rem; } }
                body.sidebar-open { overflow: hidden; }
            `;
            document.head.appendChild(styles);
        }

        async updateSidebar() { await this.loadUserInfo(); this.renderSidebar(); this.renderNavbar(); this.setupFixedSidebarMode(); }
    }

    // Initialize unified UI
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.unifiedUI || !(window.unifiedUI instanceof UnifiedUITemplate)) {
            window.unifiedUI = new UnifiedUITemplate();
        }
    });
    window.addEventListener('firebaseAuthReady', () => { if (window.unifiedUI) { window.unifiedUI.loadUserInfo(); window.unifiedUI.renderNavbar(); window.unifiedUI.renderSidebar(); window.unifiedUI.setupFixedSidebarMode(); } });

    if (typeof module !== 'undefined' && module.exports) { module.exports = UnifiedUITemplate; }
    if (typeof window !== 'undefined' && !window.logout) {
        window.logout = function () {
            try { if (window.unifiedAuth && typeof window.unifiedAuth.logout === 'function') { window.unifiedAuth.logout(); } else { window.location.href = 'login.html'; } }
            catch (e) { console.warn('logout() fallback error:', e); window.location.href = 'login.html'; }
        };
    }
})();