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
        this.lastLoginUpdateDisabled = false;
        this.lastLoginWarnedAt = 0;
        this.pendingLastLoginSync = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.isInitialized = false;

        this.roleAliases = {
            admin: 'super_admin',
            system_admin: 'super_admin',
            super_admin: 'super_admin',
            'department-admin': 'department_admin',
            department_admin: 'department_admin',
            manager: 'supervisor',
            department_head: 'supervisor',
            supervisor: 'supervisor',
            user: 'employee',
            employee: 'employee',
            archive_officer: 'employee',
            'archive-officer': 'employee',
            viewer: 'viewer'
        };

        this.departmentAliases = {
            admin: 'admin',
            'عام': 'admin',
            general: 'admin',
            archive: 'archive',
            'ارشيف': 'archive',
            'الأرشيف': 'archive',
            legal: 'legal',
            'قانونية': 'legal',
            'الشؤون القانونية': 'legal',
            collection: 'collection',
            'التحصيل': 'collection'
        };
        
        // Event listeners for auth state changes
        this.authStateListeners = [];
        this.permissionChangeListeners = [];
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('❌ فشل في تهيئة نظام المصادقة:', error);
        });
    }

    async init() {
        try {
            console.log('🔄 بدء تهيئة نظام المصادقة الموحد...');
            
            // فحص فوري لوجود window.auth
            if (window.auth) {
                console.log('✅ window.auth متاح فوراً');
                await this.setupAuthListeners();
                return;
            }
            
            // انتظار تهيئة Firebase
            if (typeof firebase === 'undefined') {
                console.log('⏳ انتظار تحميل Firebase...');
                await this.waitForFirebase();
            }
            console.log('✅ Firebase محمل ومتاح');

            // انتظار تهيئة auth
            if (!window.auth) {
                console.log('⏳ انتظار تهيئة Firebase Auth...');
                await this.waitForAuth();
            }
            console.log('✅ Firebase Auth متاح');

            await this.setupAuthListeners();
            
        } catch (error) {
            console.error('❌ فشل في تهيئة نظام المصادقة:', error);
            this.isInitialized = false;
        }
    }

    async setupAuthListeners() {
        // Set up auth state persistence - Firebase v10 compat mode
        console.log('Firebase Auth سيحافظ على الجلسة تلقائياً');
        
        // Monitor auth state changes
        window.auth.onAuthStateChanged(async (user) => {
            console.log('🔄 Auth state changed:', user ? user.email : 'لا يوجد مستخدم');
            await this.handleAuthStateChange(user);
        });

        this.isInitialized = true;
        console.log('✅ نظام المصادقة الموحد تم تهيئته بنجاح');
        
        // إرسال حدث التهيئة
        window.dispatchEvent(new CustomEvent('unifiedAuthReady', {
            detail: { auth: this }
        }));
    }

    // انتظار تحميل Firebase
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds
            
            const checkFirebase = () => {
                attempts++;
                if (typeof firebase !== 'undefined') {
                    console.log('✅ Firebase SDK متاح');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ انتهت المحاولات - Firebase SDK غير متاح');
                    reject(new Error('Firebase SDK load timeout'));
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // انتظار تهيئة Auth
    async waitForAuth() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // تقليل إلى 2 ثانية
            
            const checkAuth = () => {
                attempts++;
                console.log(`🔍 محاولة ${attempts}/${maxAttempts} - فحص window.auth...`);
                
                if (window.auth) {
                    console.log('✅ window.auth متاح!');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ انتهت المحاولات - window.auth غير متاح');
                    reject(new Error('Firebase Auth initialization timeout'));
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            
            // الاستماع لحدث firebaseReady
            window.addEventListener('firebaseReady', () => {
                console.log('📡 حدث firebaseReady تم استقباله');
                if (window.auth) {
                    resolve();
                }
            });
            
            // الاستماع لحدث firebaseAuthReady الجديد
            window.addEventListener('firebaseAuthReady', () => {
                console.log('🔐 حدث firebaseAuthReady تم استقباله');
                if (window.auth) {
                    resolve();
                }
            });
            
            // البدء فوراً في الفحص
            checkAuth();
        });
    }

    async handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            try {
                // Disable any demo mode flags upon real login
                try {
                    localStorage.removeItem('archiveDemoMode');
                    localStorage.removeItem('demo_mode');
                } catch (_) {}

                // Load user profile and permissions
                await this.loadUserProfile(user.uid);
                await this.loadUserPermissions(user.uid);

                // إرسال حدث للتكامل مع Data Connect
                window.dispatchEvent(new CustomEvent('userAuthenticated', {
                    detail: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        emailVerified: user.emailVerified,
                        profile: this.userProfile,
                        permissions: this.permissions
                    }
                }));
                await this.updateLastLogin(user.uid);
                
                // Start token monitoring for authenticated user
                this.setupTokenMonitoring();
                
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
            
            // إرسال حدث تسجيل الخروج للتكامل مع Data Connect
            window.dispatchEvent(new CustomEvent('userSignedOut'));
            
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
            
            if (!window.db) {
                console.log('Firestore not available, using basic profile');
                this.userProfile = {
                    uid: uid,
                    email: this.currentUser.email,
                    role: isAdminEmail ? 'admin' : 'viewer',
                    department: 'عام',
                    createdAt: new Date(),
                    isActive: true
                };
                console.log('🔧 Profile created (offline mode):', this.userProfile.role, 'for', this.currentUser.email);

                // When Firestore becomes ready, refresh the profile once
                window.addEventListener('firebaseReady', async () => {
                    try {
                        if (this.currentUser && window.db) {
                            await this.loadUserProfile(uid);
                            await this.loadUserPermissions(uid);
                            // Notify about refreshed profile
                            window.dispatchEvent(new CustomEvent('userProfileRefreshed', {
                                detail: { profile: this.userProfile }
                            }));
                            // Try updating last login now that DB is ready
                            await this.updateLastLogin(uid);
                            console.log('✅ Profile refreshed after Firestore became available');
                        }
                    } catch (e) {
                        console.warn('Failed to refresh profile after firebaseReady:', e);
                    }
                }, { once: true });
                return;
            }
            
            const userDoc = await window.db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                this.userProfile = {
                    uid: uid,
                    ...userDoc.data()
                };

                this.userProfile.department = this.normalizeDepartment(this.userProfile.department || this.userProfile.departmentId || '');
                
                // Force admin role for admin emails even if stored differently
                if (isAdminEmail && this.userProfile.role !== 'admin') {
                    this.userProfile.role = 'admin';
                    // Update in database
                    await window.db.collection('users').doc(uid).update({ role: 'admin' });
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
                
                await window.db.collection('users').doc(uid).set(this.userProfile);
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
            const role = this.normalizeRole(this.userProfile?.role || 'viewer');
            
            // Define role-based permissions
            const rolePermissions = {
                'super_admin': [
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'files.view', 'files.create', 'files.edit', 'files.delete',
                    'departments.manage', 'system.admin', 'reports.view',
                    'invitations.manage', 'roles.manage', 'scanner.access'
                ],
                'admin': [
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'files.view', 'files.create', 'files.edit', 'files.delete',
                    'departments.manage', 'system.admin', 'reports.view',
                    'invitations.manage', 'roles.manage', 'scanner.access'
                ],
                'system_admin': [
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'files.view', 'files.create', 'files.edit', 'files.delete',
                    'departments.manage', 'system.admin', 'reports.view',
                    'invitations.manage', 'roles.manage', 'scanner.access'
                ],
                'department_admin': [
                    'users.view', 'users.create', 'users.edit',
                    'files.view', 'files.create', 'files.edit',
                    'reports.view', 'invitations.create', 'scanner.access'
                ],
                'manager': [
                    'users.view', 'users.create', 'users.edit',
                    'files.view', 'files.create', 'files.edit',
                    'reports.view', 'invitations.create', 'scanner.access'
                ],
                'supervisor': [
                    'users.view',
                    'files.view', 'files.create', 'files.edit',
                    'reports.view', 'scanner.access'
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
            if (this.lastLoginUpdateDisabled) return;
            // التحقق من توفر قاعدة البيانات
            if (!window.db) {
                if (!this.pendingLastLoginSync) {
                    this.pendingLastLoginSync = true;
                    console.warn('⚠️ قاعدة البيانات غير متوفرة، سيتم تحديث آخر دخول عند جاهزية Firebase');
                    window.addEventListener('firebaseReady', () => {
                        this.pendingLastLoginSync = false;
                        if (this.currentUser && window.db) {
                            this.updateLastLogin(uid).catch(() => {});
                        }
                    }, { once: true });
                }
                return;
            }
            
            await window.db.collection('users').doc(uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                loginCount: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            const isPermissionError = error && (
                error.code === 'permission-denied' ||
                error.code === 'firestore/permission-denied' ||
                String(error.message || '').toLowerCase().includes('missing or insufficient permissions')
            );

            if (isPermissionError) {
                this.lastLoginUpdateDisabled = true;
                console.warn('⚠️ تم تعطيل تحديث آخر دخول بسبب صلاحيات Firestore غير كافية.');
                return;
            }

            const now = Date.now();
            if (now - this.lastLoginWarnedAt > 10000) {
                this.lastLoginWarnedAt = now;
                console.warn('فشل في تحديث وقت آخر دخول:', error);
            }
        }
    }

    async checkTokenValidity() {
        if (!this.currentUser) {
            return false;
        }

        try {
            // Force token refresh to check if still valid
            const token = await this.currentUser.getIdToken(true);
            return !!token;
        } catch (error) {
            console.warn('⚠️ Token validation failed:', error);
            if (error.code === 'auth/user-token-expired' || 
                error.code === 'auth/invalid-user-token' ||
                error.code === 'auth/user-disabled') {
                console.log('🔄 Handling token expiration...');
                this.handleSessionExpiration();
                return false;
            }
            return false;
        }
    }

    async refreshUserToken() {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        try {
            const token = await this.currentUser.getIdToken(true);
            console.log('✅ Token refreshed successfully');
            return token;
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            if (error.code === 'auth/user-token-expired' || 
                error.code === 'auth/invalid-user-token') {
                this.handleSessionExpiration();
            }
            throw error;
        }
    }

    // Setup automatic token monitoring
    setupTokenMonitoring() {
        if (!this.currentUser) return;

        // Check token validity every 30 minutes
        const tokenCheckInterval = setInterval(async () => {
            if (!this.currentUser) {
                clearInterval(tokenCheckInterval);
                return;
            }

            const isValid = await this.checkTokenValidity();
            if (!isValid) {
                clearInterval(tokenCheckInterval);
            }
        }, 30 * 60 * 1000); // 30 minutes

        console.log('🔄 Token monitoring started');
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

            const userCredential = await (window.auth || firebase.auth()).signInWithEmailAndPassword(email, password);
            
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

            await (window.auth || firebase.auth()).signOut();
            
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
            await (window.auth || firebase.auth()).sendPasswordResetEmail(email, {
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

    async reauthenticate(password) {
        if (!this.currentUser || !this.currentUser.email) {
            throw new Error('يجب تسجيل الدخول أولاً');
        }

        const credential = firebase.auth.EmailAuthProvider.credential(
            this.currentUser.email,
            password
        );

        await this.currentUser.reauthenticateWithCredential(credential);
        return {
            success: true,
            at: new Date().toISOString()
        };
    }

    isSuperAdminStrict() {
        const rawRole = String(this.userProfile?.role || '').trim().toLowerCase().replace(/\s+/g, '_');
        return rawRole === 'super_admin' || rawRole === 'system_admin';
    }

    async registerUser(registrationData) {
        try {
            console.log('🚀 بدء عملية إنشاء المستخدم:', registrationData.email);

            // التحقق من البيانات المطلوبة
            if (!registrationData.email || !registrationData.password || 
                !registrationData.firstName || !registrationData.lastName) {
                throw new Error('البيانات المطلوبة ناقصة');
            }

            // إنشاء المستخدم في Firebase Auth
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(
                registrationData.email, 
                registrationData.password
            );

            const user = userCredential.user;
            console.log('✅ تم إنشاء المستخدم في Firebase Auth:', user.uid);

            // تحديد الحالة والدور حسب نوع التسجيل
            let userStatus = 'pending';
            let userRole = 'pending-approval';
            let needsApproval = true;
            
            if (registrationData.registrationType === 'invitation' && registrationData.inviteData) {
                userStatus = registrationData.inviteData.autoApprove ? 'approved' : 'pending';
                userRole = registrationData.inviteData.suggestedRole || 'pending-approval';
                needsApproval = !registrationData.inviteData.autoApprove;
            }

            // إذا كانت العملية ستُستكمل على الخادم، نتجاوز كتابة Firestore ونرجع بنجاح بعد إنشاء المستخدم في Auth
            if (registrationData.serverHandled === true) {
                try {
                    await this.logAuthEvent('user_registered_auth_only', {
                        uid: user.uid,
                        email: registrationData.email,
                        registrationType: registrationData.registrationType,
                        department: registrationData.department,
                        needsApproval: needsApproval,
                        timestamp: new Date(),
                        ip: await this.getUserIP()
                    });
                } catch (_) { /* ignore logging errors */ }

                return {
                    success: true,
                    user: user,
                    userProfile: null,
                    needsApproval: needsApproval,
                    message: needsApproval ? 
                        'تم إنشاء الحساب بنجاح. سيتم مراجعة طلبك قريباً.' : 
                        'تم إنشاء الحساب وتفعيله بنجاح!'
                };
            }

            // إنشاء ملف تعريف المستخدم في Firestore
            const userProfile = {
                uid: user.uid,
                email: registrationData.email,
                firstName: registrationData.firstName,
                lastName: registrationData.lastName,
                fullName: `${registrationData.firstName} ${registrationData.lastName}`,
                department: registrationData.department,
                departmentName: registrationData.departmentName || '',
                role: userRole,
                status: userStatus,
                registrationType: registrationData.registrationType || 'department-selection',
                joinReason: registrationData.joinReason || '',
                inviteCode: registrationData.inviteCode || '',
                invitedBy: registrationData.invitedBy || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: null,
                loginCount: 0,
                isActive: !needsApproval,
                permissions: needsApproval ? [] : ['read'],
                settings: {
                    notifications: true,
                    language: 'ar',
                    theme: 'light'
                }
            };

            // حفظ ملف التعريف في Firestore
            try {
                await firebase.firestore().collection('users').doc(user.uid).set(userProfile);
                console.log('✅ تم حفظ ملف تعريف المستخدم في Firestore');
            } catch (e) {
                console.warn('⚠️ تعذر حفظ ملف التعريف من الواجهة، قد تكون الصلاحيات تمنع ذلك. سيتولى الخادم إكمال العملية.', e?.message || e);
            }

            // تسجيل حدث إنشاء الحساب
            await this.logAuthEvent('user_registered', {
                uid: user.uid,
                email: registrationData.email,
                registrationType: registrationData.registrationType,
                department: registrationData.department,
                needsApproval: needsApproval,
                timestamp: new Date(),
                ip: await this.getUserIP()
            });

            return {
                success: true,
                user: user,
                userProfile: userProfile,
                needsApproval: needsApproval,
                message: needsApproval ? 
                    'تم إنشاء الحساب بنجاح. سيتم مراجعة طلبك قريباً.' : 
                    'تم إنشاء الحساب وتفعيله بنجاح!'
            };

        } catch (error) {
            console.error('❌ فشل في إنشاء المستخدم:', error);
            
            // تسجيل الخطأ
            await this.logAuthEvent('registration_failed', {
                email: registrationData.email,
                error: error.message,
                timestamp: new Date(),
                ip: await this.getUserIP()
            });

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
        return this.normalizeRole(this.userProfile?.role) === this.normalizeRole(role);
    }

    hasAnyRole(rolesList) {
        const currentRole = this.normalizeRole(this.userProfile?.role);
        return rolesList.map(role => this.normalizeRole(role)).includes(currentRole);
    }

    normalizeRole(role) {
        if (!role) return 'viewer';
        const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
        return this.roleAliases[normalized] || normalized;
    }

    normalizeDepartment(department) {
        if (!department) return '';
        const normalized = String(department).trim().toLowerCase().replace(/\s+/g, '_');
        return this.departmentAliases[normalized] || normalized;
    }

    // Page Protection
    requireAuth(redirectTo = 'login.html') {
        // Do not force redirect on public pages or when guest access is explicitly allowed
        const publicPages = ['index', 'login', 'register', 'forgot-password', 'reset-password'];
        const currentPage = (window.location.pathname.split('/').pop() || 'index.html').replace('.html','') || 'index';
        const allowGuest = !!(window.__ALLOW_GUEST_ACCESS__);

        if (!this.currentUser) {
            if (allowGuest || publicPages.includes(currentPage)) {
                // Permit rendering without redirect
                return false;
            }
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
        // Respect guest access on public/landing pages
        const publicPages = ['index', 'login', 'register', 'forgot-password', 'reset-password'];
        const currentPage = (window.location.pathname.split('/').pop() || 'index.html').replace('.html','') || 'index';
        if (window.__ALLOW_GUEST_ACCESS__ || publicPages.includes(currentPage)) {
            return;
        }
        // Save current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = redirectTo;
    }

    redirectToLoginWithSessionExpired(redirectTo = 'login.html') {
        if (window.__ALLOW_GUEST_ACCESS__) {
            return;
        }
        // Save current page for redirect after login
        const currentPage = window.location.href;
        const loginUrl = new URL(redirectTo, window.location.origin);
        
        // Add session expired message and redirect parameter
        loginUrl.searchParams.set('message', 'session-expired');
        loginUrl.searchParams.set('redirect', encodeURIComponent(currentPage));
        
        // Clear any existing authentication data
        localStorage.removeItem('demo_mode');
        sessionStorage.removeItem('userSession');
        
        console.log('🔄 جلسة منتهية الصلاحية، توجيه إلى:', loginUrl.href);
        window.location.href = loginUrl.href;
    }

    handleSessionExpiration() {
        if (window.__ALLOW_GUEST_ACCESS__) {
            console.log('⚠️ Session expiration ignored in local smoke mode');
            return;
        }
        console.log('⚠️ انتهت صلاحية الجلسة');
        
        // Show immediate notification if possible
        if (typeof window.showAlert === 'function') {
            window.showAlert('انتهت صلاحية جلسة العمل. سيتم إعادة توجيهك لتسجيل الدخول.', 'warning');
        }
        
        // Use timeout to allow user to see the message
        setTimeout(() => {
            this.redirectToLoginWithSessionExpired();
        }, 2000);
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
        if (!this.authStateListeners) {
            this.authStateListeners = [];
        }
        const listenerRef = {
            mode: 'user',
            callback
        };
        this.authStateListeners.push(listenerRef);
        
        // Call immediately if already initialized
        if (this.isInitialized) {
            callback(this.currentUser);
        }

        return () => {
            this.authStateListeners = (this.authStateListeners || []).filter((item) => item !== listenerRef);
        };
    }

    onAuthStateChange(callback) {
        if (!this.authStateListeners) {
            this.authStateListeners = [];
        }
        const listenerRef = {
            mode: 'state',
            callback
        };
        this.authStateListeners.push(listenerRef);
        
        // Call immediately if already initialized
        if (this.isInitialized) {
            callback(this.currentUser ? 'login' : 'logout', this.currentUser);
        }

        return () => {
            this.authStateListeners = (this.authStateListeners || []).filter((item) => item !== listenerRef);
        };
    }

    onPermissionChange(callback) {
        if (!this.permissionChangeListeners) {
            this.permissionChangeListeners = [];
        }
        this.permissionChangeListeners.push(callback);
        
        // Call immediately if permissions are loaded
        if (this.permissions && this.permissions.length > 0) {
            callback(this.permissions);
        }
    }

    notifyAuthStateListeners(state, user) {
        if (!this.authStateListeners) {
            this.authStateListeners = [];
            return;
        }
        this.authStateListeners.forEach(listener => {
            try {
                // Backward-compatible with old function-only listeners.
                if (typeof listener === 'function') {
                    listener(user);
                    return;
                }

                if (!listener || typeof listener.callback !== 'function') {
                    return;
                }

                if (listener.mode === 'state') {
                    listener.callback(state, user);
                } else {
                    listener.callback(user);
                }
            } catch (error) {
                console.error('خطأ في استدعاء مستمع حالة المصادقة:', error);
            }
        });
    }

    notifyPermissionChangeListeners(permissions) {
        if (!this.permissionChangeListeners) {
            this.permissionChangeListeners = [];
            return;
        }
        this.permissionChangeListeners.forEach(callback => {
            try {
                callback(permissions);
            } catch (error) {
                console.error('خطأ في استدعاء مستمع تغيير الصلاحيات:', error);
            }
        });
    }

    // Utility Methods
    async getCurrentUserData() {
        try {
            if (!this.currentUser) {
                console.warn('⚠️ لا يوجد مستخدم حالي');
                return null;
            }

            // إذا كان لدينا بيانات المستخدم محملة مسبقاً
            if (this.userProfile) {
                return this.userProfile;
            }

            console.log('🔍 البحث عن بيانات المستخدم في قاعدة البيانات للبريد:', this.currentUser.email);

            // محاولة تحميل البيانات من قاعدة البيانات بعدة طرق
            if (window.db) {
                try {
                    // الطريقة الأولى: البحث بـ UID
                    console.log('🔍 البحث بـ UID:', this.currentUser.uid);
                    let userDoc = await window.db.collection('users').doc(this.currentUser.uid).get();
                    
                    // الطريقة الثانية: البحث بالبريد الإلكتروني إذا لم نجد بالـ UID
                    if (!userDoc.exists && this.currentUser.email) {
                        console.log('🔍 البحث بالبريد الإلكتروني:', this.currentUser.email);
                        const emailQuery = await window.db.collection('users').where('email', '==', this.currentUser.email).get();
                        if (!emailQuery.empty) {
                            userDoc = emailQuery.docs[0];
                            console.log('✅ تم العثور على المستخدم بالبريد الإلكتروني');
                        }
                    }

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        this.userProfile = {
                            uid: this.currentUser.uid,
                            email: this.currentUser.email,
                            displayName: this.currentUser.displayName || userData.displayName || this.currentUser.email,
                            ...userData
                        };
                        
                        console.log('✅ تم تحميل بيانات المستخدم من قاعدة البيانات:', {
                            email: this.userProfile.email,
                            role: this.userProfile.role,
                            department: this.userProfile.department
                        });
                        
                        return this.userProfile;
                    } else {
                        console.warn('⚠️ لم يتم العثور على المستخدم في قاعدة البيانات');
                    }
                } catch (dbError) {
                    console.warn('❌ فشل في تحميل بيانات المستخدم من قاعدة البيانات:', dbError.message);
                }
            } else {
                console.warn('⚠️ قاعدة البيانات غير متاحة');
            }

            // إنشاء بيانات افتراضية كحل احتياطي
            console.log('🔄 إنشاء بيانات افتراضية للمستخدم');
            const isAdminEmail = this.currentUser.email && (
                this.currentUser.email.includes('admin') || 
                this.currentUser.email === 'admin123@aman.eg' ||
                this.currentUser.email === 'admin@aman.eg'
            );

            // إنشاء بيانات افتراضية بسيطة (فقط للحسابات التي لا توجد في قاعدة البيانات)
            let department = 'عام';
            let role = 'viewer';
            
            // فقط للمديرين المعروفين
            if (isAdminEmail) {
                role = 'admin';
                department = 'admin';
                console.log('👑 تم تحديد: مدير النظام');
            } else {
                console.log('👤 تم تحديد: مستخدم عام - يجب تحديد الإدارة في قاعدة البيانات');
                console.warn('⚠️ لم يتم العثور على بيانات المستخدم في قاعدة البيانات. يُنصح بإضافة المستخدم إلى قاعدة البيانات مع تحديد الدور والإدارة.');
            }

            this.userProfile = {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName || this.currentUser.email,
                role: role,
                department: department,
                departmentId: department,
                isActive: true,
                createdAt: new Date()
            };

            this.userProfile.department = this.normalizeDepartment(this.userProfile.department);

            console.log('🔧 تم إنشاء بيانات مستخدم افتراضية:', {
                role: this.userProfile.role,
                department: this.userProfile.department,
                email: this.currentUser.email
            });
            return this.userProfile;
            
        } catch (error) {
            console.error('خطأ في الحصول على بيانات المستخدم:', error);
            return null;
        }
    }

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
            // التحقق من توفر قاعدة البيانات
            if (!window.db) {
                console.warn('⚠️ قاعدة البيانات غير متوفرة، تخطي تسجيل الحدث');
                return;
            }
            
            await window.db.collection('auth_logs').add({
                eventType: eventType,
                ...data,
                userAgent: navigator.userAgent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('فشل في تسجيل حدث المصادقة:', error);
        }
    }

    setupActivityTracking() {
        // نظام الجلسة معطل - لا حاجة لتتبع النشاط
        console.log('🔓 نظام الجلسة معطل');
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
        return !!this.currentUser;
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

    // Smart redirect based on user role and department
    redirectToDashboard() {
        try {
            // Check if role-based routing is available
            if (typeof window.redirectToDashboard === 'function') {
                window.redirectToDashboard(this.userProfile);
                return;
            }

            // Fallback logic if role-based routing is not loaded
            const role = this.normalizeRole(this.userRole);
            const department = this.userProfile?.department;
            
            console.log('🔄 توجيه بسيط بناءً على:', { role, department });

            // Simple role-based routing
            if (role === 'super_admin') {
                window.location.href = 'dashboard.html';
            } else if (department && department.includes('أرشيف')) {
                window.location.href = 'archive-dashboard.html';
            } else if (department && department.includes('قانون')) {
                window.location.href = 'legal-dashboard.html';
            } else if (department && department.includes('تحصيل')) {
                window.location.href = 'collection-dashboard.html';
            } else if (department && department.includes('ملفات')) {
                window.location.href = 'file-management-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('❌ خطأ في التوجيه الذكي:', error);
            window.location.href = 'dashboard.html';
        }
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

// Smart redirect function for post-login navigation
function redirectAfterLogin() {
    if (unifiedAuth.isAuthenticated && unifiedAuth.userProfile) {
        unifiedAuth.redirectToDashboard();
    } else {
        console.warn('⚠️ لا يمكن التوجيه: المستخدم غير مصادق عليه');
        window.location.href = 'login.html';
    }
}

// Expose to global scope
window.unifiedAuth = unifiedAuth;
window.requireAuth = requireAuth;
window.logout = logout;
window.redirectAfterLogin = redirectAfterLogin;

// Setup activity tracking when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    unifiedAuth.setupActivityTracking();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { unifiedAuth, UnifiedAuth };
}