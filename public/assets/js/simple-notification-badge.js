/**
 * أيقونة الإشعارات المبسطة
 * Simplified Notification Badge Component
 */

class SimpleNotificationBadge {
    constructor() {
        this.notifications = [];
        this.isInitialized = false;
        console.log('🔔 تم إنشاء أيقونة الإشعارات المبسطة');
    }

    /**
     * تهيئة أيقونة الإشعارات
     */
    init(containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('لم يتم العثور على حاوي الإشعارات:', containerId);
                return false;
            }

            this.createBadgeHTML(container);
            this.setupEventListeners();
            this.startListening();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة أيقونة الإشعارات بنجاح');
            return true;

        } catch (error) {
            console.error('❌ خطأ في تهيئة أيقونة الإشعارات:', error);
            return false;
        }
    }

    /**
     * إنشاء HTML الخاص بالأيقونة
     */
    createBadgeHTML(container) {
        const badgeHTML = `
            <div class="notification-badge position-relative">
                <button type="button" class="btn btn-link text-white p-2" 
                        data-bs-toggle="dropdown" aria-expanded="false"
                        title="الإشعارات">
                    <i class="bi bi-bell-fill fs-4"></i>
                    <span class="badge bg-danger position-absolute top-0 start-0 translate-middle" 
                          style="display: none;">0</span>
                </button>
                
                <div class="dropdown-menu dropdown-menu-end notification-dropdown" 
                     style="width: 350px; max-height: 400px; overflow-y: auto;">
                    <div class="dropdown-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">الإشعارات</h6>
                        <button type="button" class="btn btn-sm btn-outline-secondary" 
                                onclick="window.simpleNotificationBadge.clearAll()">
                            مسح الكل
                        </button>
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="notification-list">
                        <div class="dropdown-item text-muted text-center">
                            لا توجد إشعارات
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = badgeHTML;
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // الاستماع للإشعارات الجديدة
        window.addEventListener('newNotification', (event) => {
            this.addNotification(event.detail);
        });

        // الاستماع لنقرات الإشعارات
        document.addEventListener('click', (event) => {
            if (event.target.closest('.notification-item')) {
                const notificationId = event.target.closest('.notification-item').dataset.id;
                this.markAsRead(notificationId);
            }
        });
    }

    /**
     * بدء الاستماع للإشعارات
     */
    startListening() {
        // تحديث دوري للإحصائيات
        setInterval(() => {
            this.updateStats();
        }, 5000);

        console.log('🔊 بدء الاستماع للإشعارات');
    }

    /**
     * إضافة إشعار جديد
     */
    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // الاحتفاظ بآخر 50 إشعار فقط
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.updateBadge();
        this.updateDropdown();
    }

    /**
     * تحديث العداد
     */
    updateBadge() {
        const badge = document.querySelector('.notification-badge .badge');
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.isRead).length;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * تحديث القائمة المنسدلة
     */
    updateDropdown() {
        const listContainer = document.querySelector('.notification-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="dropdown-item text-muted text-center">
                    لا توجد إشعارات
                </div>
            `;
            return;
        }

        const notificationsHTML = this.notifications
            .slice(0, 10) // عرض آخر 10 إشعارات فقط
            .map(notification => this.createNotificationHTML(notification))
            .join('');

        listContainer.innerHTML = notificationsHTML;
    }

    /**
     * إنشاء HTML للإشعار
     */
    createNotificationHTML(notification) {
        const F = window.FormatUtils || {};
        const timeAgo = (F.timeAgo ? F.timeAgo(notification.createdAt) : this.getTimeAgo(notification.createdAt));
        const isUnread = !notification.isRead;
        const unreadClass = isUnread ? 'bg-light border-start border-primary border-3' : '';
        const esc = (txt)=> {
            if(F.escapeHtml) return F.escapeHtml(txt);
            if(txt===undefined||txt===null) return '';
            return String(txt).replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
        };

        return `
            <div class="dropdown-item notification-item ${unreadClass}" 
                 data-id="${notification.id}" 
                 style="cursor: pointer; padding: 10px;">
                <div class="d-flex align-items-start">
                    <div class="notification-icon me-2">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="flex-grow-1">
                        <div class="notification-title fw-bold small">
                            ${esc(notification.title)}
                        </div>
                        <div class="notification-message text-muted small">
                            ${esc(notification.message)}
                        </div>
                        <div class="notification-time text-muted" style="font-size: 0.75rem;">
                            ${timeAgo}
                        </div>
                    </div>
                    ${isUnread ? '<div class="notification-unread-dot bg-primary rounded-circle" style="width: 8px; height: 8px;"></div>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * الحصول على أيقونة الإشعار
     */
    getNotificationIcon(type) {
        const icons = {
            'file_upload': '<i class="bi bi-cloud-upload text-success"></i>',
            'file_movement': '<i class="bi bi-arrow-left-right text-primary"></i>',
            'security_alert': '<i class="bi bi-shield-exclamation text-danger"></i>',
            'system_alert': '<i class="bi bi-exclamation-triangle text-warning"></i>',
            'user_invitation': '<i class="bi bi-person-plus text-info"></i>',
            'maintenance': '<i class="bi bi-tools text-secondary"></i>',
            'backup_complete': '<i class="bi bi-check-circle text-success"></i>',
            'file_expiry': '<i class="bi bi-clock text-warning"></i>'
        };

        return icons[type] || '<i class="bi bi-bell text-primary"></i>';
    }

    /**
     * حساب الوقت المنقضي
     */
    getTimeAgo(date) {
    // Fallback implementation; prefer FormatUtils.timeAgo when available
    const F = window.FormatUtils || {};
    if(F.timeAgo) return F.timeAgo(date);
    const now = new Date();
    const d = new Date(date);
    const diffSec = Math.floor((now - d)/1000);
    if(diffSec < 60) return 'الآن';
    const diffMin = Math.floor(diffSec/60);
    if(diffMin < 60) return diffMin + ' دقيقة';
    const diffHr = Math.floor(diffMin/60);
    if(diffHr < 24) return diffHr + ' ساعة';
    const diffDay = Math.floor(diffHr/24);
    return diffDay + ' يوم';
    }

    /**
     * تحديد إشعار كمقروء
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            
            // تحديث الخدمة أيضاً
            if (window.simpleNotificationService) {
                window.simpleNotificationService.markAsRead(notificationId);
            }
            
            this.updateBadge();
            this.updateDropdown();
        }
    }

    /**
     * مسح جميع الإشعارات
     */
    clearAll() {
        this.notifications = [];
        
        // مسح من الخدمة أيضاً
        if (window.simpleNotificationService) {
            window.simpleNotificationService.clearAll();
        }
        
        this.updateBadge();
        this.updateDropdown();
        
        console.log('🗑️ تم مسح جميع الإشعارات من الواجهة');
    }

    /**
     * تحديث الإحصائيات
     */
    updateStats() {
        if (window.simpleNotificationService) {
            const stats = window.simpleNotificationService.getStats();
            // يمكن عرض الإحصائيات في مكان ما في الواجهة إذا أردت
        }
    }

    /**
     * الحصول على عدد الإشعارات غير المقروءة
     */
    getUnreadCount() {
        return this.notifications.filter(n => !n.isRead).length;
    }
}

// إنشاء مثيل عالمي
if (typeof window !== 'undefined') {
    window.simpleNotificationBadge = new SimpleNotificationBadge();
    window.notificationBadge = window.simpleNotificationBadge; // للتوافق مع الكود الموجود
    
    console.log('🎯 أيقونة الإشعارات المبسطة جاهزة');
}
