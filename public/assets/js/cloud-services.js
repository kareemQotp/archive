/**
 * Advanced services using Firebase Cloud Functions
 * الخدمات المتقدمة باستخدام وظائف Firebase السحابية
 */

class CloudFunctionService {
    constructor() {
        try {
            this.functions = window.functions || (firebase ? firebase.functions() : null);
            this.auth = window.auth || (firebase ? firebase.auth() : null);
            this.isEmulator = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Connect to emulator if in development
            if (this.functions && this.isEmulator) {
                this.functions.useEmulator('localhost', 5001);
            }
        } catch (error) {
            console.warn('تعذر تهيئة خدمات السحابة:', error);
            this.functions = null;
            this.auth = null;
        }
    }

    /**
     * Call a cloud function with automatic error handling
     */
    async callFunction(functionName, data = {}) {
        try {
            if (!this.functions) {
                throw new Error('خدمات السحابة غير متاحة');
            }
            
            const callable = this.functions.httpsCallable(functionName);
            const result = await callable(data);
            return result.data;
        } catch (error) {
            console.error(`Error calling ${functionName}:`, error);
            
            // Handle specific error types
            if (error.code === 'unauthenticated') {
                throw new Error('يجب تسجيل الدخول للوصول لهذه الخدمة');
            } else if (error.code === 'permission-denied') {
                throw new Error('ليس لديك صلاحية للوصول لهذه الخدمة');
            } else if (error.code === 'invalid-argument') {
                throw new Error('البيانات المرسلة غير صحيحة');
            } else if (error.code === 'not-found') {
                throw new Error('العنصر المطلوب غير موجود');
            } else {
                throw new Error(error.message || 'حدث خطأ في الخدمة');
            }
        }
    }

    // Authentication Services
    async createUser(email, password, userData, role) {
        return await this.callFunction('createUserWithRole', {
            email,
            password,
            userData,
            role
        });
    }

    async updateUserRole(userId, newRole) {
        return await this.callFunction('updateUserRole', {
            userId,
            newRole
        });
    }

    async deleteUser(userId) {
        return await this.callFunction('deleteUserAccount', {
            userId
        });
    }

    async validateInvitation(invitationCode) {
        return await this.callFunction('validateInvitation', {
            invitationCode
        });
    }

    // Document Management Services
    async uploadDocument(documentData) {
        return await this.callFunction('processDocumentUpload', documentData);
    }

    async generateFileNumber() {
        return await this.callFunction('generateFileNumber');
    }

    async createFileMovement(fileNumber, fromLocation, toLocation, reason, notes = '') {
        return await this.callFunction('createFileMovement', {
            fileNumber,
            fromLocation,
            toLocation,
            reason,
            notes
        });
    }

    // Storage Services
    async processFileUpload(fileName, filePath, metadata = {}) {
        return await this.callFunction('processFileUpload', {
            fileName,
            filePath,
            metadata
        });
    }

    async scanDocument(filePath) {
        return await this.callFunction('scanDocument', {
            filePath
        });
    }

    async deleteFile(filePath) {
        return await this.callFunction('deleteFile', {
            filePath
        });
    }

    async getDownloadUrl(filePath) {
        return await this.callFunction('getDownloadUrl', {
            filePath
        });
    }

    async getFileInfo(filePath) {
        return await this.callFunction('getFileInfo', {
            filePath
        });
    }

    // Notification Services
    async sendNotification(userId, title, message, type = 'info', data = {}) {
        return await this.callFunction('sendNotification', {
            userId,
            title,
            message,
            type,
            data
        });
    }

    async markNotificationRead(notificationId) {
        return await this.callFunction('markNotificationRead', {
            notificationId
        });
    }

    // Reporting Services
    async generateReport(type = 'monthly', startDate = null, endDate = null) {
        return await this.callFunction('generateSystemReport', {
            type,
            startDate,
            endDate
        });
    }

    // System Services
    async backupDatabase() {
        return await this.callFunction('backupDatabase');
    }

    async updateFcmToken(token) {
        return await this.callFunction('updateFcmToken', {
            token
        });
    }

    async healthCheck() {
        return await this.callFunction('healthCheck');
    }
}

// Document Upload Service with Cloud Functions
class DocumentUploadService {
    constructor() {
        this.cloudService = new CloudFunctionService();
        this.storage = firebase.storage();
    }

    async uploadFile(file, metadata = {}) {
        try {
            // Validate file
            if (!this.validateFile(file)) {
                throw new Error('نوع الملف غير مدعوم');
            }

            // Generate unique file path
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const filePath = `documents/${fileName}`;

            // Upload to Firebase Storage
            const storageRef = this.storage.ref(filePath);
            const uploadTask = storageRef.put(file, {
                customMetadata: {
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                    ...metadata
                }
            });

            // Monitor upload progress
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        this.onProgress?.(progress);
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(new Error('فشل في رفع الملف'));
                    },
                    async () => {
                        try {
                            // Process file with Cloud Function
                            const result = await this.cloudService.processFileUpload(
                                file.name,
                                filePath,
                                {
                                    contentType: file.type,
                                    size: file.size,
                                    ...metadata
                                }
                            );

                            resolve({
                                filePath,
                                fileName: file.name,
                                size: file.size,
                                contentType: file.type,
                                ...result
                            });
                        } catch (error) {
                            reject(error);
                        }
                    }
                );
            });
        } catch (error) {
            throw error;
        }
    }

    validateFile(file) {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];

        const maxSize = 10 * 1024 * 1024; // 10MB

        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }

    onProgress(callback) {
        this.onProgress = callback;
    }
}

// Notification Service
class NotificationService {
    constructor() {
        this.cloudService = new CloudFunctionService();
        
        // Initialize messaging only if available
        try {
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                this.messaging = firebase.messaging();
                this.setupMessaging();
            } else {
                console.warn('Firebase Messaging not available, notification service will work in limited mode');
                this.messaging = null;
            }
        } catch (error) {
            console.warn('Failed to initialize Firebase Messaging:', error.message);
            this.messaging = null;
        }
    }

    async setupMessaging() {
        try {
            if (!this.messaging) {
                console.log('Messaging service not available, skipping setup');
                return;
            }

            // Request permission for notifications
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Only try to get token if we have a valid VAPID key
                // For now, skip token generation to avoid invalid key error
                console.log('Push notifications permission granted, but VAPID key needs configuration');
                
                // Handle foreground messages if messaging is available
                if (this.messaging && this.messaging.onMessage) {
                    this.messaging.onMessage((payload) => {
                        this.showNotification(payload.notification);
                    });
                }
            }
        } catch (error) {
            console.warn('Messaging setup skipped due to configuration issue:', error.message);
            // Don't throw the error, just log it and continue
        }
    }

    showNotification(notification) {
        // Show in-app notification
        const notificationEl = document.createElement('div');
        notificationEl.className = 'notification is-info';
        notificationEl.innerHTML = `
            <button class="delete"></button>
            <strong>${notification.title}</strong><br>
            ${notification.body}
        `;

        document.body.appendChild(notificationEl);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notificationEl.remove();
        }, 5000);

        // Handle close button
        notificationEl.querySelector('.delete').onclick = () => {
            notificationEl.remove();
        };
    }

    async sendNotification(userId, title, message, type = 'info') {
        return await this.cloudService.sendNotification(userId, title, message, type);
    }

    async markAsRead(notificationId) {
        return await this.cloudService.markNotificationRead(notificationId);
    }
}

// System Analytics Service
class AnalyticsService {
    constructor() {
        this.cloudService = new CloudFunctionService();
    }

    async generateReport(type = 'monthly', startDate = null, endDate = null) {
        try {
            const report = await this.cloudService.generateReport(type, startDate, endDate);
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    async getSystemHealth() {
        try {
            const health = await this.cloudService.healthCheck();
            return health;
        } catch (error) {
            console.error('Error checking system health:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async backup() {
        try {
            const result = await this.cloudService.backupDatabase();
            return result;
        } catch (error) {
            console.error('Error initiating backup:', error);
            throw error;
        }
    }
}

// Initialize services
const cloudFunctionService = new CloudFunctionService();
const documentUploadService = new DocumentUploadService();
const notificationService = new NotificationService();
const analyticsService = new AnalyticsService();

// Export services globally
window.cloudFunctionService = cloudFunctionService;
window.documentUploadService = documentUploadService;
window.notificationService = notificationService;
window.analyticsService = analyticsService;

// Export classes
window.CloudFunctionService = CloudFunctionService;
window.DocumentUploadService = DocumentUploadService;
window.NotificationService = NotificationService;
window.AnalyticsService = AnalyticsService;

console.log('✅ تم تحميل خدمات السحابة بنجاح');
