(function () {
    class SensitiveActionGuard {
        constructor(authSystem) {
            this.authSystem = authSystem;
        }

        getAuthSystem() {
            return this.authSystem || window.unifiedAuth || null;
        }

        async reauthenticate(password) {
            const authSystem = this.getAuthSystem();
            if (!authSystem || typeof authSystem.reauthenticate !== 'function') {
                throw new Error('Unified auth reauthenticate API is not available');
            }
            return authSystem.reauthenticate(password);
        }

        async approveSensitiveAction(options = {}) {
            const {
                actionLabel = 'عملية حساسة',
                requireReason = true,
                requireReauth = true,
                reasonMinLength = 5
            } = options;

            const authSystem = this.getAuthSystem();
            if (!authSystem || !authSystem.isAuthenticated) {
                alert('يجب تسجيل الدخول قبل تنفيذ العملية الحساسة.');
                return { approved: false };
            }

            let reason = '';
            if (requireReason) {
                reason = (window.prompt(`اكتب سبب تنفيذ العملية: ${actionLabel}`, '') || '').trim();
                if (!reason || reason.length < reasonMinLength) {
                    alert('سبب التنفيذ مطلوب ويجب أن يكون واضحا.');
                    return { approved: false };
                }
            }

            if (requireReauth) {
                const password = window.prompt('للتأكيد الأمني: أدخل كلمة المرور الحالية');
                if (!password) {
                    alert('تم إلغاء العملية: لم يتم إدخال كلمة المرور.');
                    return { approved: false };
                }
                await this.reauthenticate(password);
            }

            return {
                approved: true,
                reason,
                reauthenticatedAt: new Date().toISOString()
            };
        }
    }

    window.SensitiveActionGuard = SensitiveActionGuard;
    window.sensitiveActionGuard = new SensitiveActionGuard(window.unifiedAuth || null);
})();
