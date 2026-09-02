(function () {
    class AdminFeatureSwitches {
        constructor() {
            this.loaded = false;
            this.config = null;
            this.flags = {};
            this.noticeId = 'adminModuleDisabledNotice';
            this.redirectTimer = null;
        }

        async load(force = false) {
            if (this.loaded && !force) return this.flags;

            let config = null;
            try {
                if (window.adminApi && typeof window.adminApi.getAdminPortalConfig === 'function') {
                    const res = await window.adminApi.getAdminPortalConfig();
                    config = (res && res.config) ? res.config : null;
                }
            } catch (_) {}

            if (!config) {
                try {
                    if (window.firebase && firebase.firestore) {
                        const snap = await firebase.firestore().collection('system_settings').doc('admin_portal_config').get();
                        config = snap.exists ? (snap.data() || null) : null;
                    }
                } catch (_) {}
            }

            this.config = config || {};
            this.flags = (this.config && this.config.featureFlags) ? this.config.featureFlags : {};
            this.loaded = true;
            return this.flags;
        }

        async isEnabled(flagName, defaultValue = true) {
            await this.load(false);
            if (!flagName) return !!defaultValue;
            if (!(flagName in this.flags)) return !!defaultValue;
            return !!this.flags[flagName];
        }

        evaluateModuleAccess(flagName, defaultValue = true) {
            if (!flagName) return true;
            if (!this.flags || typeof this.flags !== 'object') return !!defaultValue;
            if (!(flagName in this.flags)) return !!defaultValue;
            return !!this.flags[flagName];
        }

        showAccessNotice(options = {}) {
            const moduleLabel = options.moduleLabel || 'هذه الوحدة';
            const redirectDelayMs = Number(options.redirectDelayMs || 1500);
            const redirectDelaySec = Math.max(1, Math.round(redirectDelayMs / 1000));
            const customMessage = options.message || '';
            const message = customMessage || (`${moduleLabel} متوقفة مؤقتًا من إعدادات بوابة المدير.`);
            const variant = String(options.variant || 'warning').trim() || 'warning';
            const iconMap = {
                warning: 'fas fa-triangle-exclamation',
                danger: 'fas fa-ban',
                info: 'fas fa-circle-info',
                success: 'fas fa-circle-check'
            };
            const icon = iconMap[variant] || iconMap.warning;

            const existing = document.getElementById(this.noticeId);
            if (existing) existing.remove();

            const notice = document.createElement('div');
            notice.id = this.noticeId;
            notice.className = `alert alert-${variant} d-flex align-items-center gap-2 m-3`;
            notice.setAttribute('role', 'alert');
            notice.style.position = 'fixed';
            notice.style.top = '0';
            notice.style.left = '0';
            notice.style.right = '0';
            notice.style.zIndex = '2000';
            notice.innerHTML = [
                `<i class="${icon}"></i>`,
                `<span>${message}</span>`,
                `<small class="ms-auto text-muted">سيتم تحويلك خلال ${redirectDelaySec} ثانية...</small>`
            ].join('');

            document.body.appendChild(notice);
        }

        showDisabledNotice(options = {}) {
            this.showAccessNotice({ ...options, variant: options.variant || 'warning' });
        }

        scheduleRedirect(url, delayMs) {
            if (this.redirectTimer) {
                clearTimeout(this.redirectTimer);
            }
            this.redirectTimer = setTimeout(() => {
                window.location.href = url;
            }, delayMs);
        }

        async enforceModuleAccess(flagName, options = {}) {
            const enabled = await this.isEnabled(flagName, true);
            if (enabled) return true;

            const redirectTo = options.redirectTo || 'index.html';
            const redirectDelayMs = Number(options.redirectDelayMs || 1500);

            this.showAccessNotice({
                moduleLabel: options.moduleLabel,
                message: options.message,
                redirectDelayMs,
                variant: options.variant || 'warning'
            });

            this.scheduleRedirect(redirectTo, redirectDelayMs);

            return false;
        }

        async guardModuleStartup(flagName, options = {}) {
            try {
                const enabled = await this.enforceModuleAccess(flagName, options);
                if (!enabled && typeof options.onDisabled === 'function') {
                    options.onDisabled();
                }
                return enabled;
            } catch (error) {
                if (typeof options.onError === 'function') {
                    options.onError(error);
                } else {
                    console.warn('تعذر قراءة إعدادات feature switches، سيتم المتابعة افتراضيًا:', error);
                }
                return true;
            }
        }

        normalizeRole(role) {
            if (window.AuthConstants) {
                return window.AuthConstants.normalizeRole(role);
            }
            if (!role) return 'viewer';
            const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
            const aliases = {
                'admin': 'admin',
                'super_admin': 'super_admin',
                'system_admin': 'super_admin',
                'dept_admin': 'department_admin',
                'department-admin': 'department_admin',
                'manager': 'department_admin',
                'department_head': 'supervisor'
            };
            return aliases[normalized] || normalized;
        }

        extractRole(source) {
            if (!source) return '';
            if (typeof source === 'string') return this.normalizeRole(source);
            if (typeof source === 'object') {
                return this.normalizeRole(source.role || source.userRole || source.claimRole || source.profileRole || '');
            }
            return '';
        }

        evaluateRoleAccess(source, options = {}) {
            const role = this.extractRole(source);
            const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles.map((item) => this.normalizeRole(item)) : [];
            const allowIf = typeof options.allowIf === 'function' ? options.allowIf(role, source) : null;

            const isAllowed = typeof allowIf === 'boolean'
                ? allowIf
                : (allowedRoles.length ? allowedRoles.includes(role) : true);

            return { role, isAllowed };
        }

        evaluatePageAccess(source, flagName, options = {}) {
            const roleCheck = this.evaluateRoleAccess(source, options);
            const moduleAllowed = this.evaluateModuleAccess(flagName, true);
            return {
                role: roleCheck.role,
                roleAllowed: roleCheck.isAllowed,
                moduleAllowed,
                isAllowed: roleCheck.isAllowed && moduleAllowed
            };
        }

        async enforceRoleAccess(source, options = {}) {
            const roleCheck = this.evaluateRoleAccess(source, options);
            const role = roleCheck.role;
            const isAllowed = roleCheck.isAllowed;

            if (isAllowed) return true;

            const redirectTo = options.redirectTo || 'index.html';
            const redirectDelayMs = Number(options.redirectDelayMs || 1500);
            const roleLabel = options.roleLabel || 'غير مخول';
            const message = options.message || `هذا القسم متاح فقط للحسابات ذات الصلاحية المناسبة (${roleLabel}).`;

            this.showAccessNotice({
                moduleLabel: options.moduleLabel || 'الصفحة الحالية',
                message,
                redirectDelayMs,
                variant: options.variant || 'danger'
            });

            this.scheduleRedirect(redirectTo, redirectDelayMs);

            return false;
        }

        async gatePageAccess(source, flagName, options = {}) {
            const roleAllowed = await this.enforceRoleAccess(source, options);
            if (!roleAllowed) {
                if (typeof options.onDenied === 'function') {
                    options.onDenied();
                }
                return false;
            }

            const moduleAllowed = await this.guardModuleStartup(flagName, options);
            if (!moduleAllowed) {
                if (typeof options.onDisabled === 'function') {
                    options.onDisabled();
                }
                return false;
            }

            return true;
        }
    }

    window.AdminFeatureSwitches = AdminFeatureSwitches;
    window.adminFeatureSwitches = new AdminFeatureSwitches();
})();
