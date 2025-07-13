/**
 * نظام الإشعارات المتقدم
 * Advanced Notification System
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.soundEnabled = true;
        this.maxVisible = 5;
        this.autoHideDelay = 5000;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.waitForDependencies();
            });
        } else {
            this.waitForDependencies();
        }
    }

    waitForDependencies() {
        // Wait for AppUtils to be available
        if (typeof AppUtils === 'undefined') {
            setTimeout(() => this.waitForDependencies(), 100);
            return;
        }
        
        this.createContainer();
        this.requestPermission();
        this.loadSettings();
    }

    createContainer() {
        // إنشاء حاوية الإشعارات
        if (this.container) return; // Already created
        
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.id = 'notificationContainer';
        this.container.innerHTML = `
            <style>
                .notification-container {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    z-index: 9999;
                    pointer-events: none;
                }

                .notification {
                    background: white;
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    border-right: 4px solid;
                    min-width: 320px;
                    max-width: 400px;
                    pointer-events: auto;
                    opacity: 0;
                    transform: translateX(-100%);
                    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    position: relative;
                    overflow: hidden;
                }

                .notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .notification.hide {
                    opacity: 0;
                    transform: translateX(-100%);
                }

                .notification-icon {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    color: white;
                    font-size: 12px;
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .notification-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: #2d3748;
                    font-size: 14px;
                    line-height: 1.3;
                }

                .notification-message {
                    color: #718096;
                    font-size: 13px;
                    line-height: 1.4;
                    word-wrap: break-word;
                }

                .notification-time {
                    position: absolute;
                    top: 8px;
                    left: 12px;
                    font-size: 10px;
                    color: #a0aec0;
                }

                .notification-close {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    width: 20px;
                    height: 20px;
                    border: none;
                    background: none;
                    color: #a0aec0;
                    cursor: pointer;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    transition: all 0.2s;
                    opacity: 0;
                }

                .notification:hover .notification-close {
                    opacity: 1;
                }

                .notification-close:hover {
                    background: #f7fafc;
                    color: #2d3748;
                }

                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
                    transition: width 0.1s linear;
                }

                .notification.success {
                    border-right-color: #38a169;
                }

                .notification.success .notification-icon {
                    background: #38a169;
                }

                .notification.error {
                    border-right-color: #e53e3e;
                }

                .notification.error .notification-icon {
                    background: #e53e3e;
                }

                .notification.warning {
                    border-right-color: #d69e2e;
                }

                .notification.warning .notification-icon {
                    background: #d69e2e;
                }

                .notification.info {
                    border-right-color: #3182ce;
                }

                .notification.info .notification-icon {
                    background: #3182ce;
                }

                @media (max-width: 768px) {
                    .notification-container {
                        left: 10px;
                        right: 10px;
                        top: 10px;
                    }

                    .notification {
                        min-width: auto;
                        max-width: none;
                    }
                }
            </style>
        `;
        
        // Ensure body exists before appending
        if (document.body) {
            document.body.appendChild(this.container);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.container);
            });
        }
    }

    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.log('لا يمكن طلب إذن الإشعارات:', error);
            }
        }
    }

    loadSettings() {
        const settings = AppUtils?.getFromStorage('notification_settings') || {};
        this.soundEnabled = settings.soundEnabled !== false;
        this.maxVisible = settings.maxVisible || 5;
        this.autoHideDelay = settings.autoHideDelay || 5000;
    }

    show(options = {}) {
        const {
            type = 'info',
            title = 'إشعار',
            message = '',
            duration = this.autoHideDelay,
            persistent = false,
            sound = this.soundEnabled,
            desktop = false,
            onClick = null,
            onClose = null
        } = options;

        const notification = this.createNotification({
            type,
            title,
            message,
            duration,
            persistent,
            onClick,
            onClose
        });

        // إضافة للحاوية
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // إظهار الإشعار مع تأخير قصير للتأثير
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // تشغيل صوت الإشعار
        if (sound) {
            this.playNotificationSound(type);
        }

        // إشعار سطح المكتب
        if (desktop && 'Notification' in window && Notification.permission === 'granted') {
            this.showDesktopNotification(title, message, type);
        }

        // إخفاء تلقائي
        if (!persistent && duration > 0) {
            this.scheduleHide(notification, duration);
        }

        // تنظيف الإشعارات القديمة
        this.cleanupOldNotifications();

        return notification;
    }

    createNotification({ type, title, message, onClick, onClose }) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-times',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <div class="notification-time">${timeString}</div>
            <button class="notification-close" title="إغلاق">
                <i class="fas fa-times"></i>
            </button>
            <div class="notification-progress"></div>
        `;

        // إضافة مستمعي الأحداث
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide(notification);
            if (onClose) onClose();
        });

        if (onClick) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', onClick);
        }

        return notification;
    }

    scheduleHide(notification, duration) {
        const progressBar = notification.querySelector('.notification-progress');
        let startTime = Date.now();
        
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (progress >= 100) {
                this.hide(notification);
            } else {
                requestAnimationFrame(updateProgress);
            }
        };
        
        requestAnimationFrame(updateProgress);
    }

    hide(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    cleanupOldNotifications() {
        while (this.notifications.length > this.maxVisible) {
            const oldest = this.notifications[0];
            this.hide(oldest);
        }
    }

    playNotificationSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // تردد مختلف لكل نوع
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('لا يمكن تشغيل صوت الإشعار:', error);
        }
    }

    showDesktopNotification(title, message, type) {
        try {
            const options = {
                body: message,
                icon: '/assets/images/icon-192.png',
                tag: `archive-notification-${Date.now()}`,
                requireInteraction: type === 'error',
                silent: false
            };
            
            new Notification(title, options);
        } catch (error) {
            console.log('لا يمكن إظهار إشعار سطح المكتب:', error);
        }
    }

    // وظائف مختصرة للأنواع المختلفة
    success(title, message, options = {}) {
        return this.show({ type: 'success', title, message, ...options });
    }

    error(title, message, options = {}) {
        return this.show({ type: 'error', title, message, persistent: true, ...options });
    }

    warning(title, message, options = {}) {
        return this.show({ type: 'warning', title, message, ...options });
    }

    info(title, message, options = {}) {
        return this.show({ type: 'info', title, message, ...options });
    }

    // مسح جميع الإشعارات
    clearAll() {
        this.notifications.forEach(notification => this.hide(notification));
    }

    // تحديث الإعدادات
    updateSettings(settings) {
        Object.assign(this, settings);
        if (AppUtils?.saveToStorage) {
            AppUtils.saveToStorage('notification_settings', settings);
        }
    }
}

// إنشاء مثيل عام
const notificationManager = new NotificationManager();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
    window.notify = notificationManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
