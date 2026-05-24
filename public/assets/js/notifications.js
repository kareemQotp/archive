/**
 * نظام الإشعارات المتقدم
 * Advanced Notification System
 */

// Disable/Quiet mode guard: provide no-op manager when notifications are disabled
try {
    const __DISABLE__ = !!(window.__DISABLE_NOTIFICATIONS__ || window.__NOTIFICATIONS_QUIET_MODE__);
    if (__DISABLE__) {
        if (!window.NotificationManager) {
            // Minimal no-op manager
            window.NotificationManager = function () {};
        }
        if (!window.notificationManager) {
            window.notificationManager = {
                show: () => {},
                success: () => {},
                error: () => {},
                warning: () => {},
                info: () => {},
                clearAll: () => {},
                updateSettings: () => {}
            };
        }
        if (!window.notify) {
            window.notify = window.notificationManager;
        }
    }
} catch (e) { /* ignore */ }

// تجنب إعادة التعريف
if (typeof NotificationManager === 'undefined') {
    window.NotificationManager = class NotificationManager {
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
        // Install audio unlock to comply with autoplay policies
        this.installAudioUnlock();

    this.createContainer();
        this.requestPermission();
        this.loadSettings();
    }

    installAudioUnlock() {
        try {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return; // Not supported

            // Global shared audio context and flags
            if (!window.__AUDIO_STATE__) {
                window.__AUDIO_STATE__ = {
                    context: null,
                    unlocked: false,
                    installed: false
                };
            }

            if (window.__AUDIO_STATE__.installed) return;

            const unlock = async () => {
                try {
                    const st = window.__AUDIO_STATE__;
                    st.context = st.context || new AudioCtor();
                    // Resume if suspended
                    if (st.context.state === 'suspended') {
                        await st.context.resume();
                    }
                    // Create a short silent buffer to fully unlock on some browsers
                    const osc = st.context.createOscillator();
                    const gain = st.context.createGain();
                    gain.gain.value = 0.0001;
                    osc.connect(gain);
                    gain.connect(st.context.destination);
                    osc.start(0);
                    osc.stop(st.context.currentTime + 0.05);
                    st.unlocked = true;
                    // Remove listeners after first unlock
                    document.removeEventListener('click', unlock);
                    document.removeEventListener('keydown', unlock);
                    document.removeEventListener('touchstart', unlock);
                } catch (e) {
                    // ignore; will retry on next gesture
                }
            };

            document.addEventListener('click', unlock, { passive: true });
            document.addEventListener('keydown', unlock, { passive: true });
            document.addEventListener('touchstart', unlock, { passive: true });
            window.__AUDIO_STATE__.installed = true;
        } catch (e) {
            // ignore
        }
    }

    createContainer() {
        // إنشاء حاوية الإشعارات
    if (this.container) return; // Already created

    // Avoid ID collisions with navbar bell wrapper; use a unique ID
    const existing = document.getElementById('globalNotificationContainer');
    this.container = existing || document.createElement('div');
    this.container.className = 'notification-container';
    this.container.id = 'globalNotificationContainer';
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

                /* Always show close button to allow dismiss on touch devices */
                .notification .notification-close { opacity: 1; }

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
            if (!existing) {
                document.body.appendChild(this.container);
            }
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (!document.getElementById('globalNotificationContainer')) {
                    document.body.appendChild(this.container);
                }
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

        // إضافة للحاوية (ensure container exists)
        if (!this.container) {
            this.createContainer();
        }
        if (!this.container) {
            console.warn('Notification container is missing; skipping render');
            return null;
        }
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
    const F = window.FormatUtils || {};
    const timeString = (F.formatArabicTime ? F.formatArabicTime(now) : now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit'}));
    const esc = s => { if (s===undefined || s===null) return ''; if (F.escapeHtml) return F.escapeHtml(String(s)); return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); };

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${esc(title)}</div>
                <div class="notification-message">${esc(message)}</div>
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
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return; // No Web Audio support

            // Use a shared AudioContext to minimize startup costs and warnings
            const st = window.__AUDIO_STATE__ || (window.__AUDIO_STATE__ = { context: null, unlocked: false, installed: false });
            st.context = st.context || new AudioCtor();

            // If audio is still locked, skip playing to avoid autoplay warnings
            if (!st.unlocked && st.context.state === 'suspended') {
                // Silently skip until user interacts
                // console.log('🔇 Notification sound suppressed until user interaction');
                return;
            }

            // Ensure context is running
            if (st.context.state === 'suspended') {
                // Best-effort resume; if it fails, skip
                st.context.resume?.().catch(() => {});
            }

            const oscillator = st.context.createOscillator();
            const gainNode = st.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(st.context.destination);
            
            // تردد مختلف لكل نوع
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 500, st.context.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, st.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, st.context.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, st.context.currentTime + 0.2);
            
            oscillator.start(st.context.currentTime);
            oscillator.stop(st.context.currentTime + 0.2);
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
    }; // إنهاء تعريف الكلاس

    // إنشاء instance عام
    window.notificationManager = new NotificationManager();
} else {
    console.log('NotificationManager already exists, skipping redefinition');
}

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    if (!window.notify) {
        window.notify = window.notificationManager;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
