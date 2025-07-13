/**
 * نظام المصادقة الموحد
 * Unified Authentication System
 * 
 * يوفر جميع وظائف المصادقة في مكان واحد مع دعم شامل لـ:
 * - تسجيل الدخول والخروج
 * - إدارة حالة المستخدم
 * - التحقق من الصلاحيات
 * - إعادة تعيين كلمة المرور
 * - تتبع نشاط المستخدم
 */

class UnifiedAuth {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.permissions = [];
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.isInitialized = false;
        
        // Event listeners for auth state changes
        this.authStateListeners = [];
        this.permissionChangeListeners = [];
        
        this.init();
    }

    async init() {
        try {
            // انتظار تهيئة Firebase
            if (typeof firebase === 'undefined') {
                await this.waitForFirebase();
            }

            // انتظار تهيئة auth
            if (!window.auth) {
                await this.waitForAuth();
            }

            // Set up auth state persistence
            await window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            // Monitor auth state changes
            window.auth.onAuthStateChanged(async (user) => {
                await this.handleAuthStateChange(user);
            });

            this.isInitialized = true;
            console.log('✅ نظام المصادقة الموحد تم تهيئته بنجاح');
            
        } catch (error) {
            console.error('فشل في تهيئة نظام المصادقة:', error);
            this.isInitialized = false;
        }
    }

    // انتظار تحميل Firebase
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // انتظار تهيئة Auth
    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.auth) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            
            // الاستماع لحدث firebaseReady
            window.addEventListener('firebaseReady', () => {
                resolve();
            });
            
            checkAuth();
        });
    }

    async handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            try {
                // Load user profile and permissions
                await this.loadUserProfile(user.uid);
                await this.loadUserPermissions(user.uid);
                await this.updateLastLogin(user.uid);
                
                // Notify listeners
                this.notifyAuthStateListeners('login', user);
                
                console.log('المستخدم مسجل دخول:', user.email);
            } catch (error) {
                console.error('خطأ في تحميل بيانات المستخدم:', error);
            }
        } else {
            // User signed out
            this.userProfile = null;
            this.permissions = [];
            this.notifyAuthStateListeners('logout', null);
            console.log('المستخدم غير مسجل دخول');
        }
    }

    async loadUserProfile(uid) {
        try {
            // Check if this is an admin email first
            const isAdminEmail = this.currentUser.email && (
                this.currentUser.email.includes('admin') || 
                this.currentUser.email === 'admin123@aman.eg' ||
                this.currentUser.email === 'admin@aman.eg'
            );
            
            if (!db) {
                console.warn('Firestore not available, using basic profile');
                this.userProfile = {
                    uid: uid,
                    email: this.currentUser.email,
                    role: isAdminEmail ? 'admin' : 'viewer',
                    department: 'عام',
                    createdAt: new Date(),
                    isActive: true
                };
                console.log('🔧 Profile created (offline mode):', this.userProfile.role, 'for', this.currentUser.email);
                return;
            }
            
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                this.userProfile = {
                    uid: uid,
                    ...userDoc.data()
                };
                
                // Force admin role for admin emails even if stored differently
                if (isAdminEmail && this.userProfile.role !== 'admin') {
                    this.userProfile.role = 'admin';
                    // Update in database
                    await db.collection('users').doc(uid).update({ role: 'admin' });
                    console.log('🔧 Updated role to admin for:', this.currentUser.email);
                }
                
                console.log('✅ Profile loaded:', this.userProfile.role, 'for', this.currentUser.email);
            } else {
                // Create basic profile if doesn't exist
                this.userProfile = {
                    uid: uid,
                    email: this.currentUser.email,
                    role: isAdminEmail ? 'admin' : 'viewer',
                    department: 'عام',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true
                };
                
                await db.collection('users').doc(uid).set(this.userProfile);
                console.log('🆕 New profile created:', this.userProfile.role, 'for', this.currentUser.email);
            }
        } catch (error) {
            console.error('فشل في تحميل ملف المستخدم:', error);
            // Fallback profile
            const isAdminEmail = this.currentUser.email && (
                this.currentUser.email.includes('admin') || 
                this.currentUser.email === 'admin123@aman.eg' ||
                this.currentUser.email === 'admin@aman.eg'
            );
            
            this.userProfile = {
                uid: uid,
                email: this.currentUser.email,
                role: isAdminEmail ? 'admin' : 'viewer',
                department: 'عام'
            };
            console.log('🔧 Fallback profile:', this.userProfile.role, 'for', this.currentUser.email);
        }
    }

    async loadUserPermissions(uid = null) {
        try {
            const targetUid = uid || this.currentUser?.uid;
            const role = this.userProfile?.role || 'viewer';
            
            // Define role-based permissions
            const rolePermissions = {
                'admin': [
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'files.view', 'files.create', 'files.edit', 'files.delete',
                    'departments.manage', 'system.admin', 'reports.view',
                    'invitations.manage', 'roles.manage', 'scanner.access'
                ],
                'manager': [
                    'users.view', 'users.create', 'users.edit',
                    'files.view', 'files.create', 'files.edit',
                    'reports.view', 'invitations.create', 'scanner.access'
                ],
                'employee': [
                    'files.view', 'files.create', 'files.edit',
                    'scanner.access'
                ],
                'viewer': [
                    'files.view', 'files.create', 'scanner.access'
                ]
            };

            this.permissions = rolePermissions[role] || rolePermissions['viewer'];
            this.notifyPermissionChangeListeners(this.permissions);
            
            // Return permissions object for external use
            const permissionsObj = {};
            this.permissions.forEach(permission => {
                permissionsObj[permission] = true;
            });
            
            return permissionsObj;
            
        } catch (error) {
            console.error('فشل في تحميل صلاحيات المستخدم:', error);
            this.permissions = ['files.view']; // Default minimal permissions
            return { 'files.view': true };
        }
    }

    async updateLastLogin(uid) {
        try {
            await db.collection('users').doc(uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                loginCount: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.warn('فشل في تحديث وقت آخر دخول:', error);
        }
    }

    // Authentication Methods
    async signIn(email, password) {
        try {
            // Check if account is locked
            const lockoutKey = `lockout_${email}`;
            const lockoutTime = localStorage.getItem(lockoutKey);
            
            if (lockoutTime && Date.now() < parseInt(lockoutTime)) {
                const remainingTime = Math.ceil((parseInt(lockoutTime) - Date.now()) / 60000);
                throw new Error(`الحساب مقفل. حاول مرة أخرى بعد ${remainingTime} دقيقة`);
            }

            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            // Reset login attempts on success
            this.loginAttempts = 0;
            localStorage.removeItem(`attempts_${email}`);
            localStorage.removeItem(lockoutKey);
            
            // Log successful login
            await this.logAuthEvent('login_success', {
                email: email,
                timestamp: new Date(),
                ip: await this.getUserIP()
            });

            return {
                success: true,
                user: userCredential.user,
                message: 'تم تسجيل الدخول بنجاح'
            };

        } catch (error) {
            // Handle failed login attempt
            await this.handleFailedLogin(email, error);
            throw error;
        }
    }

    async handleFailedLogin(email, error) {
        const attemptsKey = `attempts_${email}`;
        const currentAttempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
        
        localStorage.setItem(attemptsKey, currentAttempts.toString());
        
        if (currentAttempts >= this.maxLoginAttempts) {
            const lockoutKey = `lockout_${email}`;
            const lockoutTime = Date.now() + this.lockoutDuration;
            localStorage.setItem(lockoutKey, lockoutTime.toString());
        }

        // Log failed login attempt
        await this.logAuthEvent('login_failed', {
            email: email,
            error: error.message,
            attempts: currentAttempts,
            timestamp: new Date(),
            ip: await this.getUserIP()
        });
    }

    async signOut() {
        try {
            if (this.currentUser) {
                // Log signout
                await this.logAuthEvent('logout', {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    timestamp: new Date()
                });
            }

            await auth.signOut();
            
            // Clear local data
            this.currentUser = null;
            this.userProfile = null;
            this.permissions = [];
            
            return {
                success: true,
                message: 'تم تسجيل الخروج بنجاح'
            };

        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email, {
                url: window.location.origin + '/login.html',
                handleCodeInApp: false
            });

            // Log password reset request
            await this.logAuthEvent('password_reset_requested', {
                email: email,
                timestamp: new Date(),
                ip: await this.getUserIP()
            });

            return {
                success: true,
                message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
            };

        } catch (error) {
            console.error('فشل في إرسال رابط إعادة تعيين كلمة المرور:', error);
            throw error;
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('يجب تسجيل الدخول أولاً');
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );
            
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await this.currentUser.updatePassword(newPassword);

            // Log password change
            await this.logAuthEvent('password_changed', {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'تم تغيير كلمة المرور بنجاح'
            };

        } catch (error) {
            console.error('فشل في تغيير كلمة المرور:', error);
            throw error;
        }
    }

    // Permission Methods
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current user role
    getCurrentUserRole() {
        if (!this.currentUser) return null;
        // Return role from user profile, fallback to 'viewer'
        return this.userProfile?.role || 'viewer';
    }

    hasAnyPermission(permissionsList) {
        return permissionsList.some(permission => this.hasPermission(permission));
    }

    hasAllPermissions(permissionsList) {
        return permissionsList.every(permission => this.hasPermission(permission));
    }

    hasRole(role) {
        return this.userProfile?.role === role;
    }

    hasAnyRole(rolesList) {
        return rolesList.includes(this.userProfile?.role);
    }

    // Page Protection
    requireAuth(redirectTo = 'login.html') {
        if (!this.currentUser) {
            this.redirectToLogin(redirectTo);
            return false;
        }
        return true;
    }

    requirePermission(permission, redirectTo = 'index.html') {
        if (!this.hasPermission(permission)) {
            this.showPermissionDenied();
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 3000);
            return false;
        }
        return true;
    }

    requireRole(role, redirectTo = 'index.html') {
        if (!this.hasRole(role)) {
            this.showRoleDenied();
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 3000);
            return false;
        }
        return true;
    }

    redirectToLogin(redirectTo = 'login.html') {
        // Save current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = redirectTo;
    }

    redirectAfterLogin() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl && redirectUrl !== window.location.href && !redirectUrl.includes('login.html')) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        } else {
            // Default redirect to dashboard or index
            window.location.href = 'dashboard.html';
        }
    }

    // UI Helpers
    showPermissionDenied() {
        const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>غير مصرح!</strong> ليس لديك صلاحية للوصول إلى هذه الصفحة.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', alertHtml);
    }

    showRoleDenied() {
        const alertHtml = `
            <div class="alert alert-warning alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <i class="fas fa-user-times me-2"></i>
                <strong>دور غير مناسب!</strong> مستوى صلاحيتك لا يسمح بالوصول إلى هذه الصفحة.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', alertHtml);
    }

    // Event Listeners
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // Call immediately if already initialized
        if (this.isInitialized) {
            callback(this.currentUser);
        }
    }

    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // Call immediately if already initialized
        if (this.isInitialized) {
            callback(this.currentUser ? 'login' : 'logout', this.currentUser);
        }
    }

    onPermissionChange(callback) {
        this.permissionChangeListeners.push(callback);
        
        // Call immediately if permissions are loaded
        if (this.permissions.length > 0) {
            callback(this.permissions);
        }
    }

    notifyAuthStateListeners(state, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(state, user);
            } catch (error) {
                console.error('خطأ في استدعاء مستمع حالة المصادقة:', error);
            }
        });
    }

    notifyPermissionChangeListeners(permissions) {
        this.permissionChangeListeners.forEach(callback => {
            try {
                callback(permissions);
            } catch (error) {
                console.error('خطأ في استدعاء مستمع تغيير الصلاحيات:', error);
            }
        });
    }

    // Utility Methods
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    async logAuthEvent(eventType, data) {
        try {
            await db.collection('auth_logs').add({
                eventType: eventType,
                ...data,
                userAgent: navigator.userAgent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('فشل في تسجيل حدث المصادقة:', error);
        }
    }

    // Session Management
    isSessionValid() {
        if (!this.currentUser) return false;
        
        const lastActivity = localStorage.getItem('lastActivity');
        if (!lastActivity) return true;
        
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        return timeSinceActivity < this.sessionTimeout;
    }

    updateActivity() {
        localStorage.setItem('lastActivity', Date.now().toString());
    }

    setupActivityTracking() {
        // Track user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), true);
        });

        // Check session validity periodically
        setInterval(() => {
            if (this.currentUser && !this.isSessionValid()) {
                this.signOut().then(() => {
                    alert('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
                    this.redirectToLogin();
                });
            }
        }, 60000); // Check every minute
    }

    // Getters
    get user() {
        return this.currentUser;
    }

    get profile() {
        return this.userProfile;
    }

    get userPermissions() {
        return [...this.permissions];
    }

    get isAuthenticated() {
        return !!this.currentUser && this.isSessionValid();
    }

    get userRole() {
        return this.userProfile?.role || 'viewer';
    }

    get userDepartment() {
        return this.userProfile?.department || 'عام';
    }

    get userName() {
        return this.userProfile?.displayName || 
               this.userProfile?.firstName || 
               this.currentUser?.email?.split('@')[0] || 
               'مستخدم';
    }
}

// Create global instance
const unifiedAuth = new UnifiedAuth();

// Legacy compatibility functions
function requireAuth(redirectTo = 'login.html') {
    return unifiedAuth.requireAuth(redirectTo);
}

function logout() {
    return unifiedAuth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Expose to global scope
window.unifiedAuth = unifiedAuth;
window.requireAuth = requireAuth;
window.logout = logout;

// Setup activity tracking when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    unifiedAuth.setupActivityTracking();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { unifiedAuth, UnifiedAuth };
}