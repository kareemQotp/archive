/**
 * نظام تحليل الأداء والإحصائيات المتقدم
 * Advanced Analytics and Performance System
 */

class AnalyticsManager {
    constructor() {
        this.metrics = new Map();
        this.events = [];
        this.pageViews = [];
        this.performanceData = [];
        this.userSessions = new Map();
        this.currentSession = null;
        this.isTrackingEnabled = true;
        this.init();
    }

    init() {
        this.startSession();
        this.setupPerformanceTracking();
        this.setupEventListeners();
        this.loadStoredData();
        this.startDataCollection();
    }

    startSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            userId: this.getCurrentUserId(),
            startTime: Date.now(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            referrer: document.referrer,
            url: window.location.href,
            events: [],
            pageViews: [],
            errors: []
        };

        this.userSessions.set(this.currentSession.id, this.currentSession);
        this.saveToStorage();
    }

    setupPerformanceTracking() {
        // مراقبة أداء تحميل الصفحة
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.trackPagePerformance();
            }, 100);
        });

        // مراقبة الأخطاء
        window.addEventListener('error', (event) => {
            this.trackError(event.error, event.filename, event.lineno);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(event.reason, 'Promise rejection');
        });
    }

    setupEventListeners() {
        // تتبع النقرات
        document.addEventListener('click', (event) => {
            this.trackClick(event);
        });

        // تتبع إرسال النماذج
        document.addEventListener('submit', (event) => {
            this.trackFormSubmission(event);
        });

        // تتبع تغيير الصفحة
        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                this.trackPageView(window.location.href);
                lastUrl = window.location.href;
            }
        });

        observer.observe(document, { subtree: true, childList: true });

        // تتبع وقت البقاء في الصفحة
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });

        // تتبع عدم النشاط
        this.setupInactivityTracking();
    }

    trackPagePerformance() {
        if (!performance || !performance.timing) return;

        const timing = performance.timing;
        const navigation = performance.navigation;

        const performanceMetrics = {
            timestamp: Date.now(),
            url: window.location.href,
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstPaint: this.getFirstPaint(),
            resourceCount: performance.getEntriesByType('resource').length,
            navigationTiming: {
                redirect: timing.redirectEnd - timing.redirectStart,
                dns: timing.domainLookupEnd - timing.domainLookupStart,
                connect: timing.connectEnd - timing.connectStart,
                request: timing.responseStart - timing.requestStart,
                response: timing.responseEnd - timing.responseStart,
                processing: timing.domComplete - timing.domLoading,
                onLoad: timing.loadEventEnd - timing.loadEventStart
            },
            navigationType: navigation.type,
            redirectCount: navigation.redirectCount
        };

        this.performanceData.push(performanceMetrics);
        
        if (this.currentSession) {
            this.currentSession.performanceData = performanceMetrics;
        }

        this.saveToStorage();
    }

    getFirstPaint() {
        if (performance.getEntriesByType) {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? firstPaint.startTime : null;
        }
        return null;
    }

    trackEvent(category, action, label = '', value = 1, customData = {}) {
        if (!this.isTrackingEnabled) return;

        const event = {
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            userId: this.getCurrentUserId(),
            category,
            action,
            label,
            value,
            url: window.location.href,
            userAgent: navigator.userAgent,
            customData
        };

        this.events.push(event);
        
        if (this.currentSession) {
            this.currentSession.events.push(event);
        }

        this.saveToStorage();
        
        // إرسال للخادم إذا كان متاحاً
        this.sendToServer('event', event);
    }

    trackPageView(url = window.location.href, title = document.title) {
        const pageView = {
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            userId: this.getCurrentUserId(),
            url,
            title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        this.pageViews.push(pageView);
        
        if (this.currentSession) {
            this.currentSession.pageViews.push(pageView);
        }

        this.saveToStorage();
        this.sendToServer('pageview', pageView);
    }

    trackClick(event) {
        const element = event.target;
        const clickData = {
            element: element.tagName,
            id: element.id,
            className: element.className,
            text: element.textContent?.slice(0, 100),
            href: element.href,
            coordinates: {
                x: event.clientX,
                y: event.clientY
            }
        };

        this.trackEvent('UI', 'click', element.tagName, 1, clickData);
    }

    trackFormSubmission(event) {
        const form = event.target;
        const formData = {
            action: form.action,
            method: form.method,
            fieldCount: form.elements.length,
            id: form.id,
            className: form.className
        };

        this.trackEvent('Form', 'submit', form.id || 'unnamed', 1, formData);
    }

    trackError(error, filename = '', lineno = 0, colno = 0) {
        const errorData = {
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: this.currentSession?.id,
            userId: this.getCurrentUserId(),
            message: error?.message || error,
            filename,
            lineno,
            colno,
            stack: error?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        if (this.currentSession) {
            this.currentSession.errors.push(errorData);
        }

        this.saveToStorage();
        this.sendToServer('error', errorData);
    }

    trackUserAction(action, details = {}) {
        this.trackEvent('User', action, '', 1, details);
    }

    trackFileOperation(operation, fileDetails = {}) {
        this.trackEvent('File', operation, fileDetails.type || 'unknown', 1, fileDetails);
    }

    setupInactivityTracking() {
        let lastActivity = Date.now();
        let inactivityTimer;

        const resetInactivityTimer = () => {
            lastActivity = Date.now();
            clearTimeout(inactivityTimer);
            
            inactivityTimer = setTimeout(() => {
                this.trackEvent('User', 'inactive', '', Date.now() - lastActivity);
            }, 300000); // 5 minutes
        };

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });

        resetInactivityTimer();
    }

    endSession() {
        if (this.currentSession) {
            this.currentSession.endTime = Date.now();
            this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
            this.saveToStorage();
            this.sendToServer('session_end', this.currentSession);
        }
    }

    // تحليل البيانات
    generateReport(dateRange = 7) {
        const cutoffDate = Date.now() - (dateRange * 24 * 60 * 60 * 1000);
        
        const recentEvents = this.events.filter(event => event.timestamp > cutoffDate);
        const recentPageViews = this.pageViews.filter(view => view.timestamp > cutoffDate);
        const recentSessions = Array.from(this.userSessions.values())
            .filter(session => session.startTime > cutoffDate);

        return {
            period: `آخر ${dateRange} أيام`,
            summary: {
                totalEvents: recentEvents.length,
                totalPageViews: recentPageViews.length,
                totalSessions: recentSessions.length,
                uniqueUsers: new Set(recentEvents.map(e => e.userId)).size,
                averageSessionDuration: this.calculateAverageSessionDuration(recentSessions),
                topPages: this.getTopPages(recentPageViews),
                topEvents: this.getTopEvents(recentEvents),
                errorRate: this.calculateErrorRate(recentSessions),
                performanceMetrics: this.getPerformanceMetrics()
            },
            charts: {
                dailyActivity: this.getDailyActivity(recentEvents, dateRange),
                topActions: this.getTopActions(recentEvents),
                deviceTypes: this.getDeviceTypes(recentSessions),
                errorTrends: this.getErrorTrends(recentSessions)
            }
        };
    }

    calculateAverageSessionDuration(sessions) {
        const completedSessions = sessions.filter(s => s.endTime);
        if (completedSessions.length === 0) return 0;
        
        const totalDuration = completedSessions.reduce((sum, session) => 
            sum + (session.endTime - session.startTime), 0);
        
        return Math.round(totalDuration / completedSessions.length);
    }

    getTopPages(pageViews) {
        const pageCounts = {};
        pageViews.forEach(view => {
            const page = new URL(view.url).pathname;
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        
        return Object.entries(pageCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([page, count]) => ({ page, count }));
    }

    getTopEvents(events) {
        const eventCounts = {};
        events.forEach(event => {
            const key = `${event.category}:${event.action}`;
            eventCounts[key] = (eventCounts[key] || 0) + 1;
        });
        
        return Object.entries(eventCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([event, count]) => ({ event, count }));
    }

    calculateErrorRate(sessions) {
        const totalSessions = sessions.length;
        const sessionsWithErrors = sessions.filter(s => s.errors && s.errors.length > 0).length;
        
        return totalSessions > 0 ? (sessionsWithErrors / totalSessions) * 100 : 0;
    }

    getPerformanceMetrics() {
        if (this.performanceData.length === 0) return null;
        
        const recent = this.performanceData.slice(-10);
        const avgLoadTime = recent.reduce((sum, p) => sum + p.loadTime, 0) / recent.length;
        const avgDomReady = recent.reduce((sum, p) => sum + p.domReady, 0) / recent.length;
        
        return {
            averageLoadTime: Math.round(avgLoadTime),
            averageDomReady: Math.round(avgDomReady),
            sampleSize: recent.length
        };
    }

    getDailyActivity(events, days) {
        const daily = {};
        const now = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const dateStr = date.toISOString().split('T')[0];
            daily[dateStr] = 0;
        }
        
        events.forEach(event => {
            const date = new Date(event.timestamp).toISOString().split('T')[0];
            if (daily.hasOwnProperty(date)) {
                daily[date]++;
            }
        });
        
        return Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }

    getTopActions(events) {
        const actions = {};
        events.forEach(event => {
            actions[event.action] = (actions[event.action] || 0) + 1;
        });
        
        return Object.entries(actions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([action, count]) => ({ action, count }));
    }

    getDeviceTypes(sessions) {
        const devices = { desktop: 0, mobile: 0, tablet: 0 };
        
        sessions.forEach(session => {
            const ua = session.userAgent?.toLowerCase() || '';
            if (ua.includes('mobile')) {
                devices.mobile++;
            } else if (ua.includes('tablet')) {
                devices.tablet++;
            } else {
                devices.desktop++;
            }
        });
        
        return devices;
    }

    getErrorTrends(sessions) {
        const errorsByDay = {};
        
        sessions.forEach(session => {
            if (session.errors && session.errors.length > 0) {
                session.errors.forEach(error => {
                    const date = new Date(error.timestamp).toISOString().split('T')[0];
                    errorsByDay[date] = (errorsByDay[date] || 0) + 1;
                });
            }
        });
        
        return Object.entries(errorsByDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }

    // حفظ البيانات
    saveToStorage() {
        try {
            const data = {
                events: this.events.slice(-1000), // احتفظ بآخر 1000 حدث
                pageViews: this.pageViews.slice(-500),
                sessions: Array.from(this.userSessions.entries()).slice(-50),
                performanceData: this.performanceData.slice(-100)
            };
            
            AppUtils.saveToStorage('analytics_data', data);
        } catch (error) {
            console.error('خطأ في حفظ بيانات التحليل:', error);
        }
    }

    loadStoredData() {
        try {
            const data = AppUtils.getFromStorage('analytics_data', {});
            
            this.events = data.events || [];
            this.pageViews = data.pageViews || [];
            this.performanceData = data.performanceData || [];
            
            if (data.sessions) {
                this.userSessions = new Map(data.sessions);
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات التحليل:', error);
        }
    }

    startDataCollection() {
        // إرسال البيانات للخادم كل دقيقة
        setInterval(() => {
            this.sendPendingData();
        }, 60000);
    }

    sendToServer(type, data) {
        // محاولة إرسال البيانات للخادم (Firebase Analytics أو خادم مخصص)
        if (navigator.onLine) {
            try {
                // يمكن تخصيص هذا لإرسال البيانات لخادمك
                this.queueForSending(type, data);
            } catch (error) {
                console.error('خطأ في إرسال بيانات التحليل:', error);
            }
        }
    }

    queueForSending(type, data) {
        const queue = AppUtils.getFromStorage('analytics_queue', []);
        queue.push({ type, data, timestamp: Date.now() });
        AppUtils.saveToStorage('analytics_queue', queue.slice(-100)); // احتفظ بآخر 100 عنصر
    }

    sendPendingData() {
        const queue = AppUtils.getFromStorage('analytics_queue', []);
        if (queue.length > 0 && navigator.onLine) {
            // إرسال البيانات المعلقة
            // يمكن تنفيذ هذا حسب احتياجاتك
            AppUtils.removeFromStorage('analytics_queue');
        }
    }

    // وظائف مساعدة
    getCurrentUserId() {
        return firebase.auth().currentUser?.uid || 'anonymous';
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // تحكم في التتبع
    enableTracking() {
        this.isTrackingEnabled = true;
    }

    disableTracking() {
        this.isTrackingEnabled = false;
    }

    clearAllData() {
        this.events = [];
        this.pageViews = [];
        this.performanceData = [];
        this.userSessions.clear();
        AppUtils.removeFromStorage('analytics_data');
        AppUtils.removeFromStorage('analytics_queue');
    }
}

// إنشاء مثيل عام
const analytics = new AnalyticsManager();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.AnalyticsManager = AnalyticsManager;
    window.analytics = analytics;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
}
