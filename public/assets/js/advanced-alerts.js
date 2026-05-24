/**
 * نظام التنبيهات المتقدم
 * Advanced Alert & Notification System
 */

class AdvancedAlertSystem {
    constructor() {
        this.alerts = new Map();
        this.subscribers = new Map();
        this.notificationCenter = null;
        this.badgeCount = 0;
        this.isInitialized = false;
        // Client-side state for center list
        this.currentFilter = 'all';
        this.initialLoaded = false;
        this.lastFetchedDoc = null; // for pagination
        this.settings = {
            enableSound: true,
            enableDesktop: true,
            enableBadges: true,
            autoMarkRead: false,
            groupSimilar: true,
            maxAlerts: 50,
            retention: 7 * 24 * 60 * 60 * 1000, // 7 days
            soundVolume: 0.3
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadSettings();
            this.createNotificationCenter();
            this.setupEventListeners();
            this.setupFirebaseListeners();
            await this.loadUnreadAlerts();
            this.startPeriodicCleanup();
            this.isInitialized = true;
            
            console.log('نظام التنبيهات المتقدم جاهز للعمل');
        } catch (error) {
            console.error('خطأ في تهيئة نظام التنبيهات:', error);
        }
    }

    async loadSettings() {
        try {
            const saved = localStorage.getItem('alert_system_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('خطأ في تحميل إعدادات التنبيهات:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('alert_system_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('خطأ في حفظ إعدادات التنبيهات:', error);
        }
    }

    createNotificationCenter() {
        // إنشاء مركز الإشعارات
        const centerHTML = `
            <div id="notificationCenter" class="notification-center">
                <div class="notification-center-header">
                    <h5 class="center-title">
                        <i class="fas fa-bell me-2"></i>
                        مركز التنبيهات
                        <span class="badge bg-primary ms-2" id="alertBadge">0</span>
                    </h5>
                    <div class="center-actions">
                        <button class="btn btn-sm btn-outline-primary" id="markAllRead">
                            <i class="fas fa-check-double"></i>
                            تحديد الكل كمقروء
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="clearAllAlerts">
                            <i class="fas fa-trash"></i>
                            مسح الكل
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="alertSettings">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
                
                <div class="notification-filters">
                    <button class="filter-btn active" data-filter="all">الكل</button>
                    <button class="filter-btn" data-filter="unread">غير المقروءة</button>
                    <button class="filter-btn" data-filter="urgent">عاجل</button>
                    <button class="filter-btn" data-filter="system">النظام</button>
                    <button class="filter-btn" data-filter="user">المستخدم</button>
                </div>
                
                <div class="notification-list" id="alertsList">
                    <div class="no-alerts text-center py-4">
                        <i class="fas fa-bell-slash text-muted mb-3" style="font-size: 3rem;"></i>
                        <p class="text-muted">لا توجد تنبيهات</p>
                    </div>
                </div>
                
                <div class="notification-center-footer">
                    <button class="btn btn-link btn-sm" id="loadMoreAlerts">
                        تحميل المزيد
                    </button>
                </div>
            </div>
            
            <!-- مشغل مركز الإشعارات -->
            <div class="notification-trigger" id="notificationTrigger">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notificationBadge">0</span>
                <div class="notification-pulse"></div>
            </div>
        `;

        // إضافة الستايل
        const style = document.createElement('style');
        style.textContent = `
            .notification-center {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }

            .notification-center.show {
                display: flex;
                animation: slideInLeft 0.3s ease-out;
            }

            .notification-center-header {
                padding: 1rem;
                border-bottom: 1px solid #e2e8f0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .center-title {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .center-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
            }

            .center-actions .btn {
                color: white;
                border-color: rgba(255, 255, 255, 0.3);
                font-size: 0.8rem;
            }

            .center-actions .btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.5);
            }

            .notification-filters {
                display: flex;
                padding: 0.5rem;
                gap: 0.25rem;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
                overflow-x: auto;
            }

            .filter-btn {
                padding: 0.4rem 0.8rem;
                border: none;
                background: transparent;
                color: #64748b;
                border-radius: 6px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .filter-btn:hover {
                background: #e2e8f0;
                color: #334155;
            }

            .filter-btn.active {
                background: #3b82f6;
                color: white;
            }

            .notification-list {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem;
                max-height: 400px;
            }

            .alert-item {
                padding: 0.75rem;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                border: 1px solid #e2e8f0;
                background: white;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .alert-item:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                transform: translateX(2px);
            }

            .alert-item.unread {
                border-right: 4px solid #3b82f6;
                background: #f0f9ff;
            }

            .alert-item.urgent {
                border-right: 4px solid #ef4444;
                background: #fef2f2;
            }

            .alert-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }

            .alert-title {
                font-weight: 600;
                color: #1e293b;
                font-size: 0.9rem;
                margin: 0;
            }

            .alert-time {
                font-size: 0.75rem;
                color: #64748b;
            }

            .alert-message {
                color: #475569;
                font-size: 0.85rem;
                line-height: 1.4;
                margin-bottom: 0.5rem;
            }

            .alert-meta {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 0.75rem;
                color: #64748b;
            }

            .alert-type {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .alert-actions {
                display: flex;
                gap: 0.25rem;
            }

            .alert-action {
                padding: 0.2rem 0.4rem;
                border: none;
                background: #e2e8f0;
                color: #475569;
                border-radius: 4px;
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .alert-action:hover {
                background: #cbd5e1;
            }

            .notification-trigger {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                z-index: 9998;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                transition: all 0.3s;
                /* إبقاء الزر مثبتاً أعلى يمين الشاشة */
                bottom: auto;
            }

            .notification-trigger:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
            }

            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: 600;
                transform: scale(0);
                transition: transform 0.3s;
            }

            .notification-badge.show {
                transform: scale(1);
            }

            .notification-pulse {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 50%;
                background: rgba(102, 126, 234, 0.6);
                animation: pulse 2s infinite;
                opacity: 0;
            }

            .notification-pulse.active {
                opacity: 1;
            }

            .no-alerts {
                padding: 2rem 1rem;
            }

            .notification-center-footer {
                padding: 0.75rem;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
                text-align: center;
            }

            @keyframes slideInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes pulse {
                0% {
                    transform: scale(1);
                    opacity: 0.6;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 0.3;
                }
                100% {
                    transform: scale(1.4);
                    opacity: 0;
                }
            }

            @media (max-width: 768px) {
                .notification-center {
                    right: 10px;
                    left: 10px;
                    width: auto;
                    top: 10px;
                }

                .notification-trigger {
                    right: 10px;
                    top: 10px;
                }
            }
        `;

        document.head.appendChild(style);
        
        // Ensure body exists before inserting HTML
        if (document.body) {
            document.body.insertAdjacentHTML('beforeend', centerHTML);
            this.notificationCenter = document.getElementById('notificationCenter');
            this.setupCenterEventListeners();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.insertAdjacentHTML('beforeend', centerHTML);
                this.notificationCenter = document.getElementById('notificationCenter');
                this.setupCenterEventListeners();
            });
        }
    }

    setupEventListeners() {
        // مشغل مركز الإشعارات
        const trigger = document.getElementById('notificationTrigger');
        if (trigger) {
            trigger.addEventListener('click', () => this.toggleNotificationCenter());
        }

        // إغلاق المركز عند النقر خارجه
        document.addEventListener('click', (e) => {
            if (this.notificationCenter?.classList.contains('show') && 
                !this.notificationCenter.contains(e.target) && 
                !document.getElementById('notificationTrigger').contains(e.target)) {
                this.hideNotificationCenter();
            }
        });

        // استمع لحالة تسجيل الدخول
        if (window.auth) {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    this.setupFirebaseListeners();
                } else {
                    this.clearAllAlerts();
                }
            });
        }
    }

    setupCenterEventListeners() {
        // تحديد الكل كمقروء
        document.getElementById('markAllRead')?.addEventListener('click', () => {
            this.markAllAsRead();
        });

        // مسح الكل
        document.getElementById('clearAllAlerts')?.addEventListener('click', () => {
            this.clearAllAlerts();
        });

        // فلترة التنبيهات
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterAlerts(btn.dataset.filter);
            });
        });

        // تحميل المزيد
        document.getElementById('loadMoreAlerts')?.addEventListener('click', () => {
            this.loadMoreAlerts();
        });

        // إعدادات التنبيهات
        document.getElementById('alertSettings')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
    }

    async setupFirebaseListeners() {
        if (!window.auth?.currentUser || !window.db) return;

        const userId = auth.currentUser.uid;

        // استمع للإشعارات الجديدة
        try {
            const notificationsRef = db.collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false)
                .orderBy('createdAt', 'desc');

            notificationsRef.onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = { id: change.doc.id, ...change.doc.data() };
                        this.processNewAlert(notification);
                    }
                });
            }, (err) => {
                console.warn('onSnapshot فشل، سيتم استخدام استعلام أبسط بدون ترتيب:', err?.message || err);
                // Fallback: poll periodically with simple query (no composite index required)
                this._simpleUnreadInterval && clearInterval(this._simpleUnreadInterval);
                const poll = async () => {
                    try {
                        const snap = await db.collection('notifications')
                            .where('userId', '==', userId)
                            .where('isRead', '==', false)
                            .limit(20)
                            .get();
                        snap.forEach(doc => this.processNewAlert({ id: doc.id, ...doc.data() }));
                    } catch (e) { /* ignore */ }
                };
                poll();
                this._simpleUnreadInterval = setInterval(poll, 20000);
            });
        } catch (e) {
            console.warn('فشل إعداد مستمع الإشعارات، التراجع لاستعلام بسيط:', e?.message || e);
        }

        // استمع لحركات الملفات
        const movementsRef = db.collection('file_movements')
            .orderBy('timestamp', 'desc')
            .limit(10);

        movementsRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const movement = { id: change.doc.id, ...change.doc.data() };
                    if (this.shouldNotifyAboutMovement(movement)) {
                        this.createMovementAlert(movement);
                    }
                }
            });
        });

        // استمع لسجل الأنشطة
        const activitiesRef = db.collection('activity_logs')
            .where('priority', 'in', ['high', 'urgent'])
            .orderBy('timestamp', 'desc')
            .limit(5);

        activitiesRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const activity = { id: change.doc.id, ...change.doc.data() };
                    this.createActivityAlert(activity);
                }
            });
        });
    }

    processNewAlert(notification) {
        const alert = this.createAlert({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            priority: notification.priority || 'normal',
            timestamp: notification.createdAt?.toDate() || new Date(),
            source: 'notification',
            read: false,
            data: notification.data
        });

        this.addAlert(alert);
        this.showToast(alert);
    }

    createMovementAlert(movement) {
        // استخرج الحقول بأسماء متنوعة مع بدائل آمنة
        const fileNumber = movement.fileNumber || movement.file_no || movement.fileId || movement?.data?.fileNumber || '';
        const fromRaw = movement.fromDepartmentName || movement.fromDepartment || movement.fromLocation || movement.from || movement.sourceDepartment || '';
        const toRaw = movement.toDepartmentName || movement.toDepartment || movement.toLocation || movement.to || movement.destinationDepartment || '';

        const fromLabel = this.resolveDepartmentName(fromRaw) || 'قسم غير معروف';
        const toLabel = this.resolveDepartmentName(toRaw) || 'قسم غير معروف';

        const alert = this.createAlert({
            id: `movement_${movement.id}`,
            title: 'حركة ملف جديدة',
            message: `تم نقل الملف ${fileNumber} من ${fromLabel} إلى ${toLabel}`,
            type: 'info',
            priority: movement.priority || 'normal',
            timestamp: movement.timestamp?.toDate?.() || movement.timestamp || new Date(),
            source: 'movement',
            read: false,
            data: movement
        });

        this.addAlert(alert);
    }

    createActivityAlert(activity) {
        const alert = this.createAlert({
            id: `activity_${activity.id}`,
            title: 'نشاط مهم',
            message: this.formatActivityMessage(activity),
            type: activity.category === 'security' ? 'warning' : 'info',
            priority: activity.priority,
            timestamp: activity.timestamp?.toDate() || new Date(),
            source: 'activity',
            read: false,
            data: activity
        });

        this.addAlert(alert);
        
        if (activity.priority === 'urgent') {
            this.showToast(alert);
        }
    }

    formatActivityMessage(activity) {
        const messages = {
            'file_management': 'عملية إدارة ملفات',
            'user_management': 'عملية إدارة مستخدمين',
            'security': 'حدث أمني',
            'system': 'حدث نظام',
            'auth': 'عملية مصادقة'
        };

        return messages[activity.category] || activity.action || 'نشاط جديد';
    }

    shouldNotifyAboutMovement(movement) {
        // تحديد ما إذا كان يجب إرسال تنبيه لحركة الملف
        const user = auth.currentUser;
        if (!user) return false;

        // إشعار إذا كان المستخدم مرتبط بالحركة
        return movement.movedBy === user.uid || 
               movement.assignedTo === user.uid ||
               movement.department === user.department;
    }

    createAlert(options) {
        const alert = {
            id: options.id || this.generateAlertId(),
            title: options.title,
            message: options.message,
            type: options.type || 'info',
            priority: options.priority || 'normal',
            timestamp: options.timestamp || new Date(),
            source: options.source || 'system',
            read: options.read || false,
            persistent: options.persistent || false,
            data: options.data || {},
            actions: options.actions || []
        };

        return alert;
    }

    addAlert(alert) {
        this.alerts.set(alert.id, alert);
        this.updateBadgeCount();
        this.renderAlert(alert);
        this.saveAlertsToStorage();

        // تنبيه المشتركين
        this.notifySubscribers('alert_added', alert);

        // تنظيف التنبيهات القديمة
        this.cleanupOldAlerts();
    }

    renderAlert(alert) {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        // إزالة رسالة "لا توجد تنبيهات"
        const noAlerts = alertsList.querySelector('.no-alerts');
        if (noAlerts) {
            noAlerts.style.display = 'none';
        }

        const alertElement = this.createAlertElement(alert);
        alertsList.insertBefore(alertElement, alertsList.firstChild);

        // تأثير الظهور
        setTimeout(() => {
            alertElement.style.opacity = '1';
            alertElement.style.transform = 'translateX(0)';
        }, 100);
    }

    createAlertElement(alert) {
        const element = document.createElement('div');
        element.className = `alert-item ${alert.read ? '' : 'unread'} ${alert.priority === 'urgent' ? 'urgent' : ''}`;
        element.dataset.alertId = alert.id;
        element.style.opacity = '0';
        element.style.transform = 'translateX(-20px)';
        element.style.transition = 'all 0.3s ease';

        const typeIcons = {
            'success': 'fas fa-check-circle text-success',
            'error': 'fas fa-exclamation-circle text-danger',
            'warning': 'fas fa-exclamation-triangle text-warning',
            'info': 'fas fa-info-circle text-info'
        };

        // عالج نص الرسالة لمنع undefined خاصةً لتنبيهات الحركة
        let displayMessage = alert.message || '';
        if ((!displayMessage || /undefined/i.test(String(displayMessage))) && (alert.source === 'movement' || alert?.data?.fromDepartment || alert?.data?.toDepartment)) {
            const m = alert.data || {};
            const fileNumber = m.fileNumber || m.file_no || m.fileId || '';
            const fromRaw = m.fromDepartmentName || m.fromDepartment || m.fromLocation || m.from || '';
            const toRaw = m.toDepartmentName || m.toDepartment || m.toLocation || m.to || '';
            const fromLabel = this.resolveDepartmentName(fromRaw) || 'قسم غير معروف';
            const toLabel = this.resolveDepartmentName(toRaw) || 'قسم غير معروف';
            displayMessage = `تم نقل الملف ${fileNumber} من ${fromLabel} إلى ${toLabel}`;
        }

        element.innerHTML = `
            <div class="alert-header">
                <h6 class="alert-title">${alert.title}</h6>
                <span class="alert-time">${this.formatTime(alert.timestamp)}</span>
            </div>
            <div class="alert-message">${displayMessage}</div>
            <div class="alert-meta">
                <div class="alert-type">
                    <i class="${typeIcons[alert.type] || typeIcons.info}"></i>
                    <span>${this.getSourceLabel(alert.source)}</span>
                </div>
                <div class="alert-actions">
                    ${!alert.read ? '<button class="alert-action" onclick="advancedAlertSystem.markAsRead(\'' + alert.id + '\')">تحديد كمقروء</button>' : ''}
                    <button class="alert-action" onclick="advancedAlertSystem.removeAlert('${alert.id}')">حذف</button>
                </div>
            </div>
        `;

        // النقر لعرض التفاصيل
        element.addEventListener('click', (e) => {
            if (!e.target.classList.contains('alert-action')) {
                this.showAlertDetails(alert);
                if (!alert.read) {
                    this.markAsRead(alert.id);
                }
            }
        });

        return element;
    }

    showToast(alert) {
        if (!window.notify) return;

        const options = {
            type: alert.type,
            duration: alert.priority === 'urgent' ? 10000 : 5000,
            sound: this.settings.enableSound,
            desktop: this.settings.enableDesktop,
            onClick: () => {
                this.showNotificationCenter();
                this.showAlertDetails(alert);
            }
        };

        window.notify.show({
            title: alert.title,
            message: alert.message,
            ...options
        });

        // تأثير النبض
        if (alert.priority === 'urgent') {
            this.activatePulse();
        }
    }

    // عرض تفاصيل التنبيه داخل نافذة منبثقة بسيطة
    showAlertDetails(alert) {
        try {
            // أنشئ عنصر المودال إن لم يكن موجوداً
            let modal = document.getElementById('alertDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'alertDetailsModal';
                modal.className = 'modal fade';
                modal.tabIndex = -1;
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">تفاصيل التنبيه</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body">
                                <h6 id="alertDetailsTitle" class="mb-2"></h6>
                                <p id="alertDetailsMessage" class="mb-3"></p>
                                <div class="small text-muted">
                                    <span id="alertDetailsMeta"></span>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                            </div>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
            }

            // تعبئة البيانات
            const titleEl = modal.querySelector('#alertDetailsTitle');
            const msgEl = modal.querySelector('#alertDetailsMessage');
            const metaEl = modal.querySelector('#alertDetailsMeta');
            if (titleEl) titleEl.textContent = alert.title || 'تنبيه';
            // إعادة صياغة الرسالة إذا احتوت على undefined أو كانت فارغة خاصة لتنبيهات الحركة
            let safeMessage = alert.message || '';
            if ((!safeMessage || /undefined/i.test(String(safeMessage))) && (alert.source === 'movement' || alert?.data?.fromDepartment || alert?.data?.toDepartment)) {
                const m = alert.data || {};
                const fileNumber = m.fileNumber || m.file_no || m.fileId || '';
                const fromRaw = m.fromDepartmentName || m.fromDepartment || m.fromLocation || m.from || '';
                const toRaw = m.toDepartmentName || m.toDepartment || m.toLocation || m.to || '';
                const fromLabel = this.resolveDepartmentName(fromRaw) || 'قسم غير معروف';
                const toLabel = this.resolveDepartmentName(toRaw) || 'قسم غير معروف';
                safeMessage = `تم نقل الملف ${fileNumber} من ${fromLabel} إلى ${toLabel}`;
            }
            if (msgEl) msgEl.textContent = safeMessage;
            if (metaEl) metaEl.textContent = `${this.getSourceLabel(alert.source || 'system')} • ${this.formatTime(alert.timestamp)} • ${alert.priority || 'normal'}`;

            // عرض المودال باستخدام Bootstrap إن توفر
            try {
                if (window.bootstrap && window.bootstrap.Modal) {
                    const bsModal = window.bootstrap.Modal.getOrCreateInstance(modal);
                    bsModal.show();
                } else {
                    // بديل بسيط إن لم تتوفر Bootstrap Modal
                    modal.style.display = 'block';
                    modal.classList.add('show');
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            modal.classList.remove('show');
                            modal.style.display = 'none';
                        }
                    }, { once: true });
                }
            } catch (e) {
                console.warn('تعذر عرض تفاصيل التنبيه:', e);
            }
        } catch (e) {
            console.warn('showAlertDetails فشل:', e);
        }
    }

    // تحويل معرف القسم لاسم عربي قابل للعرض
    resolveDepartmentName(value) {
        if (!value || typeof value !== 'string') return value;
        const key = value.trim().toLowerCase();
        const map = {
            'archive': 'الأرشيف',
            'legal': 'الشؤون القانونية',
            'governance': 'الحوكمة',
            'collection': 'التحصيل',
            'securitization': 'التوريق',
            'finance': 'المالية',
            'hr': 'الموارد البشرية',
            'it': 'تقنية المعلومات'
        };
        // إذا كانت القيمة بالفعل عربية أو غير معرفة بالخريطة، أعِدها كما هي
        return map[key] || value;
    }

    toggleNotificationCenter() {
        if (this.notificationCenter.classList.contains('show')) {
            this.hideNotificationCenter();
        } else {
            this.showNotificationCenter();
        }
    }

    async showNotificationCenter() {
        this.notificationCenter.classList.add('show');
        // Default to 'all' filter on open for better UX
        this.currentFilter = 'all';
        try {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            const allBtn = Array.from(document.querySelectorAll('.filter-btn')).find(b => b.dataset.filter === 'all');
            allBtn && allBtn.classList.add('active');
        } catch (_) { /* ignore */ }
        // Load initial batch if needed
        try {
            await this.ensureInitialLoaded();
        } catch (e) {
            console.warn('تعذر تحميل التنبيهات الأولية:', e?.message || e);
        }
        this.refreshAlertsList();
    }

    hideNotificationCenter() {
        this.notificationCenter.classList.remove('show');
    }

    refreshAlertsList() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        // مسح القائمة
        alertsList.innerHTML = '';

        // إضافة التنبيهات
        let source = Array.from(this.alerts.values());
        // Apply filter
        source = this.applyFilter(source, this.currentFilter);
        const sortedAlerts = source.sort((a, b) => b.timestamp - a.timestamp);

        if (sortedAlerts.length === 0) {
            alertsList.innerHTML = `
                <div class="no-alerts text-center py-4">
                    <i class="fas fa-bell-slash text-muted mb-3" style="font-size: 3rem;"></i>
                    <p class="text-muted">لا توجد تنبيهات</p>
                </div>
            `;
        } else {
            sortedAlerts.forEach(alert => {
                const element = this.createAlertElement(alert);
                alertsList.appendChild(element);
                // Apply fade-in like renderAlert()
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateX(0)';
                }, 50);
            });
        }
    }

    updateBadgeCount() {
        const unreadCount = Array.from(this.alerts.values())
            .filter(alert => !alert.read).length;

        this.badgeCount = unreadCount;

        // تحديث شارة المشغل
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('show', unreadCount > 0);
        }

        // تحديث شارة المركز
        const centerBadge = document.getElementById('alertBadge');
        if (centerBadge) {
            centerBadge.textContent = unreadCount;
        }

        // تحديث عنوان الصفحة
        if (this.settings.enableBadges && unreadCount > 0) {
            document.title = `(${unreadCount}) نظام الأرشيف`;
        } else {
            document.title = 'نظام الأرشيف';
        }
    }

    markAsRead(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) return;

        alert.read = true;
        this.alerts.set(alertId, alert);

        // تحديث العنصر في الواجهة
        const element = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (element) {
            element.classList.remove('unread');
            const actions = element.querySelector('.alert-actions');
            if (actions) {
                const markReadBtn = actions.querySelector('.alert-action');
                if (markReadBtn && markReadBtn.textContent.includes('تحديد كمقروء')) {
                    markReadBtn.remove();
                }
            }
        }

        this.updateBadgeCount();
        this.saveAlertsToStorage();

        // تحديث في Firebase إذا كان إشعار
        if (alert.source === 'notification' && window.cloudFunctionService) {
            cloudFunctionService.markNotificationRead(alertId).catch(console.error);
        }
    }

    markAllAsRead() {
        this.alerts.forEach((alert, id) => {
            if (!alert.read) {
                this.markAsRead(id);
            }
        });
    }

    removeAlert(alertId) {
        this.alerts.delete(alertId);
        
        // إزالة من الواجهة
        const element = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            setTimeout(() => element.remove(), 300);
        }

        this.updateBadgeCount();
        this.saveAlertsToStorage();

        // إظهار رسالة "لا توجد تنبيهات" إذا لزم الأمر
        if (this.alerts.size === 0) {
            setTimeout(() => this.refreshAlertsList(), 300);
        }
    }

    clearAllAlerts() {
        if (!confirm('هل أنت متأكد من حذف جميع التنبيهات؟')) return;

        this.alerts.clear();
        this.updateBadgeCount();
        this.refreshAlertsList();
        this.saveAlertsToStorage();
    }

    activatePulse() {
        const pulse = document.querySelector('.notification-pulse');
        if (pulse) {
            pulse.classList.add('active');
            setTimeout(() => pulse.classList.remove('active'), 3000);
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        if (diff < 60000) return 'الآن';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`;
        return `${Math.floor(diff / 86400000)} يوم`;
    }

    getSourceLabel(source) {
        const labels = {
            'notification': 'إشعار',
            'movement': 'حركة ملف',
            'activity': 'نشاط',
            'system': 'النظام',
            'user': 'مستخدم'
        };
        return labels[source] || 'غير محدد';
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    saveAlertsToStorage() {
        try {
            const alertsArray = Array.from(this.alerts.entries());
            localStorage.setItem('advanced_alerts', JSON.stringify(alertsArray));
        } catch (error) {
            console.warn('خطأ في حفظ التنبيهات:', error);
        }
    }

    async loadUnreadAlerts() {
        try {
            const saved = localStorage.getItem('advanced_alerts');
            if (saved) {
                const alertsArray = JSON.parse(saved);
                alertsArray.forEach(([id, alert]) => {
                    this.alerts.set(id, {
                        ...alert,
                        timestamp: new Date(alert.timestamp)
                    });
                });
                this.updateBadgeCount();
            }
        } catch (error) {
            console.warn('خطأ في تحميل التنبيهات:', error);
        }
    }

    cleanupOldAlerts() {
        const cutoff = Date.now() - this.settings.retention;
        const toDelete = [];

        this.alerts.forEach((alert, id) => {
            if (alert.timestamp < cutoff && !alert.persistent) {
                toDelete.push(id);
            }
        });

        toDelete.forEach(id => this.alerts.delete(id));

        // الاحتفاظ بعدد محدود من التنبيهات
        if (this.alerts.size > this.settings.maxAlerts) {
            const sorted = Array.from(this.alerts.entries())
                .sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            // حذف الأقدم
            for (let i = this.settings.maxAlerts; i < sorted.length; i++) {
                this.alerts.delete(sorted[i][0]);
            }
        }

        this.saveAlertsToStorage();
    }

    startPeriodicCleanup() {
        // تنظيف كل ساعة
        setInterval(() => {
            this.cleanupOldAlerts();
        }, 60 * 60 * 1000);
    }

    // اشتراك في الأحداث
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    // إلغاء الاشتراك
    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const callbacks = this.subscribers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // إشعار المشتركين
    notifySubscribers(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('خطأ في إشعار المشترك:', error);
                }
            });
        }
    }

    // API عامة
    createCustomAlert(options) {
        const alert = this.createAlert(options);
        this.addAlert(alert);
        return alert.id;
    }

    // New: Ensure we have an initial batch for the center
    async ensureInitialLoaded() {
        if (this.initialLoaded || !window.auth?.currentUser || !window.db) return;
        const userId = auth.currentUser.uid;
        try {
            let snapshot;
            try {
                const baseQuery = db.collection('notifications')
                    .where('userId', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limit(20);
                snapshot = await baseQuery.get();
                this._paginationEnabled = true;
            } catch (err) {
                // Likely missing composite index; fallback to simple query with client sort
                console.warn('الاستعلام يتطلب فهرس مركب، سيتم استخدام بديل بدون ترتيب:', err?.message || err);
                snapshot = await db.collection('notifications')
                    .where('userId', '==', userId)
                    .limit(50)
                    .get();
                this._paginationEnabled = false;
            }
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const n = doc.data();
                    const alert = this.createAlert({
                        id: doc.id,
                        title: n.title,
                        message: n.message,
                        type: n.type || 'info',
                        priority: n.priority || 'normal',
                        timestamp: n.createdAt?.toDate?.() || new Date(),
                        source: 'notification',
                        read: !!n.isRead,
                        data: n.data
                    });
                    // Avoid overriding a newer in-memory alert with older one
                    if (!this.alerts.has(alert.id)) {
                        this.alerts.set(alert.id, alert);
                    }
                });
                // Track pagination cursor only when pagination is enabled
                this.lastFetchedDoc = this._paginationEnabled ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
                this.updateBadgeCount();
            }
        } catch (e) {
            console.warn('فشل تحميل الدفعة الأولى من التنبيهات:', e?.message || e);
        } finally {
            this.initialLoaded = true;
        }
    }

    // New: Load next page
    async loadMoreAlerts() {
        if (!window.auth?.currentUser || !window.db) return;
        if (!this._paginationEnabled) {
            window.notify?.info('مركز التنبيهات', 'لا يدعم التحميل المتتابع بدون فهرس، تم تحميل أحدث العناصر فقط', { duration: 3000, sound: false });
            return;
        }
        if (!this.lastFetchedDoc) {
            // If never loaded, fetch initial instead
            await this.ensureInitialLoaded();
            this.refreshAlertsList();
            return;
        }
        const userId = auth.currentUser.uid;
        try {
            let query = db.collection('notifications')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .startAfter(this.lastFetchedDoc)
                .limit(20);
            const snapshot = await query.get();
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const n = doc.data();
                    const alert = this.createAlert({
                        id: doc.id,
                        title: n.title,
                        message: n.message,
                        type: n.type || 'info',
                        priority: n.priority || 'normal',
                        timestamp: n.createdAt?.toDate?.() || new Date(),
                        source: 'notification',
                        read: !!n.isRead,
                        data: n.data
                    });
                    if (!this.alerts.has(alert.id)) {
                        this.alerts.set(alert.id, alert);
                    }
                });
                this.lastFetchedDoc = snapshot.docs[snapshot.docs.length - 1];
                this.refreshAlertsList();
            } else {
                // No more; provide feedback
                window.notify?.info('مركز التنبيهات', 'لا توجد تنبيهات إضافية للتحميل', { duration: 2500, sound: false });
            }
        } catch (e) {
            console.warn('فشل تحميل المزيد من التنبيهات:', e?.message || e);
        }
    }

    // New: Filtering support
    filterAlerts(filter) {
        this.currentFilter = filter || 'all';
        this.refreshAlertsList();
    }

    applyFilter(alerts, filter) {
        switch (filter) {
            case 'unread':
                return alerts.filter(a => !a.read);
            case 'urgent':
                return alerts.filter(a => a.priority === 'urgent');
            case 'system':
                return alerts.filter(a => a.source === 'system' || a.type === 'system');
            case 'user':
                return alerts.filter(a => a.source === 'user');
            case 'all':
            default:
                return alerts;
        }
    }

    // تحديث الإعدادات
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    // الحصول على الإحصائيات
    getStats() {
        const alerts = Array.from(this.alerts.values());
        return {
            total: alerts.length,
            unread: alerts.filter(a => !a.read).length,
            urgent: alerts.filter(a => a.priority === 'urgent').length,
            byType: {
                success: alerts.filter(a => a.type === 'success').length,
                error: alerts.filter(a => a.type === 'error').length,
                warning: alerts.filter(a => a.type === 'warning').length,
                info: alerts.filter(a => a.type === 'info').length
            },
            bySource: {
                notification: alerts.filter(a => a.source === 'notification').length,
                movement: alerts.filter(a => a.source === 'movement').length,
                activity: alerts.filter(a => a.source === 'activity').length,
                system: alerts.filter(a => a.source === 'system').length
            }
        };
    }
}

// إنشاء النظام العام
const advancedAlertSystem = new AdvancedAlertSystem();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.AdvancedAlertSystem = AdvancedAlertSystem;
    window.advancedAlertSystem = advancedAlertSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedAlertSystem;
}
