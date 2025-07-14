// Advanced Performance Testing Suite
// نظام اختبار الأداء المتقدم

class PerformanceTester {
    constructor() {
        this.metrics = {
            loadTime: 0,
            domReady: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            memoryUsage: null,
            networkCalls: [],
            errors: []
        };
        
        this.benchmarks = {
            loadTime: 3000,     // 3 seconds
            domReady: 2000,     // 2 seconds
            firstPaint: 1000,   // 1 second
            fcp: 1500,          // 1.5 seconds
            lcp: 2500,          // 2.5 seconds
            memoryUsage: 50     // 50% of limit
        };

        this.initPerformanceObserver();
    }

    initPerformanceObserver() {
        // Performance Observer for Paint Timing
        if ('PerformanceObserver' in window) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-paint') {
                            this.metrics.firstPaint = entry.startTime;
                        } else if (entry.name === 'first-contentful-paint') {
                            this.metrics.firstContentfulPaint = entry.startTime;
                        }
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });

                // LCP Observer
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.largestContentfulPaint = lastEntry.startTime;
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // Resource Observer
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
                            this.metrics.networkCalls.push({
                                name: entry.name,
                                duration: entry.duration,
                                size: entry.transferSize || entry.encodedBodySize,
                                startTime: entry.startTime
                            });
                        }
                    }
                });
                resourceObserver.observe({ entryTypes: ['resource'] });

            } catch (error) {
                console.warn('Performance Observer not fully supported:', error);
            }
        }
    }

    collectNavigationMetrics() {
        const timing = performance.timing;
        
        this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
        this.metrics.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        // Memory metrics if available
        if (performance.memory) {
            this.metrics.memoryUsage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
                percentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)
            };
        }
    }

    analyzePerformance() {
        this.collectNavigationMetrics();

        const analysis = {
            overall: 'excellent',
            score: 100,
            issues: [],
            recommendations: [],
            metrics: this.metrics
        };

        // Analyze load time
        if (this.metrics.loadTime > this.benchmarks.loadTime) {
            analysis.issues.push({
                type: 'performance',
                metric: 'loadTime',
                value: this.metrics.loadTime,
                benchmark: this.benchmarks.loadTime,
                severity: this.metrics.loadTime > this.benchmarks.loadTime * 2 ? 'high' : 'medium',
                message: `وقت التحميل طويل: ${this.metrics.loadTime}ms (الحد الأقصى: ${this.benchmarks.loadTime}ms)`
            });
            analysis.score -= 20;
        }

        // Analyze DOM ready time
        if (this.metrics.domReady > this.benchmarks.domReady) {
            analysis.issues.push({
                type: 'performance',
                metric: 'domReady',
                value: this.metrics.domReady,
                benchmark: this.benchmarks.domReady,
                severity: this.metrics.domReady > this.benchmarks.domReady * 2 ? 'high' : 'medium',
                message: `وقت تحضير DOM طويل: ${this.metrics.domReady}ms (الحد الأقصى: ${this.benchmarks.domReady}ms)`
            });
            analysis.score -= 15;
        }

        // Analyze First Contentful Paint
        if (this.metrics.firstContentfulPaint > this.benchmarks.fcp) {
            analysis.issues.push({
                type: 'performance',
                metric: 'firstContentfulPaint',
                value: this.metrics.firstContentfulPaint,
                benchmark: this.benchmarks.fcp,
                severity: 'medium',
                message: `First Contentful Paint بطيء: ${this.metrics.firstContentfulPaint.toFixed(0)}ms`
            });
            analysis.score -= 10;
        }

        // Analyze Largest Contentful Paint
        if (this.metrics.largestContentfulPaint > this.benchmarks.lcp) {
            analysis.issues.push({
                type: 'performance',
                metric: 'largestContentfulPaint',
                value: this.metrics.largestContentfulPaint,
                benchmark: this.benchmarks.lcp,
                severity: 'medium',
                message: `Largest Contentful Paint بطيء: ${this.metrics.largestContentfulPaint.toFixed(0)}ms`
            });
            analysis.score -= 10;
        }

        // Analyze memory usage
        if (this.metrics.memoryUsage && parseFloat(this.metrics.memoryUsage.percentage) > this.benchmarks.memoryUsage) {
            analysis.issues.push({
                type: 'memory',
                metric: 'memoryUsage',
                value: this.metrics.memoryUsage.percentage,
                benchmark: this.benchmarks.memoryUsage,
                severity: parseFloat(this.metrics.memoryUsage.percentage) > 80 ? 'high' : 'medium',
                message: `استهلاك ذاكرة مرتفع: ${this.metrics.memoryUsage.percentage}% (${this.metrics.memoryUsage.used}MB)`
            });
            analysis.score -= 15;
        }

        // Analyze network calls
        const slowCalls = this.metrics.networkCalls.filter(call => call.duration > 1000);
        if (slowCalls.length > 0) {
            analysis.issues.push({
                type: 'network',
                metric: 'networkCalls',
                value: slowCalls.length,
                severity: 'medium',
                message: `${slowCalls.length} طلبات شبكة بطيئة (أكثر من ثانية)`
            });
            analysis.score -= slowCalls.length * 5;
        }

        // Generate recommendations
        this.generateRecommendations(analysis);

        // Set overall rating
        if (analysis.score >= 90) analysis.overall = 'excellent';
        else if (analysis.score >= 70) analysis.overall = 'good';
        else if (analysis.score >= 50) analysis.overall = 'fair';
        else analysis.overall = 'poor';

        return analysis;
    }

    generateRecommendations(analysis) {
        // Performance recommendations
        if (analysis.issues.some(issue => issue.metric === 'loadTime')) {
            analysis.recommendations.push({
                category: 'performance',
                title: 'تحسين وقت التحميل',
                description: 'قم بضغط الملفات وتقليل حجم الصور',
                priority: 'high',
                actions: [
                    'ضغط ملفات CSS و JavaScript',
                    'تحسين الصور وتحويلها إلى WebP',
                    'استخدام CDN للملفات الثابتة',
                    'تمكين ضغط GZIP على الخادم'
                ]
            });
        }

        if (analysis.issues.some(issue => issue.type === 'memory')) {
            analysis.recommendations.push({
                category: 'memory',
                title: 'تحسين استهلاك الذاكرة',
                description: 'قم بتحسين استخدام الذاكرة في JavaScript',
                priority: 'medium',
                actions: [
                    'إزالة المراجع غير المستخدمة',
                    'استخدام Lazy Loading للمكونات',
                    'تنظيف Event Listeners عند عدم الحاجة',
                    'تحسين حجم البيانات المخزنة'
                ]
            });
        }

        if (analysis.issues.some(issue => issue.type === 'network')) {
            analysis.recommendations.push({
                category: 'network',
                title: 'تحسين طلبات الشبكة',
                description: 'قم بتحسين طلبات API والموارد',
                priority: 'medium',
                actions: [
                    'دمج طلبات API المتعددة',
                    'استخدام HTTP/2',
                    'تنفيذ caching مناسب',
                    'تحسين استعلامات قاعدة البيانات'
                ]
            });
        }

        // General recommendations
        analysis.recommendations.push({
            category: 'monitoring',
            title: 'مراقبة الأداء المستمرة',
            description: 'قم بإعداد مراقبة دورية للأداء',
            priority: 'low',
            actions: [
                'إعداد تنبيهات الأداء',
                'مراجعة تقارير الأداء شهرياً',
                'اختبار الأداء على أجهزة مختلفة',
                'مراقبة استهلاك الذاكرة'
            ]
        });
    }

    generateReport() {
        const analysis = this.analyzePerformance();
        
        return {
            timestamp: new Date().toISOString(),
            analysis,
            rawMetrics: this.metrics,
            benchmarks: this.benchmarks,
            environment: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };
    }

    // Export report to JSON
    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Component Performance Tester
class ComponentTester {
    constructor() {
        this.componentTests = [];
    }

    async testComponent(name, testFunction) {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : null;

        try {
            const result = await testFunction();
            const endTime = performance.now();
            const endMemory = performance.memory ? performance.memory.usedJSHeapSize : null;

            return {
                name,
                success: true,
                duration: endTime - startTime,
                memoryDelta: endMemory && startMemory ? endMemory - startMemory : null,
                result
            };
        } catch (error) {
            const endTime = performance.now();
            return {
                name,
                success: false,
                duration: endTime - startTime,
                error: error.message,
                stack: error.stack
            };
        }
    }

    async testAllComponents() {
        const tests = [
            {
                name: 'Firebase Initialization',
                test: () => this.testFirebaseInit()
            },
            {
                name: 'UI Components Load',
                test: () => this.testUIComponents()
            },
            {
                name: 'Data Manager Performance',
                test: () => this.testDataManager()
            },
            {
                name: 'Notification System Performance',
                test: () => this.testNotificationPerformance()
            },
            {
                name: 'Analytics Performance',
                test: () => this.testAnalyticsPerformance()
            }
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.testComponent(test.name, test.test);
            results.push(result);
        }

        return results;
    }

    async testFirebaseInit() {
        const startTime = performance.now();
        
        // Test Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();
        const storage = firebase.storage();

        // Simple operation test
        await new Promise(resolve => {
            auth.onAuthStateChanged(resolve);
        });

        const endTime = performance.now();
        
        return {
            duration: endTime - startTime,
            services: {
                auth: !!auth,
                firestore: !!db,
                storage: !!storage
            }
        };
    }

    async testUIComponents() {
        const components = [
            'sidebar',
            'testProgress',
            'testSummary',
            'runTestsBtn'
        ];

        const componentResults = {};
        
        for (const componentId of components) {
            const startTime = performance.now();
            const element = document.getElementById(componentId);
            const endTime = performance.now();

            componentResults[componentId] = {
                exists: !!element,
                selectionTime: endTime - startTime,
                visible: element ? element.offsetParent !== null : false
            };
        }

        return componentResults;
    }

    async testDataManager() {
        if (!window.dataManager) {
            throw new Error('Data Manager not loaded');
        }

        const startTime = performance.now();
        
        // Test operations
        const testData = { test: true, timestamp: Date.now() };
        dataManager.addToSyncQueue({
            type: 'test',
            data: testData,
            timestamp: Date.now()
        });

        const stats = dataManager.getCacheStats();
        const endTime = performance.now();

        return {
            duration: endTime - startTime,
            stats,
            operationCount: 1
        };
    }

    async testNotificationPerformance() {
        if (!window.notify) {
            throw new Error('Notification system not loaded');
        }

        const startTime = performance.now();
        
        // Test multiple notifications
        const notifications = [];
        for (let i = 0; i < 5; i++) {
            notifications.push(
                notify.info('Test', `Performance test ${i + 1}`, { duration: 500 })
            );
        }

        const endTime = performance.now();

        return {
            duration: endTime - startTime,
            notificationCount: notifications.length,
            averageTime: (endTime - startTime) / notifications.length
        };
    }

    async testAnalyticsPerformance() {
        if (!window.analytics) {
            throw new Error('Analytics system not loaded');
        }

        const startTime = performance.now();
        
        // Test event tracking
        for (let i = 0; i < 10; i++) {
            analytics.trackEvent('Performance', 'test_event', `test_${i}`);
        }

        // Generate report
        const report = analytics.generateReport(1);
        const endTime = performance.now();

        return {
            duration: endTime - startTime,
            eventsTracked: 10,
            reportGenerated: !!report,
            averageEventTime: (endTime - startTime) / 10
        };
    }
}

// Initialize global performance tester
window.performanceTester = new PerformanceTester();
window.componentTester = new ComponentTester();

// Auto-start performance monitoring when page loads
window.addEventListener('load', () => {
    // Wait a bit for everything to settle
    setTimeout(() => {
        window.performanceTester.collectNavigationMetrics();
    }, 1000);
});

// Export for integration tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceTester, ComponentTester };
}
