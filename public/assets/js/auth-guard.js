(function () {
    class AuthGuard {
        constructor() {
            this.constants = window.sessionConstants || {
                AUTH_READY_TIMEOUT_MS: 5000,
                PROFILE_READY_TIMEOUT_MS: 5000,
                POLL_INTERVAL_MS: 100,
                REDIRECT_DELAY_MS: 500
            };
        }

        waitForAuthReady(timeoutMs) {
            const timeout = Number(timeoutMs || this.constants.AUTH_READY_TIMEOUT_MS || 5000);
            const poll = Number(this.constants.POLL_INTERVAL_MS || 100);

            return new Promise((resolve) => {
                const start = Date.now();
                let settled = false;

                const finish = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };

                const check = () => {
                    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                        finish();
                        return;
                    }

                    if (window.unifiedAuth && window.unifiedAuth.isInitialized) {
                        finish();
                        return;
                    }

                    if (Date.now() - start >= timeout) {
                        finish();
                        return;
                    }

                    setTimeout(check, poll);
                };

                const onFirebaseReady = () => finish();
                const onAuthReady = () => finish();
                const onUnifiedReady = () => finish();

                window.addEventListener('firebaseReady', onFirebaseReady, { once: true });
                window.addEventListener('firebaseAuthReady', onAuthReady, { once: true });
                window.addEventListener('unifiedAuthReady', onUnifiedReady, { once: true });

                check();
            });
        }

        waitForProfileReady(timeoutMs) {
            const timeout = Number(timeoutMs || this.constants.PROFILE_READY_TIMEOUT_MS || 5000);
            const poll = Number(this.constants.POLL_INTERVAL_MS || 100);

            return new Promise((resolve) => {
                const start = Date.now();
                const check = () => {
                    const ua = window.unifiedAuth;
                    const hasUser = !!(ua && (ua.currentUser || ua.user));
                    const hasProfile = !!(ua && ua.userProfile && ua.userProfile.role);
                    if (!hasUser || hasProfile || Date.now() - start >= timeout) {
                        resolve();
                        return;
                    }
                    setTimeout(check, poll);
                };
                check();
            });
        }

        getCurrentUser() {
            if (window.unifiedAuth && (window.unifiedAuth.currentUser || window.unifiedAuth.user)) {
                return window.unifiedAuth.currentUser || window.unifiedAuth.user;
            }
            if (window.auth && window.auth.currentUser) {
                return window.auth.currentUser;
            }
            return null;
        }

        normalizeRole(role) {
            const cleaned = String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
            const map = {
                super_admin: 'super_admin',
                system_admin: 'system_admin',
                admin: 'admin',
                department_admin: 'department_admin',
                'department-admin': 'department_admin',
                manager: 'manager',
                supervisor: 'supervisor',
                employee: 'employee',
                user: 'user',
                viewer: 'viewer'
            };
            return map[cleaned] || cleaned;
        }

        getCurrentRole() {
            const ua = window.unifiedAuth;
            const profileRole = ua && ua.userProfile ? ua.userProfile.role : null;
            return this.normalizeRole(profileRole || '');
        }

        scheduleRedirect(url, delayMs) {
            const delay = Number(delayMs || this.constants.REDIRECT_DELAY_MS || 500);
            setTimeout(() => {
                window.location.href = url;
            }, delay);
        }

        async requireAuth(options = {}) {
            await this.waitForAuthReady(options.authTimeoutMs);
            await this.waitForProfileReady(options.profileTimeoutMs);

            const user = this.getCurrentUser();
            if (user) {
                return { ok: true, user };
            }

            const redirectTo = options.redirectTo || 'login.html?message=session-expired';
            this.scheduleRedirect(redirectTo, options.redirectDelayMs);
            return { ok: false, reason: 'unauthenticated' };
        }

        async requireRole(allowedRoles = [], options = {}) {
            const authState = await this.requireAuth(options);
            if (!authState.ok) return authState;

            const normalizedAllowed = allowedRoles.map((r) => this.normalizeRole(r));
            const currentRole = this.getCurrentRole();
            if (!normalizedAllowed.length || normalizedAllowed.includes(currentRole)) {
                return { ok: true, user: authState.user, role: currentRole };
            }

            const redirectTo = options.redirectTo || 'access-denied.html';
            this.scheduleRedirect(redirectTo, options.redirectDelayMs);
            return { ok: false, reason: 'forbidden', role: currentRole };
        }
    }

    window.AuthGuard = AuthGuard;
    window.authGuard = window.authGuard || new AuthGuard();
})();
