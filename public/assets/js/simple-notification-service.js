/**
 * نظام إدارة الإشعارات المبسط للاختبار
 * Simplified Notification Service for Testing
 */

class SimpleNotificationService {
    constructor() {
        this.notifications = [];
        this.notificationCount = 0;
        console.log('🔔 تم تهيئة نظام الإشعارات المبسط');
    }

    /**
     * إرسال إشعار
     */
    async sendNotification(options) {
        try {
            const {
                recipientId,
                type = 'info',
                title,
                message,
                data = {},
                priority = 'normal'
            } = options;

            if (!recipientId || !title || !message) {
                throw new Error('المعاملات المطلوبة: recipientId, title, message');
            }

            const notification = {
                id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                recipientId,
                type,
                title,
                message,
                data,
                priority,
                isRead: false,
                createdAt: new Date(),
                readAt: null
            };

            // حفظ الإشعار محلياً
            this.notifications.push(notification);
            this.notificationCount++;

            // عرض الإشعار في الواجهة
            this.showWebNotification(notification);

            // تحديث عداد الإشعارات
            this.updateNotificationBadge();

            console.log('✅ تم إرسال الإشعار بنجاح:', notification.title);
            return notification;

        } catch (error) {
            console.error('❌ خطأ في إرسال الإشعار:', error.message);
            throw error;
        }
    }

    /**
     * إرسال إشعارات متعددة
     */
    async sendBulkNotification(recipientIds, type, notifications) {
        try {
            if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
                throw new Error('يجب تحديد قائمة المستخدمين');
            }

            const results = [];
            
            for (const recipientId of recipientIds) {
                for (const notif of notifications) {
                    const result = await this.sendNotification({
                        recipientId,
                        type,
                        title: notif.title,
                        message: notif.message,
                        data: notif.data || {}
                    });
                    results.push(result);
                }
            }

            console.log(`✅ تم إرسال ${results.length} إشعار متعدد بنجاح`);
            return results;

        } catch (error) {
            console.error('❌ خطأ في إرسال الإشعارات المتعددة:', error.message);
            throw error;
        }
    }

    /**
     * إرسال إشعار النظام
     */
    async sendSystemNotification(options) {
        try {
            const {
                type = 'system_alert',
                title,
                message,
                data = {},
                priority = 'high'
            } = options;

            // إرسال إشعار لمستخدم تجريبي
            return await this.sendNotification({
                recipientId: 'system-broadcast',
                type,
                title,
                message,
                data,
                priority
            });

        } catch (error) {
            console.error('❌ خطأ في إرسال إشعار النظام:', error.message);
            throw error;
        }
    }

    /**
     * عرض إشعار في الواجهة
     */
    showWebNotification(notification) {
        // محاولة عرض إشعار المتصفح
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/assets/images/notification-icon.png',
                badge: '/assets/images/badge-icon.png'
            });
        }

        // إرسال حدث مخصص للواجهة
        window.dispatchEvent(new CustomEvent('newNotification', {
            detail: notification
        }));
    }

    /**
     * تحديث عداد الإشعارات
     */
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge .badge');
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.isRead).length;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * الحصول على جميع الإشعارات
     */
    getNotifications(limit = 10) {
        return this.notifications
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    /**
     * تحديد إشعار كمقروء
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            notification.readAt = new Date();
            this.updateNotificationBadge();
        }
    }

    /**
     * مسح جميع الإشعارات
     */
    clearAll() {
        this.notifications = [];
        this.notificationCount = 0;
        this.updateNotificationBadge();
        console.log('🗑️ تم مسح جميع الإشعارات');
    }

    /**
     * الحصول على إحصائيات الإشعارات
     */
    getStats() {
        const total = this.notifications.length;
        const unread = this.notifications.filter(n => !n.isRead).length;
        const read = total - unread;

        return { total, unread, read };
    }
}

// إنشاء مثيل عالمي للخدمة
if (typeof window !== 'undefined') {
    window.simpleNotificationService = new SimpleNotificationService();
    window.notificationService = window.simpleNotificationService; // للتوافق مع الكود الموجود
    
    console.log('🚀 نظام الإشعارات المبسط جاهز للعمل');
}
