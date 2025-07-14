/**
 * نظام شارة الإشعارات
 * Notification Badge System
 */

class NotificationBadge {
    constructor() {
        this.unreadCount = 0;
        this.notifications = new Map();
        this.maxDisplayCount = 99;
        this.isInitialized = false;
        this.checkInterval = null;
        this.init();
    }

    async init() {
        try {
            // انتظار تهيئة Firebase
            await this.waitForFirebase();
            
            // إنشاء عنصر الشارة
            this.createNotificationBadge();
            
            // تحميل الإشعارات غير المقروءة
            await this.loadUnreadNotifications();
            
            // بدء مراقبة الإشعارات الجديدة
            this.startNotificationListener();
            
            // بدء فحص دوري للإشعارات
            this.startPeriodicCheck();
            
            this.isInitialized = true;
            console.log('✅ نظام شارة الإشعارات جاهز');
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام شارة الإشعارات:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.unifiedAuth && window.unifiedAuth.isInitialized && window.unifiedAuth.currentUser) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    createNotificationBadge() {
        // البحث عن navbar
        const navbar = document.querySelector('.navbar .container');
        if (!navbar) return;

        // العثور على منطقة معلومات المستخدم
        let userInfoSection = navbar.querySelector('.navbar-nav.ms-auto');
        if (!userInfoSection) {
            userInfoSection = navbar.querySelector('#navbarContent');
        }
        
        if (!userInfoSection) return;

        // إنشاء أيقونة الإشعارات
        const notificationIcon = document.createElement('div');
        notificationIcon.className = 'notification-badge-container me-3';
        notificationIcon.innerHTML = `
            <button class="btn btn-outline-secondary position-relative notification-trigger" 
                    id="notificationTrigger" 
                    title="الإشعارات"
                    data-bs-toggle="dropdown" 
                    aria-expanded="false">
                <i class="fas fa-bell"></i>
                <span class="notification-badge badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle d-none" 
                      id="notificationBadge">0</span>
            </button>
            
            <!-- قائمة الإشعارات المنسدلة -->
            <div class="dropdown-menu dropdown-menu-end notification-dropdown" 
                 aria-labelledby="notificationTrigger" 
                 id="notificationDropdown">
                <div class="dropdown-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">الإشعارات</h6>
                    <small class="text-muted" id="notificationCount">0 إشعار</small>
                </div>
                <div class="dropdown-divider"></div>
                <div class="notification-list" id="notificationList">
                    <div class="dropdown-item-text text-center text-muted p-3">
                        <i class="fas fa-bell-slash mb-2"></i><br>
                        لا توجد إشعارات
                    </div>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-footer">
                    <a href="notification-settings.html" class="dropdown-item text-center small">
                        <i class="fas fa-cog me-1"></i>
                        إعدادات الإشعارات
                    </a>
                    <button class="dropdown-item text-center small" onclick="notificationBadge.markAllAsRead()">
                        <i class="fas fa-check-double me-1"></i>
                        تحديد الكل كمقروء
                    </button>
                </div>
            </div>
        `;

        // إضافة أيقونة الإشعارات قبل معلومات المستخدم
        const userInfoElement = userInfoSection.querySelector('#userInfo') || 
                               userInfoSection.querySelector('.navbar-text');
        
        try {
            if (userInfoElement && userInfoSection.contains(userInfoElement)) {
                userInfoSection.insertBefore(notificationIcon, userInfoElement);
            } else {
                userInfoSection.appendChild(notificationIcon);
            }
        } catch (error) {
            console.warn('خطأ في إضافة أيقونة الإشعارات:', error);
            // محاولة بديلة
            const navbarContainer = document.querySelector('.navbar .container');
            if (navbarContainer) {
                navbarContainer.appendChild(notificationIcon);
            }
        }

        // إضافة أنماط CSS
        this.addStyles();

        // إضافة مستمعي الأحداث
        this.addEventListeners();
    }

    addStyles() {
        if (document.getElementById('notificationBadgeStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'notificationBadgeStyles';
        styles.textContent = `
            .notification-badge-container {
                position: relative;
            }

            .notification-trigger {
                border: none !important;
                padding: 0.5rem 0.75rem;
                background: transparent !important;
                color: var(--bs-gray-600) !important;
                transition: all 0.3s ease;
            }

            .notification-trigger:hover {
                color: var(--bs-primary) !important;
                background: rgba(var(--bs-primary-rgb), 0.1) !important;
                transform: scale(1.05);
            }

            .notification-badge {
                font-size: 0.7rem;
                min-width: 18px;
                height: 18px;
                display: flex !important;
                align-items: center;
                justify-content: center;
                animation: pulse 2s infinite;
            }

            .notification-badge.show {
                display: flex !important;
            }

            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }

            .notification-dropdown {
                min-width: 350px;
                max-width: 400px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                border: none;
                padding: 0;
                max-height: 400px;
                overflow-y: auto;
            }

            .notification-dropdown .dropdown-header {
                background: linear-gradient(135deg, var(--primary), var(--ocean-deep));
                color: white;
                padding: 1rem;
                border-radius: 12px 12px 0 0;
                margin: 0;
            }

            .notification-item {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid #f0f0f0;
                transition: all 0.2s ease;
                cursor: pointer;
                position: relative;
            }

            .notification-item:hover {
                background: #f8f9fa;
            }

            .notification-item.unread {
                background: rgba(var(--bs-primary-rgb), 0.05);
                border-right: 3px solid var(--bs-primary);
            }

            .notification-item.unread::before {
                content: '';
                position: absolute;
                top: 50%;
                right: 8px;
                width: 8px;
                height: 8px;
                background: var(--bs-primary);
                border-radius: 50%;
                transform: translateY(-50%);
            }

            .notification-title {
                font-weight: 600;
                font-size: 0.9rem;
                color: #2d3748;
                margin-bottom: 0.25rem;
                line-height: 1.3;
            }

            .notification-message {
                font-size: 0.8rem;
                color: #718096;
                line-height: 1.4;
                margin-bottom: 0.25rem;
            }

            .notification-time {
                font-size: 0.7rem;
                color: #a0aec0;
            }

            .notification-list {
                max-height: 250px;
                overflow-y: auto;
            }

            .notification-list::-webkit-scrollbar {
                width: 4px;
            }

            .notification-list::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .notification-list::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 2px;
            }

            .dropdown-footer {
                background: #f8f9fa;
                border-radius: 0 0 12px 12px;
            }

            .dropdown-footer .dropdown-item {
                padding: 0.5rem 1rem;
                font-size: 0.85rem;
            }

            .dropdown-footer .dropdown-item:hover {
                background: #e9ecef;
            }

            /* Animation for new notifications */
            @keyframes newNotification {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }

            .notification-item.new {
                animation: newNotification 0.5s ease-out;
            }

            /* RTL support */
            [dir="rtl"] .notification-badge {
                right: auto;
                left: -8px;
            }

            [dir="rtl"] .notification-item.unread {
                border-right: none;
                border-left: 3px solid var(--bs-primary);
            }

            [dir="rtl"] .notification-item.unread::before {
                right: auto;
                left: 8px;
            }
        `;
        
        document.head.appendChild(styles);
    }

    addEventListeners() {
        // مستمع النقر على الإشعار
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-item')) {
                const notificationElement = e.target.closest('.notification-item');
                const notificationId = notificationElement.dataset.notificationId;
                if (notificationId) {
                    this.handleNotificationClick(notificationId);
                }
            }
        });

        // مستمع فتح القائمة
        document.addEventListener('shown.bs.dropdown', (e) => {
            if (e.target.closest('#notificationTrigger')) {
                this.onDropdownOpen();
            }
        });
    }

    async loadUnreadNotifications() {
        try {
            if (!window.unifiedAuth?.currentUser || !window.unifiedAuth?.db) {
                console.warn('المصادقة أو قاعدة البيانات غير متوفرة');
                return;
            }

            const userId = window.unifiedAuth.currentUser.uid;
            const notificationsRef = window.unifiedAuth.db
                .collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(50);

            const snapshot = await notificationsRef.get();
            
            this.unreadCount = snapshot.size;
            this.notifications.clear();

            snapshot.forEach(doc => {
                const data = doc.data();
                this.notifications.set(doc.id, {
                    id: doc.id,
                    ...data
                });
            });

            this.updateBadge();
            this.updateDropdownContent();

        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
        }
    }

    startNotificationListener() {
        if (!window.unifiedAuth?.currentUser || !window.unifiedAuth?.db) {
            console.warn('المصادقة أو قاعدة البيانات غير متوفرة للمراقبة');
            return;
        }

        const userId = window.unifiedAuth.currentUser.uid;
        const notificationsRef = window.unifiedAuth.db
            .collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');

        this.unsubscribeListener = notificationsRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    this.notifications.set(notification.id, notification);
                    
                    if (!notification.isRead) {
                        this.unreadCount++;
                        
                        // عرض إشعار فوري
                        if (window.notify) {
                            window.notify.info(notification.title, notification.message, {
                                desktop: true,
                                onClick: () => this.handleNotificationClick(notification.id)
                            });
                        }
                    }
                } else if (change.type === 'modified') {
                    const notification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    const oldNotification = this.notifications.get(notification.id);
                    if (oldNotification && !oldNotification.isRead && notification.isRead) {
                        this.unreadCount--;
                    }
                    
                    this.notifications.set(notification.id, notification);
                }
            });

            this.updateBadge();
            this.updateDropdownContent();
        });
    }

    startPeriodicCheck() {
        // فحص دوري كل 30 ثانية
        this.checkInterval = setInterval(() => {
            this.loadUnreadNotifications();
        }, 30000);
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            const displayCount = this.unreadCount > this.maxDisplayCount ? 
                `${this.maxDisplayCount}+` : this.unreadCount.toString();
            
            badge.textContent = displayCount;
            badge.classList.remove('d-none');
            badge.classList.add('show');
        } else {
            badge.classList.add('d-none');
            badge.classList.remove('show');
        }

        // تحديث عنوان الصفحة
        if (this.unreadCount > 0) {
            document.title = `(${this.unreadCount}) نظام الأرشيف`;
        } else {
            document.title = 'نظام الأرشيف';
        }
    }

    updateDropdownContent() {
        const notificationList = document.getElementById('notificationList');
        const notificationCount = document.getElementById('notificationCount');
        
        if (!notificationList || !notificationCount) return;

        // تحديث العداد
        const totalCount = this.notifications.size;
        notificationCount.textContent = totalCount === 0 ? 'لا توجد إشعارات' : 
            `${totalCount} إشعار${totalCount === 1 ? '' : 'ات'}`;

        // تحديث القائمة
        if (totalCount === 0) {
            notificationList.innerHTML = `
                <div class="dropdown-item-text text-center text-muted p-3">
                    <i class="fas fa-bell-slash mb-2"></i><br>
                    لا توجد إشعارات
                </div>
            `;
            return;
        }

        const sortedNotifications = Array.from(this.notifications.values())
            .sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt.toDate() - a.createdAt.toDate();
                }
                return 0;
            })
            .slice(0, 10); // عرض آخر 10 إشعارات فقط

        notificationList.innerHTML = sortedNotifications
            .map(notification => this.createNotificationHTML(notification))
            .join('');
    }

    createNotificationHTML(notification) {
        const isUnread = !notification.isRead;
        const time = this.formatTime(notification.createdAt);
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" 
                 data-notification-id="${notification.id}">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${time}</div>
            </div>
        `;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    async handleNotificationClick(notificationId) {
        try {
            const notification = this.notifications.get(notificationId);
            if (!notification) return;

            // تحديد الإشعار كمقروء
            if (!notification.isRead) {
                await this.markAsRead(notificationId);
            }

            // التنقل حسب نوع الإشعار
            if (notification.data && notification.data.url) {
                window.location.href = notification.data.url;
            } else if (notification.type) {
                this.navigateByNotificationType(notification.type, notification.data);
            }

            // إغلاق القائمة المنسدلة
            const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('notificationTrigger'));
            if (dropdown) {
                dropdown.hide();
            }

        } catch (error) {
            console.error('خطأ في معالجة النقر على الإشعار:', error);
        }
    }

    navigateByNotificationType(type, data) {
        switch (type) {
            case 'file_upload':
                window.location.href = 'search.html';
                break;
            case 'file_movement':
                window.location.href = 'movement-reports.html';
                break;
            case 'user_invitation':
                window.location.href = 'invitations.html';
                break;
            case 'system_alert':
                window.location.href = 'system-analytics.html';
                break;
            default:
                window.location.href = 'dashboard.html';
        }
    }

    async markAsRead(notificationId) {
        try {
            if (!window.unifiedAuth?.currentUser) return;

            await window.unifiedAuth.db
                .collection('notifications')
                .doc(notificationId)
                .update({
                    isRead: true,
                    readAt: new Date()
                });

            // تحديث الحالة المحلية
            const notification = this.notifications.get(notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                notification.readAt = new Date();
                this.unreadCount--;
                this.updateBadge();
                this.updateDropdownContent();
            }

        } catch (error) {
            console.error('خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    async markAllAsRead() {
        try {
            if (!window.unifiedAuth?.currentUser || this.unreadCount === 0) return;

            const batch = window.unifiedAuth.db.batch();
            const unreadNotifications = Array.from(this.notifications.values())
                .filter(notification => !notification.isRead);

            unreadNotifications.forEach(notification => {
                const notificationRef = window.unifiedAuth.db
                    .collection('notifications')
                    .doc(notification.id);
                batch.update(notificationRef, {
                    isRead: true,
                    readAt: new Date()
                });
            });

            await batch.commit();

            // تحديث الحالة المحلية
            unreadNotifications.forEach(notification => {
                notification.isRead = true;
                notification.readAt = new Date();
            });

            this.unreadCount = 0;
            this.updateBadge();
            this.updateDropdownContent();

            // عرض رسالة نجاح
            if (window.notify) {
                window.notify.success('تم بنجاح', 'تم تحديد جميع الإشعارات كمقروءة');
            }

        } catch (error) {
            console.error('خطأ في تحديد جميع الإشعارات كمقروءة:', error);
            if (window.notify) {
                window.notify.error('خطأ', 'فشل في تحديد الإشعارات كمقروءة');
            }
        }
    }

    onDropdownOpen() {
        // إعادة تحميل الإشعارات عند فتح القائمة
        this.loadUnreadNotifications();
    }

    destroy() {
        // تنظيف المستمعين والفواصل الزمنية
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
        }
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // إزالة العناصر من DOM
        const badgeContainer = document.querySelector('.notification-badge-container');
        if (badgeContainer) {
            badgeContainer.remove();
        }

        const styles = document.getElementById('notificationBadgeStyles');
        if (styles) {
            styles.remove();
        }
    }
}

// إنشاء المثيل العام
const notificationBadge = new NotificationBadge();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.NotificationBadge = NotificationBadge;
    window.notificationBadge = notificationBadge;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationBadge;
}
