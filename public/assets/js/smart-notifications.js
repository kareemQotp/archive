/**
 * نظام إدارة الإشعارات الذكية
 * Smart Notification Management System
 */

class SmartNotificationManager {
    constructor() {
        this.notificationRules = new Map();
        this.userPreferences = new Map();
        this.notificationQueues = new Map();
        this.templates = new Map();
        this.isInitialized = false;
        this.deliveryChannels = ['web', 'email', 'push'];
        this.processingInterval = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadNotificationRules();
            await this.loadUserPreferences();
            await this.loadNotificationTemplates();
            await this.setupDeliveryChannels();
            this.startQueueProcessor();
            this.isInitialized = true;
            
            console.log('نظام الإشعارات الذكية جاهز للعمل');
        } catch (error) {
            console.error('خطأ في تهيئة نظام الإشعارات الذكية:', error);
        }
    }

    async setupDeliveryChannels() {
        try {
            // تهيئة قنوات التسليم
            this.deliveryChannels = {
                web: {
                    enabled: true,
                    handler: this.sendWebNotification.bind(this)
                },
                email: {
                    enabled: true,
                    handler: this.sendEmailNotification.bind(this)
                },
                push: {
                    enabled: 'Notification' in window,
                    handler: this.sendPushNotification.bind(this)
                }
            };
        } catch (error) {
            console.error('خطأ في إعداد قنوات التسليم:', error);
        }
    }

    async sendWebNotification(notification) {
        // Implementation for web notifications
        if (window.notify) {
            window.notify.show(notification);
        }
    }

    async sendEmailNotification(notification) {
        // Implementation for email notifications
        if (window.cloudFunctionService) {
            await window.cloudFunctionService.sendEmailNotification(notification);
        }
    }

    async sendPushNotification(notification) {
        // Implementation for push notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/assets/images/icon-192.png'
            });
        }
    }

    async loadNotificationRules() {
        // قواعد الإشعارات الافتراضية
        const defaultRules = [
            {
                id: 'file_upload',
                name: 'تحميل ملف جديد',
                condition: (data) => data.type === 'file_upload',
                priority: 'normal',
                channels: ['web'],
                template: 'file_upload_template',
                recipients: ['uploader', 'department_head'],
                frequency: 'immediate'
            },
            {
                id: 'file_movement',
                name: 'نقل ملف',
                condition: (data) => data.type === 'file_movement',
                priority: 'normal',
                channels: ['web', 'email'],
                template: 'file_movement_template',
                recipients: ['mover', 'receiver', 'department_head'],
                frequency: 'immediate'
            },
            {
                id: 'urgent_activity',
                name: 'نشاط عاجل',
                condition: (data) => data.priority === 'urgent',
                priority: 'urgent',
                channels: ['web', 'push', 'email'],
                template: 'urgent_activity_template',
                recipients: ['admin', 'department_head'],
                frequency: 'immediate'
            },
            {
                id: 'security_alert',
                name: 'تنبيه أمني',
                condition: (data) => data.category === 'security',
                priority: 'urgent',
                channels: ['web', 'push', 'email'],
                template: 'security_alert_template',
                recipients: ['admin', 'security_team'],
                frequency: 'immediate'
            },
            {
                id: 'system_maintenance',
                name: 'صيانة النظام',
                condition: (data) => data.type === 'system_maintenance',
                priority: 'high',
                channels: ['web', 'email'],
                template: 'system_maintenance_template',
                recipients: ['all_users'],
                frequency: 'immediate'
            },
            {
                id: 'document_expiry',
                name: 'انتهاء صلاحية وثيقة',
                condition: (data) => data.type === 'document_expiry',
                priority: 'high',
                channels: ['web', 'email'],
                template: 'document_expiry_template',
                recipients: ['document_owner', 'department_head'],
                frequency: 'daily'
            },
            {
                id: 'user_login',
                name: 'تسجيل دخول مستخدم',
                condition: (data) => data.type === 'user_login' && data.suspicious,
                priority: 'high',
                channels: ['web'],
                template: 'suspicious_login_template',
                recipients: ['admin', 'security_team'],
                frequency: 'immediate'
            },
            {
                id: 'storage_quota',
                name: 'حصة التخزين',
                condition: (data) => data.type === 'storage_quota' && data.usage > 80,
                priority: 'normal',
                channels: ['web', 'email'],
                template: 'storage_quota_template',
                recipients: ['admin', 'department_head'],
                frequency: 'weekly'
            }
        ];

        defaultRules.forEach(rule => {
            this.notificationRules.set(rule.id, rule);
        });

        // تحميل القواعد المخصصة من Firebase
        try {
            if (window.db) {
                // استعلام بسيط بدون فهارس معقدة
                const customRules = await db.collection('notification_rules')
                    .limit(50)
                    .get();
                    
                customRules.forEach(doc => {
                    const rule = doc.data();
                    this.notificationRules.set(doc.id, rule);
                });
                
                console.log(`تم تحميل ${customRules.size} قاعدة مخصصة`);
            }
        } catch (error) {
            console.warn('خطأ في تحميل القواعد المخصصة، سيتم استخدام القواعد الافتراضية:', error.message);
        }
    }

    async loadUserPreferences() {
        try {
            if (window.auth?.currentUser && window.db) {
                const userId = auth.currentUser.uid;
                const prefDoc = await db.collection('user_preferences')
                    .doc(userId).get();
                
                if (prefDoc.exists) {
                    const prefs = prefDoc.data();
                    this.userPreferences.set(userId, prefs);
                } else {
                    // إعدادات افتراضية
                    const defaultPrefs = {
                        channels: {
                            web: true,
                            email: true,
                            push: false
                        },
                        frequency: {
                            immediate: true,
                            daily: true,
                            weekly: true,
                            monthly: false
                        },
                        types: {
                            file_upload: true,
                            file_movement: true,
                            urgent_activity: true,
                            security_alert: true,
                            system_maintenance: true,
                            document_expiry: true,
                            user_login: false,
                            storage_quota: true
                        },
                        quietHours: {
                            enabled: false,
                            start: '22:00',
                            end: '08:00'
                        }
                    };
                    
                    this.userPreferences.set(userId, defaultPrefs);
                    await this.saveUserPreferences(userId, defaultPrefs);
                }
            }
        } catch (error) {
            console.warn('خطأ في تحميل تفضيلات المستخدم:', error);
        }
    }

    async loadNotificationTemplates() {
        const defaultTemplates = [
            {
                id: 'file_upload_template',
                subject: 'تم تحميل ملف جديد',
                content: 'تم تحميل الملف {{fileName}} بواسطة {{uploaderName}} في {{timestamp}}',
                variables: ['fileName', 'uploaderName', 'timestamp']
            },
            {
                id: 'file_movement_template',
                subject: 'تم نقل ملف',
                content: 'تم نقل الملف {{fileNumber}} من {{fromLocation}} إلى {{toLocation}} بواسطة {{moverName}}',
                variables: ['fileNumber', 'fromLocation', 'toLocation', 'moverName']
            },
            {
                id: 'urgent_activity_template',
                subject: 'تنبيه عاجل',
                content: 'حدث نشاط عاجل: {{activityDescription}} في {{timestamp}}',
                variables: ['activityDescription', 'timestamp']
            },
            {
                id: 'security_alert_template',
                subject: 'تنبيه أمني',
                content: 'تم رصد حدث أمني: {{securityEvent}} من {{sourceIP}} في {{timestamp}}',
                variables: ['securityEvent', 'sourceIP', 'timestamp']
            },
            {
                id: 'system_maintenance_template',
                subject: 'صيانة النظام',
                content: 'ستتم صيانة النظام في {{maintenanceTime}}. المدة المتوقعة: {{duration}}',
                variables: ['maintenanceTime', 'duration']
            },
            {
                id: 'document_expiry_template',
                subject: 'انتهاء صلاحية وثيقة',
                content: 'ستنتهي صلاحية الوثيقة {{documentName}} في {{expiryDate}}',
                variables: ['documentName', 'expiryDate']
            },
            {
                id: 'suspicious_login_template',
                subject: 'تسجيل دخول مشبوه',
                content: 'تم رصد تسجيل دخول مشبوه للمستخدم {{username}} من {{location}} في {{timestamp}}',
                variables: ['username', 'location', 'timestamp']
            },
            {
                id: 'storage_quota_template',
                subject: 'تحذير حصة التخزين',
                content: 'تم استخدام {{usagePercent}}% من حصة التخزين. المساحة المتبقية: {{remainingSpace}}',
                variables: ['usagePercent', 'remainingSpace']
            }
        ];

        defaultTemplates.forEach(template => {
            this.templates.set(template.id, template);
        });
    }

    async processNotification(data) {
        if (!this.isInitialized) {
            console.warn('نظام الإشعارات لم يتم تهيئته بعد');
            return;
        }

        const matchingRules = this.findMatchingRules(data);
        
        for (const rule of matchingRules) {
            await this.createNotifications(rule, data);
        }
    }

    findMatchingRules(data) {
        const matchingRules = [];
        
        this.notificationRules.forEach(rule => {
            try {
                if (rule.condition(data)) {
                    matchingRules.push(rule);
                }
            } catch (error) {
                console.error('خطأ في تقييم قاعدة الإشعار:', error);
            }
        });

        return matchingRules;
    }

    async createNotifications(rule, data) {
        const recipients = await this.resolveRecipients(rule.recipients, data);
        const template = this.templates.get(rule.template);
        
        if (!template) {
            console.warn('قالب الإشعار غير موجود:', rule.template);
            return;
        }

        for (const recipient of recipients) {
            const userPrefs = this.userPreferences.get(recipient.id) || {};
            
            // التحقق من تفضيلات المستخدم
            if (!this.shouldSendNotification(rule, userPrefs)) {
                continue;
            }

            const notification = {
                id: this.generateNotificationId(),
                recipientId: recipient.id,
                ruleId: rule.id,
                type: rule.id,
                priority: rule.priority,
                subject: this.processTemplate(template.subject, data),
                content: this.processTemplate(template.content, data),
                channels: this.getActiveChannels(rule.channels, userPrefs),
                frequency: rule.frequency,
                scheduledTime: this.calculateScheduledTime(rule.frequency),
                createdAt: new Date(),
                status: 'pending',
                data: data
            };

            await this.queueNotification(notification);
        }
    }

    async resolveRecipients(recipients, data) {
        const resolvedRecipients = [];

        for (const recipient of recipients) {
            switch (recipient) {
                case 'uploader':
                    if (data.uploaderId) {
                        resolvedRecipients.push(await this.getUserById(data.uploaderId));
                    }
                    break;
                
                case 'mover':
                    if (data.moverId) {
                        resolvedRecipients.push(await this.getUserById(data.moverId));
                    }
                    break;
                
                case 'receiver':
                    if (data.receiverId) {
                        resolvedRecipients.push(await this.getUserById(data.receiverId));
                    }
                    break;
                
                case 'document_owner':
                    if (data.ownerId) {
                        resolvedRecipients.push(await this.getUserById(data.ownerId));
                    }
                    break;
                
                case 'department_head':
                    const deptHead = await this.getDepartmentHead(data.department);
                    if (deptHead) {
                        resolvedRecipients.push(deptHead);
                    }
                    break;
                
                case 'admin':
                    const admins = await this.getAdmins();
                    resolvedRecipients.push(...admins);
                    break;
                
                case 'security_team':
                    const securityTeam = await this.getSecurityTeam();
                    resolvedRecipients.push(...securityTeam);
                    break;
                
                case 'all_users':
                    const allUsers = await this.getAllUsers();
                    resolvedRecipients.push(...allUsers);
                    break;
                
                default:
                    // معرف مستخدم مباشر
                    if (recipient.startsWith('user_')) {
                        const userId = recipient.replace('user_', '');
                        resolvedRecipients.push(await this.getUserById(userId));
                    }
            }
        }

        return resolvedRecipients.filter(r => r !== null);
    }

    shouldSendNotification(rule, userPrefs) {
        // التحقق من نوع الإشعار
        if (userPrefs.types && !userPrefs.types[rule.id]) {
            return false;
        }

        // التحقق من التكرار
        if (userPrefs.frequency && !userPrefs.frequency[rule.frequency]) {
            return false;
        }

        // التحقق من الساعات الهادئة
        if (userPrefs.quietHours && userPrefs.quietHours.enabled) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const quietStart = this.parseTime(userPrefs.quietHours.start);
            const quietEnd = this.parseTime(userPrefs.quietHours.end);
            
            if (rule.frequency === 'immediate' && rule.priority !== 'urgent') {
                if (quietStart < quietEnd) {
                    if (currentTime >= quietStart && currentTime <= quietEnd) {
                        return false;
                    }
                } else {
                    if (currentTime >= quietStart || currentTime <= quietEnd) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    getActiveChannels(ruleChannels, userPrefs) {
        const activeChannels = [];
        
        for (const channel of ruleChannels) {
            if (userPrefs.channels && userPrefs.channels[channel]) {
                activeChannels.push(channel);
            }
        }

        return activeChannels.length > 0 ? activeChannels : ['web'];
    }

    calculateScheduledTime(frequency) {
        const now = new Date();
        
        switch (frequency) {
            case 'immediate':
                return now;
            
            case 'daily':
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                return tomorrow;
            
            case 'weekly':
                const nextWeek = new Date(now);
                nextWeek.setDate(nextWeek.getDate() + 7);
                nextWeek.setHours(9, 0, 0, 0);
                return nextWeek;
            
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                nextMonth.setDate(1);
                nextMonth.setHours(9, 0, 0, 0);
                return nextMonth;
            
            default:
                return now;
        }
    }

    async queueNotification(notification) {
        const queueKey = notification.frequency;
        
        if (!this.notificationQueues.has(queueKey)) {
            this.notificationQueues.set(queueKey, []);
        }
        
        this.notificationQueues.get(queueKey).push(notification);
        
        // حفظ في Firebase
        if (window.db) {
            try {
                await db.collection('notification_queue').add(notification);
            } catch (error) {
                console.error('خطأ في حفظ الإشعار في قاعدة البيانات:', error);
            }
        }
    }

    startQueueProcessor() {
        // معالجة الإشعارات الفورية كل 10 ثوان
        setInterval(() => {
            this.processQueue('immediate');
        }, 10000);

        // معالجة الإشعارات اليومية كل ساعة
        setInterval(() => {
            this.processQueue('daily');
        }, 60 * 60 * 1000);

        // معالجة الإشعارات الأسبوعية كل يوم
        setInterval(() => {
            this.processQueue('weekly');
        }, 24 * 60 * 60 * 1000);

        // معالجة الإشعارات الشهرية كل يوم
        setInterval(() => {
            this.processQueue('monthly');
        }, 24 * 60 * 60 * 1000);
    }

    async processQueue(frequency) {
        const queue = this.notificationQueues.get(frequency);
        if (!queue || queue.length === 0) return;

        const now = new Date();
        const readyNotifications = queue.filter(n => n.scheduledTime <= now);
        
        for (const notification of readyNotifications) {
            await this.deliverNotification(notification);
            
            // إزالة من القائمة
            const index = queue.indexOf(notification);
            if (index > -1) {
                queue.splice(index, 1);
            }
        }
    }

    async deliverNotification(notification) {
        for (const channel of notification.channels) {
            try {
                await this.sendViaChannel(channel, notification);
            } catch (error) {
                console.error(`خطأ في إرسال الإشعار عبر ${channel}:`, error);
            }
        }

        // تحديث الحالة
        notification.status = 'sent';
        notification.sentAt = new Date();

        // حفظ في سجل الإشعارات
        if (window.db) {
            try {
                await db.collection('sent_notifications').add(notification);
            } catch (error) {
                console.error('خطأ في حفظ سجل الإشعار:', error);
            }
        }
    }

    async sendViaChannel(channel, notification) {
        switch (channel) {
            case 'web':
                await this.sendWebNotification(notification);
                break;
            
            case 'email':
                await this.sendEmailNotification(notification);
                break;
            
            case 'push':
                await this.sendPushNotification(notification);
                break;
            
            default:
                console.warn('قناة إشعار غير مدعومة:', channel);
        }
    }

    async sendWebNotification(notification) {
        // إرسال إلى نظام التنبيهات المتقدم
        if (window.advancedAlertSystem) {
            const alert = {
                title: notification.subject,
                message: notification.content,
                type: this.getAlertType(notification.priority),
                priority: notification.priority,
                source: 'notification',
                data: notification.data
            };
            
            advancedAlertSystem.createCustomAlert(alert);
        }

        // إرسال إلى Firebase للمستخدمين الآخرين
        if (window.db) {
            await db.collection('notifications').add({
                userId: notification.recipientId,
                title: notification.subject,
                message: notification.content,
                type: notification.type,
                priority: notification.priority,
                isRead: false,
                createdAt: new Date(),
                data: notification.data
            });
        }
    }

    async sendEmailNotification(notification) {
        // إرسال عبر Cloud Functions
        if (window.cloudFunctionService) {
            await cloudFunctionService.sendNotification({
                type: 'email',
                recipientId: notification.recipientId,
                subject: notification.subject,
                content: notification.content,
                priority: notification.priority
            });
        }
    }

    async sendPushNotification(notification) {
        // إرسال عبر Firebase Cloud Messaging
        if (window.cloudFunctionService) {
            await cloudFunctionService.sendNotification({
                type: 'push',
                recipientId: notification.recipientId,
                title: notification.subject,
                body: notification.content,
                priority: notification.priority
            });
        }
    }

    processTemplate(template, data) {
        let processed = template;
        
        // استبدال المتغيرات
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            processed = processed.replace(new RegExp(placeholder, 'g'), value);
        }

        return processed;
    }

    getAlertType(priority) {
        switch (priority) {
            case 'urgent':
                return 'error';
            case 'high':
                return 'warning';
            case 'normal':
                return 'info';
            default:
                return 'info';
        }
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    generateNotificationId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // طرق مساعدة للحصول على المستخدمين
    async getUserById(userId) {
        if (!window.db) return null;
        
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            return userDoc.exists ? { id: userId, ...userDoc.data() } : null;
        } catch (error) {
            console.error('خطأ في الحصول على المستخدم:', error);
            return null;
        }
    }

    async getDepartmentHead(department) {
        if (!window.db || !department || department === undefined || department === null) {
            console.warn('قسم غير صالح للبحث عن رئيس القسم:', department);
            return null;
        }
        
        try {
            const query = await db.collection('users')
                .where('department', '==', department)
                .where('role', '==', 'department_head')
                .limit(1)
                .get();
            
            return query.empty ? null : { id: query.docs[0].id, ...query.docs[0].data() };
        } catch (error) {
            console.error('خطأ في الحصول على رئيس القسم:', error);
            return null;
        }
    }

    async getAdmins() {
        if (!window.db) return [];
        
        try {
            const query = await db.collection('users')
                .where('role', '==', 'admin')
                .get();
            
            return query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('خطأ في الحصول على المدراء:', error);
            return [];
        }
    }

    async getSecurityTeam() {
        if (!window.db) return [];
        
        try {
            const query = await db.collection('users')
                .where('role', '==', 'security')
                .get();
            
            return query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('خطأ في الحصول على فريق الأمان:', error);
            return [];
        }
    }

    async getAllUsers() {
        if (!window.db) return [];
        
        try {
            const query = await db.collection('users').get();
            return query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('خطأ في الحصول على جميع المستخدمين:', error);
            return [];
        }
    }

    async saveUserPreferences(userId, preferences) {
        if (!window.db) return;
        
        try {
            await db.collection('user_preferences').doc(userId).set(preferences);
        } catch (error) {
            console.error('خطأ في حفظ تفضيلات المستخدم:', error);
        }
    }

    // API عامة
    async updateUserPreferences(userId, preferences) {
        this.userPreferences.set(userId, preferences);
        await this.saveUserPreferences(userId, preferences);
    }

    async addNotificationRule(rule) {
        this.notificationRules.set(rule.id, rule);
        
        if (window.db) {
            try {
                await db.collection('notification_rules').doc(rule.id).set(rule);
            } catch (error) {
                console.error('خطأ في حفظ قاعدة الإشعار:', error);
            }
        }
    }

    async removeNotificationRule(ruleId) {
        this.notificationRules.delete(ruleId);
        
        if (window.db) {
            try {
                await db.collection('notification_rules').doc(ruleId).delete();
            } catch (error) {
                console.error('خطأ في حذف قاعدة الإشعار:', error);
            }
        }
    }

    getNotificationStats() {
        const stats = {
            totalRules: this.notificationRules.size,
            totalUsers: this.userPreferences.size,
            queueStats: {}
        };

        this.notificationQueues.forEach((queue, frequency) => {
            stats.queueStats[frequency] = queue.length;
        });

        return stats;
    }
}

// إنشاء النظام العام
const smartNotificationManager = new SmartNotificationManager();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.SmartNotificationManager = SmartNotificationManager;
    window.smartNotificationManager = smartNotificationManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartNotificationManager;
}
