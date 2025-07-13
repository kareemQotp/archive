import { eventBus, EVENTS } from './events.js';
import { preferences } from './preferences.js';
import { toast } from './ui.js';

/**
 * Notification manager for handling both in-app and system notifications
 */
export class NotificationManager {
    constructor() {
        this.notificationQueue = [];
        this.processingQueue = false;
        this.hasPermission = false;
        this.initialize();
    }

    /**
     * Initialize notification system
     */
    async initialize() {
        // Check notification preferences
        if (!preferences.get('notifications.desktop')) {
            return;
        }

        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications');
            return;
        }

        // Check notification permission
        if (Notification.permission === 'granted') {
            this.hasPermission = true;
        } else if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                this.hasPermission = permission === 'granted';
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }

        // Listen for preference changes
        window.addEventListener('preferencesChanged', () => {
            this.handlePreferenceChange();
        });

        // Listen for offline/online events
        window.addEventListener('online', () => {
            this.notify({
                type: 'success',
                title: 'اتصال بالإنترنت',
                message: 'تم استعادة الاتصال بالإنترنت',
                silent: true
            });
        });

        window.addEventListener('offline', () => {
            this.notify({
                type: 'warning',
                title: 'لا يوجد اتصال',
                message: 'تم فقد الاتصال بالإنترنت',
                silent: true
            });
        });
    }

    /**
     * Show a notification
     */
    notify({ type = 'info', title, message, icon, tag, silent = false, action = null }) {
        // Add to queue
        this.notificationQueue.push({
            type,
            title,
            message,
            icon,
            tag,
            silent,
            action,
            timestamp: Date.now()
        });

        // Process queue
        this.processQueue();
    }

    /**
     * Process notification queue
     */
    async processQueue() {
        if (this.processingQueue || this.notificationQueue.length === 0) {
            return;
        }

        this.processingQueue = true;

        try {
            while (this.notificationQueue.length > 0) {
                const notification = this.notificationQueue.shift();
                await this.showNotification(notification);
            }
        } finally {
            this.processingQueue = false;
        }
    }

    /**
     * Show a single notification
     */
    async showNotification(notification) {
        // Always show in-app toast
        toast.show({
            type: notification.type,
            title: notification.title,
            message: notification.message
        });

        // Check if we should show system notification
        if (!this.hasPermission || !preferences.get('notifications.desktop')) {
            return;
        }

        // Don't show system notification if the window is focused
        if (document.hasFocus() && !notification.force) {
            return;
        }

        // Show system notification
        try {
            const systemNotification = new Notification(notification.title, {
                body: notification.message,
                icon: notification.icon || '/static/images/icon-192.png',
                tag: notification.tag,
                silent: notification.silent || !preferences.get('notifications.sound'),
                renotify: true
            });

            // Handle notification click
            if (notification.action) {
                systemNotification.onclick = () => {
                    window.focus();
                    notification.action();
                };
            }

            // Play sound if enabled
            if (preferences.get('notifications.sound') && !notification.silent) {
                await this.playNotificationSound();
            }

            // Publish event
            eventBus.publish(EVENTS.NOTIFICATION_SHOWN, {
                type: notification.type,
                title: notification.title,
                message: notification.message,
                timestamp: notification.timestamp
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    /**
     * Play notification sound
     */
    async playNotificationSound() {
        try {
            const audio = new Audio('/static/sounds/notification.mp3');
            await audio.play();
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    /**
     * Handle preference changes
     */
    handlePreferenceChange() {
        const desktopEnabled = preferences.get('notifications.desktop');
        
        if (desktopEnabled && !this.hasPermission && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                this.hasPermission = permission === 'granted';
            });
        }
    }

    /**
     * Show a document update notification
     */
    notifyDocumentUpdate(document, action) {
        if (!preferences.get('notifications.documentUpdates')) {
            return;
        }

        this.notify({
            type: 'info',
            title: 'تحديث المستند',
            message: `تم ${action} المستند "${document.title}"`,
            tag: `document-${document.id}`,
            action: () => {
                window.location.href = `/documents/${document.id}`;
            }
        });
    }

    /**
     * Show a system update notification
     */
    notifySystemUpdate(version) {
        if (!preferences.get('notifications.systemUpdates')) {
            return;
        }

        this.notify({
            type: 'info',
            title: 'تحديث النظام',
            message: `يتوفر تحديث جديد (${version}). انقر للتحديث.`,
            tag: 'system-update',
            force: true,
            action: () => {
                window.location.reload();
            }
        });
    }
}

// Export singleton instance
export const notifications = new NotificationManager();
