/**
 * نظام إدارة الإشعارات المتطور
 * Advanced Notification Management System
 */

// تجنب إعادة التعريف
if (typeof NotificationService === 'undefined') {
    window.NotificationService = class NotificationService {
    constructor() {
        this.isInitialized = false;
        this.notificationTypes = {
            'file_upload': {
                title: 'تحميل ملف جديد',
                icon: 'fas fa-file-upload',
                color: '#28a745'
            },
            'file_movement': {
                title: 'نقل ملف',
                icon: 'fas fa-exchange-alt',
                color: '#007bff'
            },
            'user_invitation': {
                title: 'دعوة مستخدم',
                icon: 'fas fa-user-plus',
                color: '#6f42c1'
            },
            'system_alert': {
                title: 'تنبيه النظام',
                icon: 'fas fa-exclamation-triangle',
                color: '#ffc107'
            },
            'file_expiry': {
                title: 'انتهاء صلاحية ملف',
                icon: 'fas fa-clock',
                color: '#dc3545'
            },
            'security_alert': {
                title: 'تنبيه أمني',
                icon: 'fas fa-shield-alt',
                color: '#dc3545'
            },
            'maintenance': {
                title: 'صيانة النظام',
                icon: 'fas fa-tools',
                color: '#6c757d'
            },
            'backup_complete': {
                title: 'اكتمال النسخ الاحتياطي',
                icon: 'fas fa-download',
                color: '#20c997'
            }
        };
        this.init();
    }

    async init() {
        try {
            await this.waitForDependencies();
            this.isInitialized = true;
            console.log('✅ نظام إدارة الإشعارات جاهز');
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام إدارة الإشعارات:', error);
        }
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (window.unifiedAuth && window.unifiedAuth.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    /**
     * إرسال إشعار جديد
     */
    async sendNotification(options) {
        try {
            const {
                recipientId,
                type = 'system_alert',
                title,
                message,
                data = {},
                priority = 'normal',
                channels = ['web']
            } = options;

            if (!recipientId || !title || !message) {
                throw new Error('المعاملات المطلوبة: recipientId, title, message');
            }

            const notification = {
                userId: recipientId,
                type,
                title,
                message,
                data,
                priority,
                channels,
                isRead: false,
                createdAt: new Date(),
                readAt: null
            };

            // حفظ في Firebase - استخدام الدالة المساعدة
            if (!this.isDatabaseAvailable()) {
                console.warn('قاعدة البيانات غير متاحة، سيتم إرسال الإشعار محلياً فقط');
                this.showWebNotification(notification);
                return { id: 'local-' + Date.now(), ...notification };
            }
            
            const db = this.getDatabase();
            const notificationRef = await db
                .collection('notifications')
                .add(notification);

            console.log('✅ تم إرسال الإشعار:', notificationRef.id);

            // إرسال عبر القنوات المطلوبة
            if (channels.includes('web') && recipientId === window.unifiedAuth.currentUser?.uid) {
                this.showWebNotification(notification);
            }

            if (channels.includes('push')) {
                await this.sendPushNotification(notification);
            }

            return notificationRef.id;

        } catch (error) {
            console.error('خطأ في إرسال الإشعار:', error);
            throw error;
        }
    }

    /**
     * إرسال إشعار لعدة مستخدمين
     */
    async sendBulkNotification(options) {
        try {
            const {
                recipientIds,
                type,
                title,
                message,
                data = {},
                priority = 'normal',
                channels = ['web']
            } = options;

            if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
                throw new Error('يجب تحديد قائمة المستخدمين');
            }

            if (!this.isDatabaseAvailable()) {
                console.warn('قاعدة البيانات غير متاحة، سيتم إرسال الإشعارات محلياً فقط');
                // إرسال إشعارات محلية لكل مستخدم
                return recipientIds.map(recipientId => ({
                    id: 'local-' + Date.now() + '-' + recipientId,
                    userId: recipientId,
                    type, title, message, data, priority
                }));
            }

            const db = this.getDatabase();
            const batch = db.batch();
            const notificationIds = [];

            recipientIds.forEach(recipientId => {
                const notificationRef = db.collection('notifications').doc();
                const notification = {
                    userId: recipientId,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    channels,
                    isRead: false,
                    createdAt: new Date(),
                    readAt: null
                };

                batch.set(notificationRef, notification);
                notificationIds.push(notificationRef.id);
            });

            await batch.commit();

            console.log(`✅ تم إرسال ${recipientIds.length} إشعارات`);
            return notificationIds;

        } catch (error) {
            console.error('خطأ في إرسال الإشعارات المتعددة:', error);
            throw error;
        }
    }

    /**
     * إرسال إشعار النظام لجميع المستخدمين
     */
    async sendSystemNotification(options) {
        try {
            const {
                type = 'system_alert',
                title,
                message,
                data = {},
                priority = 'high',
                excludeUsers = []
            } = options;

            // للاختبار، استخدم مستخدم تجريبي إذا لم تكن قاعدة البيانات متاحة
            if (!window.db && !window.unifiedAuth?.db) {
                console.warn('قاعدة البيانات غير متاحة، سيتم إرسال إشعار تجريبي');
                return await this.sendNotification({
                    recipientId: 'test-user',
                    type,
                    title,
                    message,
                    data,
                    priority
                });
            }
            
            const db = window.db || window.unifiedAuth.db;
            const usersSnapshot = await db
                .collection('users')
                .get();

            const recipientIds = [];
            usersSnapshot.forEach(doc => {
                const userId = doc.id;
                if (!excludeUsers.includes(userId)) {
                    recipientIds.push(userId);
                }
            });

            if (recipientIds.length === 0) {
                console.log('لا يوجد مستخدمين لإرسال الإشعار إليهم');
                return [];
            }

            return await this.sendBulkNotification({
                recipientIds,
                type,
                title,
                message,
                data,
                priority,
                channels: ['web', 'push']
            });

        } catch (error) {
            console.error('خطأ في إرسال إشعار النظام:', error);
            throw error;
        }
    }

    /**
     * عرض إشعار ويب
     */
    showWebNotification(notification) {
        if (window.notify) {
            const typeInfo = this.notificationTypes[notification.type] || 
                           this.notificationTypes['system_alert'];

            window.notify.show({
                type: this.getNotifyType(notification.priority),
                title: notification.title,
                message: notification.message,
                duration: this.getDuration(notification.priority),
                persistent: notification.priority === 'high',
                onClick: () => {
                    if (notification.data && notification.data.url) {
                        window.location.href = notification.data.url;
                    }
                }
            });
        }
    }

    /**
     * إرسال إشعار Push
     */
    async sendPushNotification(notification) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const options = {
                    body: notification.message,
                    icon: '/assets/images/icon-192.png',
                    badge: '/assets/images/badge-72.png',
                    tag: `notification-${notification.type}`,
                    data: notification.data || {},
                    requireInteraction: notification.priority === 'high'
                };

                const pushNotification = new Notification(notification.title, options);
                
                pushNotification.onclick = () => {
                    window.focus();
                    if (notification.data && notification.data.url) {
                        window.location.href = notification.data.url;
                    }
                    pushNotification.close();
                };

                // إغلاق تلقائي للإشعارات العادية
                if (notification.priority !== 'high') {
                    setTimeout(() => {
                        pushNotification.close();
                    }, 8000);
                }
            }
        } catch (error) {
            console.error('خطأ في إرسال Push Notification:', error);
        }
    }

    /**
     * إشعارات خاصة بأحداث النظام
     */
    async notifyFileUploaded(fileData, uploadedBy) {
        try {
            // إرسال للمدراء فقط
            const admins = await this.getAdminUsers();
            
            if (admins.length > 0) {
                await this.sendBulkNotification({
                    recipientIds: admins,
                    type: 'file_upload',
                    title: 'تم تحميل ملف جديد',
                    message: `تم تحميل الملف "${fileData.fileName}" بواسطة ${uploadedBy}`,
                    data: {
                        fileId: fileData.id,
                        fileName: fileData.fileName,
                        uploadedBy: uploadedBy,
                        url: `search.html?file=${fileData.id}`
                    },
                    priority: 'normal'
                });
            }
        } catch (error) {
            console.error('خطأ في إشعار تحميل الملف:', error);
        }
    }

    async notifyFileMovement(fileData, fromLocation, toLocation, movedBy) {
        try {
            // إرسال للمدراء والمستخدم الذي نقل الملف
            const admins = await this.getAdminUsers();
            const currentUserId = window.unifiedAuth.currentUser?.uid;
            
            const recipientIds = [...new Set([...admins, currentUserId])].filter(Boolean);

            if (recipientIds.length > 0) {
                await this.sendBulkNotification({
                    recipientIds,
                    type: 'file_movement',
                    title: 'تم نقل ملف',
                    message: `تم نقل الملف "${fileData.fileName}" من ${fromLocation} إلى ${toLocation}`,
                    data: {
                        fileId: fileData.id,
                        fileName: fileData.fileName,
                        fromLocation,
                        toLocation,
                        movedBy,
                        url: `movement-reports.html?file=${fileData.id}`
                    },
                    priority: 'normal'
                });
            }
        } catch (error) {
            console.error('خطأ في إشعار نقل الملف:', error);
        }
    }

    async notifyUserInvitation(invitationData, invitedBy) {
        try {
            await this.sendNotification({
                recipientId: invitationData.email,
                type: 'user_invitation',
                title: 'دعوة للانضمام للنظام',
                message: `تمت دعوتك للانضمام لنظام الأرشيف بواسطة ${invitedBy}`,
                data: {
                    invitationId: invitationData.id,
                    invitedBy,
                    role: invitationData.role,
                    url: 'register.html'
                },
                priority: 'normal',
                channels: ['web', 'push']
            });
        } catch (error) {
            console.error('خطأ في إشعار دعوة المستخدم:', error);
        }
    }

    async notifySecurityAlert(alertData) {
        try {
            await this.sendSystemNotification({
                type: 'security_alert',
                title: 'تنبيه أمني',
                message: alertData.message,
                data: alertData,
                priority: 'high'
            });
        } catch (error) {
            console.error('خطأ في إشعار التنبيه الأمني:', error);
        }
    }

    async notifySystemMaintenance(maintenanceData) {
        try {
            await this.sendSystemNotification({
                type: 'maintenance',
                title: 'صيانة النظام',
                message: maintenanceData.message,
                data: maintenanceData,
                priority: 'normal'
            });
        } catch (error) {
            console.error('خطأ في إشعار صيانة النظام:', error);
        }
    }

    /**
     * وظائف مساعدة
     */
    async getAdminUsers() {
        try {
            const usersSnapshot = await window.unifiedAuth.db
                .collection('users')
                .where('role', '==', 'admin')
                .get();

            const adminIds = [];
            usersSnapshot.forEach(doc => {
                adminIds.push(doc.id);
            });

            return adminIds;
        } catch (error) {
            console.error('خطأ في الحصول على المدراء:', error);
            return [];
        }
    }

    getNotifyType(priority) {
        switch (priority) {
            case 'high': return 'error';
            case 'normal': return 'info';
            case 'low': return 'success';
            default: return 'info';
        }
    }

    getDuration(priority) {
        switch (priority) {
            case 'high': return 0; // persistent
            case 'normal': return 5000;
            case 'low': return 3000;
            default: return 5000;
        }
    }

    /**
     * تحديث حالة الإشعار
     */
    async markAsRead(notificationId) {
        try {
            await window.unifiedAuth.db
                .collection('notifications')
                .doc(notificationId)
                .update({
                    isRead: true,
                    readAt: new Date()
                });

            console.log('✅ تم تحديد الإشعار كمقروء:', notificationId);
        } catch (error) {
            console.error('خطأ في تحديد الإشعار كمقروء:', error);
            throw error;
        }
    }

    /**
     * حذف الإشعار
     */
    async deleteNotification(notificationId) {
        try {
            await window.unifiedAuth.db
                .collection('notifications')
                .doc(notificationId)
                .delete();

            console.log('✅ تم حذف الإشعار:', notificationId);
        } catch (error) {
            console.error('خطأ في حذف الإشعار:', error);
            throw error;
        }
    }

    /**
     * الحصول على إشعارات المستخدم
     */
    async getUserNotifications(userId, limit = 50) {
        try {
            const snapshot = await window.unifiedAuth.db
                .collection('notifications')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const notifications = [];
            snapshot.forEach(doc => {
                notifications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return notifications;
        } catch (error) {
            console.error('خطأ في الحصول على إشعارات المستخدم:', error);
            return [];
        }
    }

    /**
     * إحصائيات الإشعارات
     */
    async getNotificationStats(userId) {
        try {
            const totalSnapshot = await window.unifiedAuth.db
                .collection('notifications')
                .where('userId', '==', userId)
                .get();

            const unreadSnapshot = await window.unifiedAuth.db
                .collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false)
                .get();

            return {
                total: totalSnapshot.size,
                unread: unreadSnapshot.size,
                read: totalSnapshot.size - unreadSnapshot.size
            };
        } catch (error) {
            console.error('خطأ في الحصول على إحصائيات الإشعارات:', error);
            return { total: 0, unread: 0, read: 0 };
        }
    }

    /**
     * الحصول على مرجع قاعدة البيانات
     */
    getDatabase() {
        return window.db || window.unifiedAuth?.db || null;
    }
    
    /**
     * التحقق من توفر قاعدة البيانات
     */
    isDatabaseAvailable() {
        return this.getDatabase() !== null;
    }
    }; // إنهاء تعريف الكلاس

    // إنشاء instance عام
    window.notificationService = new NotificationService();
} else {
    console.log('NotificationService already exists, skipping redefinition');
}

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    if (!window.NotificationService) {
        window.NotificationService = NotificationService;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}
