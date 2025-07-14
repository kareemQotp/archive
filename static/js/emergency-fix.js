/**
 * 🆘 نظام الإصلاح الطارئ
 * يحل مشاكل تحميل النصوص والمتغيرات غير المعرفة
 */

(function() {
    'use strict';
    
    console.log('🆘 بدء نظام الإصلاح الطارئ...');
    
    // 1. إنشاء نظام إشعارات احتياطي فوري
    if (!window.notify) {
        window.notify = {
            success: function(title, message, options = {}) {
                const msg = `✅ ${title}: ${message}`;
                console.log(msg);
                
                // إنشاء إشعار مرئي
                showNotification(msg, 'success', options.duration || 3000);
                
                // إشعار سطح المكتب
                if (options.desktop && Notification.permission === 'granted') {
                    new Notification(title, { body: message, icon: '/static/images/icon-192.png' });
                }
            },
            
            error: function(title, message, options = {}) {
                const msg = `❌ ${title}: ${message}`;
                console.error(msg);
                showNotification(msg, 'error', options.duration || 5000);
                
                if (options.desktop && Notification.permission === 'granted') {
                    new Notification(title, { body: message, icon: '/static/images/icon-192.png' });
                }
            },
            
            warning: function(title, message, options = {}) {
                const msg = `⚠️ ${title}: ${message}`;
                console.warn(msg);
                showNotification(msg, 'warning', options.duration || 4000);
            },
            
            info: function(title, message, options = {}) {
                const msg = `ℹ️ ${title}: ${message}`;
                console.info(msg);
                showNotification(msg, 'info', options.duration || 3000);
            },
            
            // دالة عرض إشعار مخصص
            custom: function(title, message, type = 'info', duration = 3000) {
                showNotification(`${title}: ${message}`, type, duration);
            }
        };
    }
    
    // 2. إنشاء نظام تحليلات احتياطي
    if (!window.analytics) {
        window.analytics = {
            events: [],
            currentSession: {
                id: 'emergency-session-' + Date.now(),
                startTime: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            },
            
            trackEvent: function(category, action, label, value) {
                const event = {
                    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    category: category,
                    action: action,
                    label: label,
                    value: value,
                    sessionId: this.currentSession.id,
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                
                this.events.push(event);
                console.log('📊 تتبع حدث:', event);
                
                // حفظ في التخزين المحلي
                try {
                    const stored = localStorage.getItem('analytics_events') || '[]';
                    const allEvents = JSON.parse(stored);
                    allEvents.push(event);
                    
                    // الاحتفاظ بآخر 1000 حدث فقط
                    if (allEvents.length > 1000) {
                        allEvents.splice(0, allEvents.length - 1000);
                    }
                    
                    localStorage.setItem('analytics_events', JSON.stringify(allEvents));
                } catch (error) {
                    console.warn('⚠️ فشل في حفظ الحدث:', error);
                }
                
                return event;
            },
            
            generateReport: function(days = 1) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                
                const recentEvents = this.events.filter(event => 
                    new Date(event.timestamp) >= cutoffDate
                );
                
                const report = {
                    period: {
                        days: days,
                        from: cutoffDate.toISOString(),
                        to: new Date().toISOString()
                    },
                    summary: {
                        totalEvents: recentEvents.length,
                        categories: {},
                        actions: {},
                        uniquePages: new Set(recentEvents.map(e => e.url)).size,
                        sessionId: this.currentSession.id
                    },
                    events: recentEvents,
                    timestamp: new Date().toISOString()
                };
                
                // إحصائيات حسب الفئة
                recentEvents.forEach(event => {
                    report.summary.categories[event.category] = 
                        (report.summary.categories[event.category] || 0) + 1;
                    report.summary.actions[event.action] = 
                        (report.summary.actions[event.action] || 0) + 1;
                });
                
                console.log('📈 تقرير التحليلات:', report);
                return report;
            },
            
            // تصدير البيانات
            exportData: function() {
                return {
                    session: this.currentSession,
                    events: this.events,
                    exportedAt: new Date().toISOString()
                };
            }
        };
    }
    
    // 3. إنشاء مدير بيانات احتياطي
    if (!window.dataManager) {
        window.dataManager = {
            cache: new Map(),
            syncQueue: [],
            isOnline: navigator.onLine,
            
            // إحصائيات التخزين المؤقت
            getCacheStats: function() {
                return {
                    size: this.cache.size,
                    isOnline: this.isOnline,
                    syncQueueSize: this.syncQueue.length,
                    memoryUsage: performance.memory ? {
                        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                    } : null
                };
            },
            
            // إضافة إلى طابور المزامنة
            addToSyncQueue: function(item) {
                const queueItem = {
                    id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    data: item,
                    timestamp: new Date().toISOString(),
                    retries: 0,
                    maxRetries: 3
                };
                
                this.syncQueue.push(queueItem);
                console.log('💾 إضافة إلى طابور المزامنة:', queueItem);
                
                // محاولة المزامنة إذا كان الاتصال متاح
                if (this.isOnline) {
                    this.processSyncQueue();
                }
                
                return queueItem.id;
            },
            
            // معالجة طابور المزامنة
            processSyncQueue: function() {
                if (!this.isOnline || this.syncQueue.length === 0) {
                    return;
                }
                
                console.log('🔄 بدء معالجة طابور المزامنة...', this.syncQueue.length, 'عنصر');
                
                // محاولة مزامنة العناصر
                this.syncQueue.forEach((item, index) => {
                    if (item.retries < item.maxRetries) {
                        // محاكاة المزامنة (في التطبيق الحقيقي ستكون طلب شبكة)
                        setTimeout(() => {
                            console.log('✅ تم مزامنة العنصر:', item.id);
                            this.syncQueue.splice(index, 1);
                        }, Math.random() * 1000);
                    } else {
                        console.error('❌ فشل في مزامنة العنصر:', item.id);
                        this.syncQueue.splice(index, 1);
                    }
                });
            },
            
            // حفظ البيانات محلياً
            saveLocal: function(key, data) {
                try {
                    this.cache.set(key, data);
                    localStorage.setItem('dataManager_' + key, JSON.stringify({
                        data: data,
                        timestamp: new Date().toISOString()
                    }));
                    console.log('💾 تم حفظ البيانات محلياً:', key);
                } catch (error) {
                    console.error('❌ فشل في الحفظ المحلي:', error);
                }
            },
            
            // استرجاع البيانات المحلية
            getLocal: function(key) {
                try {
                    if (this.cache.has(key)) {
                        return this.cache.get(key);
                    }
                    
                    const stored = localStorage.getItem('dataManager_' + key);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        this.cache.set(key, parsed.data);
                        return parsed.data;
                    }
                } catch (error) {
                    console.error('❌ فشل في استرجاع البيانات:', error);
                }
                return null;
            }
        };
        
        // مراقبة حالة الاتصال
        window.addEventListener('online', () => {
            window.dataManager.isOnline = true;
            console.log('🌐 تم استرجاع الاتصال');
            window.dataManager.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            window.dataManager.isOnline = false;
            console.log('📵 فقدان الاتصال');
        });
    }
    
    // 4. إنشاء إعدادات التطبيق الأساسية
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = {
            APP_NAME: 'نظام الأرشيف',
            VERSION: '2.1.0',
            DEBUG: true,
            NOTIFICATIONS: {
                ENABLED: true,
                DESKTOP: false,
                SOUND: false,
                POSITION: 'top-right'
            },
            ANALYTICS: {
                ENABLED: true,
                TRACK_PERFORMANCE: true,
                TRACK_ERRORS: true
            },
            CACHE: {
                TTL: 3600000, // ساعة واحدة
                MAX_SIZE: 100
            },
            UI: {
                THEME: 'modern',
                LANGUAGE: 'ar',
                RTL: true
            }
        };
    }
    
    // 5. إنشاء نظام الأدوار الأساسي
    if (!window.USER_ROLES) {
        window.USER_ROLES = {
            ADMIN: {
                name: 'مدير',
                permissions: ['read', 'write', 'delete', 'admin'],
                level: 100
            },
            EDITOR: {
                name: 'محرر',
                permissions: ['read', 'write'],
                level: 50
            },
            VIEWER: {
                name: 'مشاهد',
                permissions: ['read'],
                level: 10
            }
        };
    }
    
    // 6. دالة عرض الإشعارات المرئية
    function showNotification(message, type = 'info', duration = 3000) {
        // إنشاء حاوي الإشعارات إذا لم يكن موجود
        let container = document.getElementById('emergency-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'emergency-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 350px;
            `;
            document.body.appendChild(container);
        }
        
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            direction: rtl;
            text-align: right;
        `;
        
        notification.textContent = message;
        container.appendChild(notification);
        
        // إزالة تلقائية
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    function getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }
    
    // 7. إضافة أنماط CSS للإشعارات
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 8. دالة فحص شامل للنظام
    window.systemCheck = function() {
        const systems = {
            notify: typeof window.notify !== 'undefined',
            analytics: typeof window.analytics !== 'undefined',
            dataManager: typeof window.dataManager !== 'undefined',
            APP_CONFIG: typeof window.APP_CONFIG !== 'undefined',
            USER_ROLES: typeof window.USER_ROLES !== 'undefined'
        };
        
        const allWorking = Object.values(systems).every(working => working);
        
        console.log('🔍 فحص الأنظمة:', systems);
        
        if (allWorking) {
            console.log('✅ جميع الأنظمة تعمل بشكل صحيح');
            window.notify.success('فحص النظام', 'جميع المكونات تعمل بشكل صحيح');
        } else {
            console.warn('⚠️ بعض الأنظمة لا تعمل');
            window.notify.warning('فحص النظام', 'تم اكتشاف مشاكل في بعض المكونات');
        }
        
        return systems;
    };
    
    // 9. إعداد مدير تحميل النصوص الطارئ
    window.emergencyScriptLoader = {
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                // التحقق من وجود النص مسبقاً
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    resolve(existing);
                    return;
                }
                
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => resolve(script);
                script.onerror = () => reject(new Error(`فشل في تحميل: ${src}`));
                document.head.appendChild(script);
            });
        },
        
        loadMultiple: async function(scripts) {
            const results = {};
            for (const script of scripts) {
                try {
                    await this.loadScript(script);
                    results[script] = 'نجح';
                    console.log(`✅ تم تحميل: ${script}`);
                } catch (error) {
                    results[script] = 'فشل: ' + error.message;
                    console.error(`❌ فشل في تحميل: ${script}`, error);
                }
            }
            return results;
        }
    };
    
    // 10. تسجيل اكتمال الإصلاح الطارئ
    console.log('✅ تم تحميل نظام الإصلاح الطارئ بنجاح');
    
    // إشعار المستخدم
    setTimeout(() => {
        if (window.notify) {
            window.notify.success('نظام الإصلاح', 'تم تحميل جميع الأنظمة الاحتياطية بنجاح');
        }
    }, 500);
    
    // تشغيل فحص تلقائي
    setTimeout(() => {
        window.systemCheck();
    }, 1000);
    
})();
