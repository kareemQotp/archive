/**
 * Firebase Data Connect Integration for Archive System
 * تكامل Firebase Data Connect مع نظام الأرشيف
 */

// انتظار تحميل جميع الـ dependencies
document.addEventListener('DOMContentLoaded', async () => {
    
    /**
     * تكامل Data Connect مع نظام الصلاحيات الموحد
     * Integrate Data Connect with Unified Authentication System
     */
    class DataConnectAuthIntegration {
        constructor() {
            this.isReady = false;
            this.currentUser = null;
            this.userPermissions = null;
        }

        /**
         * تهيئة التكامل
         * Initialize integration
         */
        async initialize() {
            try {
                // انتظار تهيئة Firebase Auth
                if (typeof window.unifiedAuth === 'undefined') {
                    console.warn('Unified Auth not found, waiting...');
                    await this.waitForUnifiedAuth();
                }

                // انتظار تهيئة Data Connect
                if (typeof window.archiveDataConnect === 'undefined') {
                    console.warn('Archive Data Connect not found, waiting...');
                    await this.waitForDataConnect();
                }

                // تهيئة Data Connect
                await window.archiveDataConnect.initialize();

                // ربط أحداث المصادقة
                this.setupAuthListeners();

                this.isReady = true;
                console.log('✅ Data Connect Auth Integration initialized (Mock Mode)');

                // إرسال حدث التهيئة
                window.dispatchEvent(new CustomEvent('dataConnectReady', {
                    detail: { integration: this }
                }));

            } catch (error) {
                console.error('❌ Failed to initialize Data Connect Integration:', error);
                throw error;
            }
        }

        /**
         * انتظار تحميل Unified Auth
         * Wait for Unified Auth to load
         */
        async waitForUnifiedAuth() {
            return new Promise((resolve) => {
                const checkAuth = () => {
                    if (typeof window.unifiedAuth !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkAuth, 100);
                    }
                };
                checkAuth();
            });
        }

        /**
         * انتظار تحميل Data Connect
         * Wait for Data Connect to load
         */
        async waitForDataConnect() {
            return new Promise((resolve) => {
                const checkDataConnect = () => {
                    if (typeof window.archiveDataConnect !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkDataConnect, 100);
                    }
                };
                checkDataConnect();
            });
        }

        /**
         * إعداد مستمعي أحداث المصادقة
         * Setup authentication event listeners
         */
        setupAuthListeners() {
            // الاستماع لحالة المصادقة
            window.addEventListener('userAuthenticated', (event) => {
                this.onUserAuthenticated(event.detail);
            });

            window.addEventListener('userSignedOut', () => {
                this.onUserSignedOut();
            });

            window.addEventListener('userRoleChanged', (event) => {
                this.onUserRoleChanged(event.detail);
            });
        }

        /**
         * معالج تسجيل دخول المستخدم
         * Handle user authentication
         */
        async onUserAuthenticated(userDetails) {
            try {
                this.currentUser = userDetails;
                
                // جلب ملف المستخدم من Data Connect
                const userProfile = await window.archiveDataConnect.getUserProfile(userDetails.uid);
                
                if (userProfile && userProfile.users && userProfile.users.length > 0) {
                    // دمج بيانات المستخدم
                    this.currentUser = {
                        ...userDetails,
                        dataConnect: userProfile.users[0]
                    };

                    // تحديث آخر دخول
                    await window.archiveDataConnect.updateUserLastLogin();

                    // تسجيل نشاط تسجيل الدخول
                    await this.logUserActivity('LOGIN', 'USER', userDetails.uid, 'User logged in');

                    // إرسال حدث تحديث البيانات
                    window.dispatchEvent(new CustomEvent('userDataUpdated', {
                        detail: { user: this.currentUser }
                    }));

                    console.log('✅ User profile synchronized with Data Connect (Mock)');
                } else {
                    console.warn('⚠️ User not found in Data Connect database (Mock Mode)');
                }

            } catch (error) {
                console.error('❌ Error handling user authentication:', error);
            }
        }

        /**
         * معالج تسجيل خروج المستخدم
         * Handle user sign out
         */
        async onUserSignedOut() {
            try {
                if (this.currentUser) {
                    // تسجيل نشاط تسجيل الخروج
                    await this.logUserActivity('LOGOUT', 'USER', this.currentUser.uid, 'User logged out');
                }

                this.currentUser = null;
                this.userPermissions = null;

                console.log('✅ User signed out from Data Connect (Mock)');
            } catch (error) {
                console.error('❌ Error handling user sign out:', error);
            }
        }

        /**
         * معالج تغيير دور المستخدم
         * Handle user role change
         */
        async onUserRoleChanged(roleDetails) {
            try {
                if (this.currentUser) {
                    // تسجيل نشاط تغيير الدور
                    await this.logUserActivity(
                        'ROLE_CHANGE', 
                        'USER', 
                        this.currentUser.uid, 
                        `Role changed to: ${roleDetails.newRole}`
                    );

                    // تحديث بيانات المستخدم المحلية
                    if (this.currentUser.dataConnect) {
                        this.currentUser.dataConnect.role = roleDetails.newRole;
                    }
                }
            } catch (error) {
                console.error('❌ Error handling role change:', error);
            }
        }

        /**
         * تسجيل نشاط المستخدم
         * Log user activity
         */
        async logUserActivity(action, entityType, entityId, details, metadata = null) {
            try {
                const activityData = {
                    action,
                    entityType,
                    entityId,
                    details,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                    ipAddress: await this.getUserIP(),
                    userAgent: navigator.userAgent,
                    severity: 'INFO'
                };

                await window.archiveDataConnect.logActivity(activityData);
            } catch (error) {
                console.error('❌ Error logging activity:', error);
            }
        }

        /**
         * جلب IP المستخدم
         * Get user IP address
         */
        async getUserIP() {
            try {
                // استخدام خدمة بسيطة لجلب IP
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                console.warn('Could not fetch user IP:', error);
                return 'unknown';
            }
        }

        /**
         * جلب بيانات المستخدم الحالي
         * Get current user data
         */
        getCurrentUser() {
            return this.currentUser;
        }

        /**
         * التحقق من جاهزية التكامل
         * Check if integration is ready
         */
        isIntegrationReady() {
            return this.isReady;
        }
    }

    /**
     * مساعدات للملفات مع Data Connect
     * File helpers with Data Connect
     */
    class DataConnectFileHelpers {
        
        /**
         * رفع ملف جديد
         * Upload new file
         */
        static async uploadFile(fileData, fileObject) {
            try {
                // التحقق من المصادقة
                if (!window.authIntegration || !window.authIntegration.isIntegrationReady()) {
                    throw new Error('Authentication integration not ready');
                }

                // محاكاة رفع الملف
                const mockUploadResult = {
                    downloadURL: `https://mock-storage.com/files/${fileData.fileName}`,
                    filePath: `files/${Date.now()}_${fileData.fileName}`,
                    uploadTime: new Date().toISOString()
                };
                
                // محاكاة إنشاء السجل في Data Connect
                const dbFileData = {
                    ...fileData,
                    filePath: mockUploadResult.downloadURL,
                    fileSize: fileObject.size,
                    fileType: fileObject.type
                };

                // محاكاة النتيجة
                const result = {
                    fileDocument_insert: {
                        id: 'file_' + Date.now(),
                        ...dbFileData,
                        createdAt: new Date().toISOString()
                    }
                };

                // تسجيل النشاط
                await window.authIntegration.logUserActivity(
                    'FILE_UPLOAD',
                    'FILE',
                    result.fileDocument_insert.id,
                    `File uploaded: ${fileData.fileName}`,
                    { fileSize: fileObject.size, fileType: fileObject.type }
                );

                return result;

            } catch (error) {
                console.error('Error uploading file with Data Connect:', error);
                throw error;
            }
        }

        /**
         * البحث في الملفات
         * Search files
         */
        static async searchFiles(searchTerm, filters = {}) {
            try {
                const searchFilters = {
                    searchTerm,
                    limit: 50,
                    ...filters
                };

                const result = await window.archiveDataConnect.searchFiles(searchTerm, searchFilters.limit);

                // تسجيل نشاط البحث
                if (window.authIntegration && window.authIntegration.isIntegrationReady()) {
                    await window.authIntegration.logUserActivity(
                        'FILE_SEARCH',
                        'SYSTEM',
                        null,
                        `File search: ${searchTerm}`,
                        { filters, resultsCount: result.fileDocuments?.length || 0 }
                    );
                }

                return result;

            } catch (error) {
                console.error('Error searching files:', error);
                throw error;
            }
        }
    }

    /**
     * مساعدات للإشعارات مع Data Connect
     * Notification helpers with Data Connect
     */
    class DataConnectNotificationHelpers {
        
        /**
         * جلب إشعارات المستخدم
         * Get user notifications
         */
        static async getUserNotifications(unreadOnly = false) {
            try {
                const currentUser = window.authIntegration?.getCurrentUser();
                if (!currentUser) {
                    throw new Error('User not authenticated');
                }

                const result = await window.archiveDataConnect.getUserNotifications(
                    currentUser.uid,
                    50
                );

                return result;

            } catch (error) {
                console.error('Error fetching notifications:', error);
                throw error;
            }
        }

        /**
         * قراءة إشعار
         * Mark notification as read
         */
        static async markAsRead(notificationId) {
            try {
                const result = await window.archiveDataConnect.markNotificationAsRead(notificationId);

                // تحديث العداد في الواجهة
                if (window.notificationManager) {
                    window.notificationManager.updateUnreadCount();
                }

                return result;

            } catch (error) {
                console.error('Error marking notification as read:', error);
                throw error;
            }
        }
    }

    // إنشاء وتهيئة التكامل
    window.authIntegration = new DataConnectAuthIntegration();
    window.DataConnectFileHelpers = DataConnectFileHelpers;
    window.DataConnectNotificationHelpers = DataConnectNotificationHelpers;

    try {
        await window.authIntegration.initialize();
        console.log('🚀 Data Connect Integration ready (Mock Mode)!');
    } catch (error) {
        console.error('❌ Failed to initialize Data Connect Integration:', error);
    }
});

/**
 * دوال مساعدة عامة للـ Data Connect
 * Global helper functions for Data Connect
 */

// دالة للتحقق من جاهزية Data Connect
window.isDataConnectReady = () => {
    return window.authIntegration?.isIntegrationReady() || false;
};

// دالة لجلب المستخدم الحالي مع بيانات Data Connect
window.getCurrentUserWithDataConnect = () => {
    return window.authIntegration?.getCurrentUser() || null;
};

// دالة لتسجيل الأنشطة بسهولة
window.logActivity = async (action, entityType, entityId, details, metadata = null) => {
    if (window.authIntegration?.isIntegrationReady()) {
        return await window.authIntegration.logUserActivity(action, entityType, entityId, details, metadata);
    }
};

console.log('🔗 Data Connect Integration script loaded successfully (Mock Mode)');
