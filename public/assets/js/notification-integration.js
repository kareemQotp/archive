/**
 * نظام تكامل الإشعارات
 * Notification Integration System
 */

class NotificationIntegration {
    constructor() {
        this.isInitialized = false;
        this.systems = {
            alerts: null,
            smart: null,
            firebase: null
        };
        
        this.init();
    }

    async init() {
        try {
            // تهيئة الأنظمة
            await this.initializeSystems();
            this.setupIntegrationHandlers();
            this.startSystemMonitoring();
            this.isInitialized = true;
            
            console.log('نظام تكامل الإشعارات جاهز للعمل');
        } catch (error) {
            console.error('خطأ في تهيئة نظام تكامل الإشعارات:', error);
        }
    }

    async initializeSystems() {
        // تهيئة نظام التنبيهات المتقدم
        if (window.advancedAlertSystem) {
            this.systems.alerts = window.advancedAlertSystem;
            console.log('نظام التنبيهات المتقدم متصل');
        }

        // تهيئة نظام الإشعارات الذكية
        if (window.smartNotificationManager) {
            this.systems.smart = window.smartNotificationManager;
            console.log('نظام الإشعارات الذكية متصل');
        }

        // تهيئة خدمة Firebase
        if (window.cloudFunctionService) {
            this.systems.firebase = window.cloudFunctionService;
            console.log('خدمة Firebase متصلة');
        }
    }

    setupIntegrationHandlers() {
        // استمع لأحداث تحميل الملفات
        if (window.fileManager && typeof window.fileManager.addEventListener === 'function') {
            window.fileManager.addEventListener('fileUploaded', (event) => {
                this.handleFileUpload(event.detail);
            });
        }

        // استمع لأحداث حركة الملفات
        if (window.fileMovementManager && typeof window.fileMovementManager.addEventListener === 'function') {
            window.fileMovementManager.addEventListener('fileMoved', (event) => {
                this.handleFileMovement(event.detail);
            });
        }

        // استمع لأحداث الأنشطة - استخدم النافذة للأحداث المخصصة
        window.addEventListener('activityLogged', (event) => {
            this.handleActivity(event.detail);
        });

        // استمع لأحداث المستخدمين
        if (window.userManager && typeof window.userManager.addEventListener === 'function') {
            window.userManager.addEventListener('userLogin', (event) => {
                this.handleUserLogin(event.detail);
            });
            
            window.userManager.addEventListener('userLogout', (event) => {
                this.handleUserLogout(event.detail);
            });
        }

        // استمع لأحداث الأمان
        if (window.securityManager && typeof window.securityManager.addEventListener === 'function') {
            window.securityManager.addEventListener('securityEvent', (event) => {
                this.handleSecurityEvent(event.detail);
            });
        }
    }

    async handleFileUpload(data) {
        try {
            const notificationData = {
                type: 'file_upload',
                uploaderId: data.uploaderId,
                fileName: data.fileName,
                fileSize: data.fileSize,
                department: data.department,
                timestamp: new Date().toISOString(),
                uploaderName: data.uploaderName || 'مستخدم غير معروف'
            };

            // إرسال إشعار ذكي
            if (this.systems.smart) {
                await this.systems.smart.processNotification(notificationData);
            }

            // إنشاء تنبيه محلي
            if (this.systems.alerts) {
                this.systems.alerts.createCustomAlert({
                    title: 'تم تحميل ملف جديد',
                    message: `تم تحميل الملف "${data.fileName}" بواسطة ${data.uploaderName}`,
                    type: 'success',
                    priority: 'normal',
                    source: 'file_upload',
                    data: notificationData
                });
            }

            console.log('تم معالجة إشعار تحميل الملف:', data.fileName);
        } catch (error) {
            console.error('خطأ في معالجة إشعار تحميل الملف:', error);
        }
    }

    async handleFileMovement(data) {
        try {
            const notificationData = {
                type: 'file_movement',
                moverId: data.moverId,
                receiverId: data.receiverId,
                fileNumber: data.fileNumber,
                fromLocation: data.fromLocation,
                toLocation: data.toLocation,
                department: data.department,
                timestamp: new Date().toISOString(),
                moverName: data.moverName || 'مستخدم غير معروف'
            };

            // إرسال إشعار ذكي
            if (this.systems.smart) {
                await this.systems.smart.processNotification(notificationData);
            }

            // إنشاء تنبيه محلي
            if (this.systems.alerts) {
                this.systems.alerts.createCustomAlert({
                    title: 'تم نقل ملف',
                    message: `تم نقل الملف ${data.fileNumber} من ${data.fromLocation} إلى ${data.toLocation}`,
                    type: 'info',
                    priority: 'normal',
                    source: 'file_movement',
                    data: notificationData
                });
            }

            console.log('تم معالجة إشعار نقل الملف:', data.fileNumber);
        } catch (error) {
            console.error('خطأ في معالجة إشعار نقل الملف:', error);
        }
    }

    async handleActivity(data) {
        try {
            const notificationData = {
                type: 'activity',
                category: data.category,
                action: data.action,
                userId: data.userId,
                priority: data.priority,
                timestamp: new Date().toISOString(),
                activityDescription: this.getActivityDescription(data)
            };

            // إرسال إشعار ذكي للأنشطة المهمة
            if (data.priority === 'high' || data.priority === 'urgent') {
                if (this.systems.smart) {
                    await this.systems.smart.processNotification(notificationData);
                }
            }

            // إنشاء تنبيه محلي للأنشطة العاجلة
            if (data.priority === 'urgent' && this.systems.alerts) {
                this.systems.alerts.createCustomAlert({
                    title: 'نشاط عاجل',
                    message: notificationData.activityDescription,
                    type: 'warning',
                    priority: 'urgent',
                    source: 'activity',
                    data: notificationData
                });
            }

            console.log('تم معالجة إشعار النشاط:', data.action);
        } catch (error) {
            console.error('خطأ في معالجة إشعار النشاط:', error);
        }
    }

    async handleUserLogin(data) {
        try {
            // فحص تسجيل الدخول المشبوه
            const isSuspicious = await this.checkSuspiciousLogin(data);
            
            if (isSuspicious) {
                const notificationData = {
                    type: 'user_login',
                    userId: data.userId,
                    suspicious: true,
                    location: data.location || 'غير محدد',
                    timestamp: new Date().toISOString(),
                    username: data.username || 'مستخدم غير معروف'
                };

                // إرسال إشعار ذكي
                if (this.systems.smart) {
                    await this.systems.smart.processNotification(notificationData);
                }

                // إنشاء تنبيه محلي
                if (this.systems.alerts) {
                    this.systems.alerts.createCustomAlert({
                        title: 'تسجيل دخول مشبوه',
                        message: `تم رصد تسجيل دخول مشبوه للمستخدم ${data.username}`,
                        type: 'warning',
                        priority: 'high',
                        source: 'security',
                        data: notificationData
                    });
                }
            }

            console.log('تم معالجة تسجيل دخول المستخدم:', data.username);
        } catch (error) {
            console.error('خطأ في معالجة تسجيل دخول المستخدم:', error);
        }
    }

    async handleUserLogout(data) {
        try {
            // مسح الإشعارات المحلية عند تسجيل الخروج
            if (this.systems.alerts) {
                this.systems.alerts.clearAllAlerts();
            }

            console.log('تم تسجيل خروج المستخدم:', data.username);
        } catch (error) {
            console.error('خطأ في معالجة تسجيل خروج المستخدم:', error);
        }
    }

    async handleSecurityEvent(data) {
        try {
            const notificationData = {
                type: 'security_alert',
                category: 'security',
                eventType: data.eventType,
                severity: data.severity,
                sourceIP: data.sourceIP,
                timestamp: new Date().toISOString(),
                securityEvent: this.getSecurityEventDescription(data)
            };

            // إرسال إشعار ذكي
            if (this.systems.smart) {
                await this.systems.smart.processNotification(notificationData);
            }

            // إنشاء تنبيه محلي
            if (this.systems.alerts) {
                this.systems.alerts.createCustomAlert({
                    title: 'تنبيه أمني',
                    message: notificationData.securityEvent,
                    type: 'error',
                    priority: 'urgent',
                    source: 'security',
                    data: notificationData
                });
            }

            console.log('تم معالجة حدث أمني:', data.eventType);
        } catch (error) {
            console.error('خطأ في معالجة الحدث الأمني:', error);
        }
    }

    async checkSuspiciousLogin(data) {
        try {
            // فحص الموقع الجغرافي
            const previousLogins = await this.getPreviousLogins(data.userId);
            
            if (previousLogins.length > 0) {
                const lastLogin = previousLogins[0];
                const timeDiff = Date.now() - lastLogin.timestamp;
                
                // إذا كان آخر تسجيل دخول من موقع مختلف خلال ساعة
                if (timeDiff < 3600000 && lastLogin.location !== data.location) {
                    return true;
                }
            }

            // فحص عدد محاولات تسجيل الدخول
            const recentAttempts = await this.getRecentLoginAttempts(data.userId);
            if (recentAttempts > 5) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('خطأ في فحص تسجيل الدخول المشبوه:', error);
            return false;
        }
    }

    async getPreviousLogins(userId) {
        try {
            if (!window.db) return [];

            const loginsQuery = await db.collection('login_logs')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            return loginsQuery.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || new Date()
            }));
        } catch (error) {
            console.error('خطأ في الحصول على تسجيلات الدخول السابقة:', error);
            return [];
        }
    }

    async getRecentLoginAttempts(userId) {
        try {
            if (!window.db) return 0;

            const oneHourAgo = new Date(Date.now() - 3600000);
            const attemptsQuery = await db.collection('login_attempts')
                .where('userId', '==', userId)
                .where('timestamp', '>=', oneHourAgo)
                .count()
                .get();

            return attemptsQuery.data().count || 0;
        } catch (error) {
            console.error('خطأ في الحصول على محاولات تسجيل الدخول:', error);
            return 0;
        }
    }

    getActivityDescription(activity) {
        const descriptions = {
            'file_upload': 'تحميل ملف جديد',
            'file_download': 'تنزيل ملف',
            'file_delete': 'حذف ملف',
            'file_move': 'نقل ملف',
            'user_create': 'إنشاء مستخدم جديد',
            'user_update': 'تحديث بيانات مستخدم',
            'user_delete': 'حذف مستخدم',
            'login_success': 'تسجيل دخول ناجح',
            'login_failed': 'فشل تسجيل دخول',
            'password_change': 'تغيير كلمة المرور',
            'permission_change': 'تغيير صلاحيات',
            'system_backup': 'نسخ احتياطي للنظام',
            'system_restore': 'استعادة النظام',
            'security_scan': 'فحص أمني'
        };

        return descriptions[activity.action] || activity.action || 'نشاط غير محدد';
    }

    getSecurityEventDescription(event) {
        const descriptions = {
            'failed_login': 'محاولة دخول فاشلة',
            'brute_force': 'محاولة اختراق بالقوة',
            'suspicious_ip': 'عنوان IP مشبوه',
            'unauthorized_access': 'محاولة وصول غير مصرح',
            'sql_injection': 'محاولة حقن SQL',
            'xss_attempt': 'محاولة XSS',
            'file_scan': 'فحص ملف مشبوه',
            'malware_detected': 'اكتشاف برمجية خبيثة',
            'ddos_attack': 'هجوم DDoS',
            'port_scan': 'فحص منافذ'
        };

        return descriptions[event.eventType] || event.eventType || 'حدث أمني غير محدد';
    }

    startSystemMonitoring() {
        // مراقبة حالة الأنظمة كل دقيقة
        setInterval(() => {
            this.monitorSystemHealth();
        }, 60000);

        // مراقبة الأداء كل 5 دقائق
        setInterval(() => {
            this.monitorPerformance();
        }, 300000);
    }

    monitorSystemHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            alerts: this.systems.alerts ? 'operational' : 'disconnected',
            smart: this.systems.smart ? 'operational' : 'disconnected',
            firebase: this.systems.firebase ? 'operational' : 'disconnected'
        };

        // تسجيل حالة الأنظمة
        console.log('مراقبة صحة الأنظمة:', health);

        // إرسال تنبيه إذا كان أحد الأنظمة معطل
        const failedSystems = Object.entries(health)
            .filter(([key, value]) => key !== 'timestamp' && value === 'disconnected')
            .map(([key]) => key);

        if (failedSystems.length > 0) {
            this.createSystemAlert({
                title: 'فشل في النظام',
                message: `الأنظمة التالية معطلة: ${failedSystems.join(', ')}`,
                type: 'error',
                priority: 'high'
            });
        }
    }

    monitorPerformance() {
        const performance = {
            timestamp: new Date().toISOString(),
            memory: this.getMemoryUsage(),
            notifications: this.getNotificationStats(),
            errors: this.getErrorStats()
        };

        console.log('مراقبة الأداء:', performance);

        // إرسال تنبيه إذا كان الأداء منخفض
        if (performance.memory.usage > 80) {
            this.createSystemAlert({
                title: 'استهلاك ذاكرة عالي',
                message: `استهلاك الذاكرة: ${performance.memory.usage}%`,
                type: 'warning',
                priority: 'normal'
            });
        }
    }

    getMemoryUsage() {
        try {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;
                return {
                    used: Math.round(used / 1024 / 1024),
                    total: Math.round(total / 1024 / 1024),
                    usage: Math.round((used / total) * 100)
                };
            }
            return { used: 0, total: 0, usage: 0 };
        } catch (error) {
            return { used: 0, total: 0, usage: 0 };
        }
    }

    getNotificationStats() {
        try {
            const stats = {
                alerts: this.systems.alerts ? this.systems.alerts.getStats() : null,
                smart: this.systems.smart ? this.systems.smart.getNotificationStats() : null
            };
            return stats;
        } catch (error) {
            return null;
        }
    }

    getErrorStats() {
        // استخراج إحصائيات الأخطاء من console
        return {
            total: 0,
            recent: 0
        };
    }

    createSystemAlert(options) {
        if (this.systems.alerts) {
            this.systems.alerts.createCustomAlert({
                ...options,
                source: 'system_monitor'
            });
        }
    }

    // API عامة
    async sendCustomNotification(options) {
        try {
            if (this.systems.smart) {
                await this.systems.smart.processNotification(options);
            }
            
            if (this.systems.alerts) {
                this.systems.alerts.createCustomAlert(options);
            }
            
            return { success: true };
        } catch (error) {
            console.error('خطأ في إرسال إشعار مخصص:', error);
            return { success: false, error: error.message };
        }
    }

    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            systems: {
                alerts: !!this.systems.alerts,
                smart: !!this.systems.smart,
                firebase: !!this.systems.firebase
            }
        };
    }

    // إعادة تهيئة النظام
    async reinitialize() {
        try {
            this.isInitialized = false;
            await this.init();
            return { success: true };
        } catch (error) {
            console.error('خطأ في إعادة تهيئة النظام:', error);
            return { success: false, error: error.message };
        }
    }
}

// إنشاء النظام العام
const notificationIntegration = new NotificationIntegration();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.NotificationIntegration = NotificationIntegration;
    window.notificationIntegration = notificationIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationIntegration;
}
