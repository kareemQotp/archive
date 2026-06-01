(function () {
    class AdminApi {
        constructor(options = {}) {
            this.region = options.region || 'us-central1';
            this.functionsRef = null;
        }

        getFunctionsRef() {
            if (this.functionsRef) return this.functionsRef;

            if (window.functions && typeof window.functions.httpsCallable === 'function') {
                this.functionsRef = window.functions;
                return this.functionsRef;
            }

            if (window.firebase && firebase.app && firebase.app().functions) {
                this.functionsRef = firebase.app().functions(this.region);
                return this.functionsRef;
            }

            throw new Error('Cloud Functions is not available');
        }

        async call(functionName, payload = {}) {
            const functionsRef = this.getFunctionsRef();
            const callable = functionsRef.httpsCallable(functionName);
            const res = await callable(payload);
            return (res && res.data && res.data.data) ? res.data.data : (res ? res.data : null);
        }

        async createUserWithRole(payload) {
            return this.call('createUserWithRole', payload);
        }

        async updateUserRole(payload) {
            return this.call('updateUserRole', payload);
        }

        async deleteUserAccount(payload) {
            return this.call('deleteUserAccount', payload);
        }

        async sendPasswordResetEmail(payload) {
            return this.call('sendPasswordResetEmail', payload);
        }

        async getAdminPortalConfig(payload = {}) {
            return this.call('getAdminPortalConfig', payload);
        }

        async updateAdminPortalConfig(payload) {
            return this.call('updateAdminPortalConfig', payload);
        }
    }

    window.AdminApi = AdminApi;
    window.adminApi = new AdminApi();
})();
