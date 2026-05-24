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
        // Avoid re-toasting existing unread notifications on first load
        this._feedReady = false; // becomes true after first onSnapshot callback completes
        this._knownIds = new Set(); // track seen notification IDs to prevent duplicate toasts
        this.init();
    }

    async init() {
        try {
            console.log('🔔 بدء تهيئة نظام شارة الإشعارات...');
            
            // إنشاء عنصر الشارة أولاً (يمكن عمله بدون Firebase)
            this.createNotificationBadge();
            
            // انتظار تهيئة Firebase
            await this.waitForFirebase();
            
            // تحميل الإشعارات غير المقروءة
            await this.loadUnreadNotifications();
            
            // بدء مراقبة الإشعارات الجديدة
            this.startNotificationListener();
            
            // بدء فحص دوري للإشعارات
            this.startPeriodicCheck();

            // إضافة مستمع لتغيير حالة المصادقة
            this.setupAuthStateListener();
            
            this.isInitialized = true;
            console.log('✅ نظام شارة الإشعارات جاهز');
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام شارة الإشعارات:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                // التحقق من تهيئة Firebase الأساسي
                if (window.firebase && window.db && window.auth) {
                    // التحقق من حالة المصادقة
                    if (window.unifiedAuth && window.unifiedAuth.isInitialized) {
                        // إذا كان هناك مستخدم مسجل دخول
                        if (window.unifiedAuth.currentUser) {
                            console.log('✅ Firebase والمصادقة جاهزان للإشعارات');
                            resolve();
                        } else {
                            // إذا لم يكن هناك مستخدم، انتظر قليلاً ثم جرب مرة أخرى
                            setTimeout(checkFirebase, 500);
                        }
                    } else {
                        setTimeout(checkFirebase, 200);
                    }
                } else {
                    setTimeout(checkFirebase, 300);
                }
            };
            
            // بدء الفحص مع تأخير أولي
            setTimeout(checkFirebase, 500);
        });
    }

    createNotificationBadge() {
        // البحث عن navbar - دعم كلٍ من .container و .container-fluid أو العنصر نفسه
        let navbar = document.querySelector('.navbar .container');
        if (!navbar) navbar = document.querySelector('.navbar .container-fluid');
        if (!navbar) navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // العثور على منطقة معلومات المستخدم (يمين الشريط)
        let userInfoSection = navbar.querySelector('.navbar-nav.ms-auto');
        if (!userInfoSection) {
            userInfoSection = navbar.querySelector('#navbarContent');
        }
        // إذا لم تكن موجودة، أنشئ واحدة لضمان إظهار الشارة في جميع الصفحات
        if (!userInfoSection) {
            try {
                userInfoSection = document.createElement('div');
                userInfoSection.className = 'navbar-nav ms-auto d-flex align-items-center';
                navbar.appendChild(userInfoSection);
            } catch (_) {
                return;
            }
        }

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
            // التحقق المحسن من توفر Firebase والمصادقة
            if (!window.db) {
                console.warn('⚠️ Firestore غير متاح لتحميل الإشعارات');
                return;
            }

            if (!window.unifiedAuth?.currentUser) {
                console.warn('⚠️ لا يوجد مستخدم مسجل دخول لتحميل إشعاراته');
                return;
            }

            const userId = window.unifiedAuth.currentUser.uid;
            
            // استخدام استعلام بسيط أولاً لتجنب مشكلة الفهرس
            let notificationsRef;
            try {
                // محاولة الاستعلام مع الترتيب والفلترة (يتطلب فهرس)
                notificationsRef = window.db
                    .collection('notifications')
                    .where('userId', '==', userId)
                    .where('isRead', '==', false)
                    .orderBy('createdAt', 'desc')
                    .limit(50);
            } catch (indexError) {
                // في حالة عدم وجود الفهرس، استخدم استعلام بسيط
                console.warn('🔍 الفهرس غير متوفر، استخدام استعلام بسيط للإشعارات غير المقروءة');
                notificationsRef = window.db
                    .collection('notifications')
                    .where('userId', '==', userId)
                    .limit(50);
            }

            const snapshot = await notificationsRef.get();
            
            // فلترة النتائج محلياً إذا لم نستطع استخدام الفهرس
            let unreadNotifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.isRead) {
                    unreadNotifications.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // ترتيب النتائج محلياً إذا لم نستطع استخدام الفهرس
            unreadNotifications.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    const aTime = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const bTime = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return bTime - aTime;
                }
                return 0;
            });
            
            this.unreadCount = unreadNotifications.length;
            this.notifications.clear();

            unreadNotifications.forEach(notification => {
                this.notifications.set(notification.id, notification);
            });

            this.updateBadge();
            this.updateDropdownContent();

            console.log(`📬 تم تحميل ${this.unreadCount} إشعار غير مقروء`);

        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
            // في حالة الخطأ، أعد المحاولة بعد فترة
            setTimeout(() => {
                if (this.isInitialized && window.db && window.unifiedAuth?.currentUser) {
                    this.loadUnreadNotifications();
                }
            }, 5000);
        }
    }

    startNotificationListener() {
        // التحقق المحسن من توفر Firebase والمصادقة
        if (!window.db) {
            console.warn('⚠️ Firestore غير متاح للمراقبة - سيتم إعادة المحاولة');
            // إعادة المحاولة بعد 3 ثوان
            setTimeout(() => {
                if (this.isInitialized) {
                    this.startNotificationListener();
                }
            }, 3000);
            return;
        }

        if (!window.unifiedAuth?.currentUser) {
            console.warn('⚠️ لا يوجد مستخدم مسجل دخول للمراقبة - سيتم إعادة المحاولة');
            // إعادة المحاولة بعد 3 ثوان
            setTimeout(() => {
                if (this.isInitialized) {
                    this.startNotificationListener();
                }
            }, 3000);
            return;
        }

        try {
            const userId = window.unifiedAuth.currentUser.uid;
            
            // استخدام استعلام بسيط أولاً لتجنب مشكلة الفهرس
            let notificationsRef;
            try {
                // محاولة الاستعلام مع الترتيب (يتطلب فهرس)
                notificationsRef = window.db
                    .collection('notifications')
                    .where('userId', '==', userId)
                    .orderBy('createdAt', 'desc');
            } catch (indexError) {
                // في حالة عدم وجود الفهرس، استخدم استعلام بسيط
                console.warn('🔍 الفهرس غير متوفر، استخدام استعلام بسيط');
                notificationsRef = window.db
                    .collection('notifications')
                    .where('userId', '==', userId);
            }

            console.log(`📡 بدء مراقبة الإشعارات للمستخدم: ${userId}`);

            this.unsubscribeListener = notificationsRef.onSnapshot((snapshot) => {
                // Rebuild local map from snapshot to keep it the source of truth
                const updatedMap = new Map();
                const addedIds = [];
                snapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    updatedMap.set(doc.id, data);
                });

                // Determine truly new docs since last snapshot
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        addedIds.push(change.doc.id);
                    }
                });

                // Replace internal state
                this.notifications = updatedMap;

                // Recompute unread count
                this.unreadCount = Array.from(this.notifications.values()).filter(n => !n.isRead).length;

                // Show toasts only for new items after feed is ready (avoid initial flood)
                if (this._feedReady && window.notify) {
                    addedIds.forEach(id => {
                        if (this._knownIds.has(id)) return; // already handled
                        const n = this.notifications.get(id);
                        if (n && !n.isRead) {
                            try {
                                window.notify.info(n.title, n.message, {
                                    desktop: true,
                                    onClick: () => this.handleNotificationClick(n.id)
                                });
                            } catch (e) { /* ignore toast errors */ }
                        }
                        this._knownIds.add(id);
                    });
                } else {
                    // First snapshot: record all as known but do not toast
                    Array.from(this.notifications.keys()).forEach(id => this._knownIds.add(id));
                    this._feedReady = true;
                }

                this.updateBadge();
                this.updateDropdownContent();
            }, (error) => {
                console.error('خطأ في مراقبة الإشعارات:', error);
                
                // في حالة خطأ الفهرس، قم بإعادة المحاولة بدون ترتيب
                if (error.code === 'failed-precondition' && error.message.includes('index')) {
                    console.warn('🔍 فهرس Firestore مطلوب - سيتم إعادة المحاولة بدون ترتيب');
                    
                    // إعادة المحاولة مع استعلام بسيط
                    setTimeout(() => {
                        if (this.isInitialized) {
                            this.startSimpleNotificationListener(userId);
                        }
                    }, 2000);
                } else {
                    // إعادة المحاولة بعد 5 ثوان في حالة أخطاء أخرى
                    setTimeout(() => {
                        if (this.isInitialized) {
                            this.startNotificationListener();
                        }
                    }, 5000);
                }
            });

        } catch (error) {
            console.error('خطأ في إعداد مراقبة الإشعارات:', error);
        }
    }

    startSimpleNotificationListener(userId) {
        console.log('🔔 بدء مراقبة الإشعارات البسيطة (بدون فهارس)');
        
        try {
            // استعلام بسيط بدون ترتيب
            const notificationsRef = window.db
                .collection('notifications')
                .where('userId', '==', userId);

            this.unsubscribeListener = notificationsRef.onSnapshot((snapshot) => {
                const notifications = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    notifications.push({
                        id: doc.id,
                        ...data
                    });
                });
                
                // ترتيب وفلترة محلياً
                const unreadNotifications = notifications
                    .filter(n => !n.isRead)
                    .sort((a, b) => {
                        if (a.createdAt && b.createdAt) {
                            const aTime = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                            const bTime = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                            return bTime - aTime;
                        }
                        return 0;
                    });

                // تحديث البيانات المحلية
                this.notifications.clear();
                notifications.forEach(notification => {
                    this.notifications.set(notification.id, notification);
                });
                
                this.unreadCount = unreadNotifications.length;
                this.updateBadge();
                this.updateDropdownContent();
                
                console.log(`📬 تم تحديث الإشعارات: ${this.unreadCount} غير مقروء`);
            }, (error) => {
                console.error('خطأ في المراقبة البسيطة للإشعارات:', error);
                // إعادة المحاولة بعد 10 ثوان
                setTimeout(() => {
                    if (this.isInitialized) {
                        this.startSimpleNotificationListener(userId);
                    }
                }, 10000);
            });
            
        } catch (error) {
            console.error('خطأ في إعداد المراقبة البسيطة:', error);
        }
    }

    startPeriodicCheck() {
        // فحص دوري كل دقيقة مع التحقق من الحالة
        this.checkInterval = setInterval(() => {
            if (window.db && window.unifiedAuth?.currentUser && this.isInitialized) {
                this.loadUnreadNotifications();
            } else {
                console.log('⏳ انتظار تهيئة Firebase للفحص الدوري...');
            }
        }, 60000); // كل دقيقة بدلاً من 30 ثانية لتقليل التحميل
    }

    setupAuthStateListener() {
        // مراقبة تغيير حالة المصادقة
        if (window.auth) {
            this.authUnsubscribe = window.auth.onAuthStateChanged((user) => {
                if (user && this.isInitialized) {
                    console.log('👤 تم تسجيل دخول المستخدم - إعادة تهيئة الإشعارات');
                    // إعادة تحميل الإشعارات للمستخدم الجديد
                    setTimeout(() => {
                        this.loadUnreadNotifications();
                        this.startNotificationListener();
                    }, 1000);
                } else if (!user) {
                    console.log('👤 تم تسجيل خروج المستخدم - تنظيف الإشعارات');
                    // تنظيف الإشعارات عند تسجيل الخروج
                    this.unreadCount = 0;
                    this.notifications.clear();
                    this.updateBadge();
                    this.updateDropdownContent();
                }
            });
        }
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
        const F = window.FormatUtils || {};
        const esc = s => { if (s===undefined||s===null) return ''; if (F.escapeHtml) return F.escapeHtml(String(s)); return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); };
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${esc(notification.id)}">
                <div class="notification-title">${esc(notification.title)}</div>
                <div class="notification-message">${esc(notification.message)}</div>
                <div class="notification-time">${esc(time)}</div>
            </div>`;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const F = window.FormatUtils || {};
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (F.timeAgo) return F.timeAgo(date);
        // fallback simple Arabic relative
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'الآن';
    if (minutes < 60) return `${minutes} دقيقة`;
    if (hours < 24) return `${hours} ساعة`;
    if (days < 7) return `${days} يوم`;
        return F.formatArabicDate ? F.formatArabicDate(date) : date.toLocaleDateString('ar-SA');
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
            if (!window.db || !window.unifiedAuth?.currentUser) {
                console.warn('⚠️ لا يمكن تحديد الإشعار كمقروء - Firebase غير متاح');
                return;
            }

            await window.db
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
            if (!window.db || !window.unifiedAuth?.currentUser || this.unreadCount === 0) {
                console.warn('⚠️ لا يمكن تحديد الإشعارات كمقروءة - Firebase غير متاح أو لا توجد إشعارات');
                return;
            }

            const batch = window.db.batch();
            const unreadNotifications = Array.from(this.notifications.values())
                .filter(notification => !notification.isRead);

            unreadNotifications.forEach(notification => {
                const notificationRef = window.db
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
            if (window.UX?.toast) { try { window.UX.toast('تم تحديد جميع الإشعارات كمقروءة','success'); } catch{} }
            else if (window.notify?.success){ window.notify.success('تم بنجاح','تم تحديد جميع الإشعارات كمقروءة'); }

        } catch (error) {
            console.error('خطأ في تحديد جميع الإشعارات كمقروءة:', error);
            if (window.UX?.toast) { try { window.UX.toast('فشل في تحديد الإشعارات كمقروءة','error'); } catch{} }
            else if (window.notify?.error){ window.notify.error('خطأ','فشل في تحديد الإشعارات كمقروءة'); }
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
            this.unsubscribeListener = null;
        }
        
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
            this.authUnsubscribe = null;
        }
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
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

        // تنظيف الحالة
        this.isInitialized = false;
        this.unreadCount = 0;
        this.notifications.clear();
        
        console.log('🧹 تم تنظيف نظام شارة الإشعارات');
    }
}

// إنشاء المثيل العام (مع دعم تعطيل الصفحة)
let notificationBadge;
try {
    const DISABLED = !!(window.__DISABLE_NOTIFICATIONS__ || window.__DISABLE_NOTIFICATION_BADGE__ || window.__NOTIFICATIONS_QUIET_MODE__);
    if (DISABLED) {
        // No-op implementation to avoid errors when called
        notificationBadge = {
            markAllAsRead: () => {},
            destroy: () => {},
            updateBadge: () => {},
            updateDropdownContent: () => {}
        };
        console.log('🔕 تم تعطيل نظام شارة الإشعارات لهذه الصفحة');
    } else {
        notificationBadge = new NotificationBadge();
    }
} catch (e) {
    try { notificationBadge = new NotificationBadge(); } catch(_) {}
}

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.NotificationBadge = NotificationBadge;
    window.notificationBadge = notificationBadge;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationBadge;
}
