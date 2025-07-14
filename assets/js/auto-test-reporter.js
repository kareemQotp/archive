// Auto Test Report Generator
// مولد تقارير الاختبار التلقائي

class AutoTestReporter {
    constructor() {
        this.testResults = [];
        this.systemMetrics = {};
        this.reportConfig = {
            includePerformance: true,
            includeSecurityChecks: true,
            includeComponentTests: true,
            exportFormat: 'html' // html, json, pdf
        };
        
        this.initializeReporting();
    }

    initializeReporting() {
        // Auto-run tests when page loads if configured
        if (this.shouldAutoRun()) {
            this.runAutoTests();
        }

        // Set up periodic testing
        this.setupPeriodicTesting();
    }

    shouldAutoRun() {
        const params = new URLSearchParams(window.location.search);
        return params.get('autotest') === 'true' || 
               localStorage.getItem('autotest-enabled') === 'true';
    }

    async runAutoTests() {
        console.log('🤖 بدء الاختبار التلقائي...');
        
        const startTime = Date.now();
        const testSuite = {
            timestamp: new Date().toISOString(),
            browser: this.getBrowserInfo(),
            system: this.getSystemInfo(),
            results: {}
        };

        try {
            // 1. Basic Integration Tests
            console.log('📋 تشغيل الاختبارات الأساسية...');
            if (window.integrationTester) {
                const basicResults = await window.integrationTester.runAllTests();
                testSuite.results.basic = basicResults;
                this.displayTestProgress('الاختبارات الأساسية', 'completed');
            }

            // 2. Performance Tests
            if (this.reportConfig.includePerformance && window.performanceTester) {
                console.log('⚡ تشغيل اختبارات الأداء...');
                const performanceReport = window.performanceTester.generateReport();
                testSuite.results.performance = performanceReport;
                this.displayTestProgress('اختبارات الأداء', 'completed');
            }

            // 3. Component Tests
            if (this.reportConfig.includeComponentTests && window.componentTester) {
                console.log('🧩 تشغيل اختبارات المكونات...');
                const componentResults = await window.componentTester.testAllComponents();
                testSuite.results.components = componentResults;
                this.displayTestProgress('اختبارات المكونات', 'completed');
            }

            // 4. Final Integration Tests
            if (window.finalIntegrationTest) {
                console.log('🔄 تشغيل الاختبار الشامل النهائي...');
                const finalResults = await window.finalIntegrationTest.runAllTests();
                testSuite.results.final = finalResults;
                this.displayTestProgress('الاختبار الشامل', 'completed');
            }

            // 5. Security Checks
            if (this.reportConfig.includeSecurityChecks) {
                console.log('🔒 تشغيل فحوصات الأمان...');
                const securityResults = await this.runSecurityChecks();
                testSuite.results.security = securityResults;
                this.displayTestProgress('فحوصات الأمان', 'completed');
            }

            const endTime = Date.now();
            testSuite.duration = endTime - startTime;
            testSuite.status = 'completed';

            // Generate comprehensive report
            const report = this.generateComprehensiveReport(testSuite);
            this.saveReport(report);
            this.displayFinalResults(report);

            console.log('✅ اكتمل الاختبار التلقائي بنجاح');
            
            // Send notification
            if (window.notify) {
                notify.success('اكتمل الاختبار التلقائي', 
                    `مدة التشغيل: ${(testSuite.duration / 1000).toFixed(1)} ثانية`);
            }

        } catch (error) {
            console.error('❌ خطأ في الاختبار التلقائي:', error);
            testSuite.status = 'failed';
            testSuite.error = error.message;
            
            if (window.notify) {
                notify.error('فشل الاختبار التلقائي', error.message);
            }
        }

        return testSuite;
    }

    async runSecurityChecks() {
        const securityChecks = {
            timestamp: Date.now(),
            checks: {}
        };

        try {
            // CSP Check
            securityChecks.checks.csp = this.checkCSP();
            
            // HTTPS Check
            securityChecks.checks.https = this.checkHTTPS();
            
            // Cookie Security
            securityChecks.checks.cookies = this.checkCookieSecurity();
            
            // Input Validation
            securityChecks.checks.inputValidation = this.checkInputValidation();
            
            // CSRF Protection
            securityChecks.checks.csrf = this.checkCSRFProtection();
            
            // Local Storage Security
            securityChecks.checks.localStorage = this.checkLocalStorageSecurity();

            securityChecks.status = 'completed';
            securityChecks.score = this.calculateSecurityScore(securityChecks.checks);

        } catch (error) {
            securityChecks.status = 'failed';
            securityChecks.error = error.message;
        }

        return securityChecks;
    }

    checkCSP() {
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return {
            present: !!cspMeta,
            value: cspMeta ? cspMeta.getAttribute('content') : null,
            score: cspMeta ? 100 : 0
        };
    }

    checkHTTPS() {
        const isHTTPS = location.protocol === 'https:';
        return {
            secure: isHTTPS,
            protocol: location.protocol,
            score: isHTTPS ? 100 : 0
        };
    }

    checkCookieSecurity() {
        const cookies = document.cookie.split(';');
        const secureCount = cookies.filter(cookie => 
            cookie.includes('Secure') && cookie.includes('HttpOnly')).length;
        
        return {
            total: cookies.length,
            secure: secureCount,
            score: cookies.length > 0 ? (secureCount / cookies.length) * 100 : 100
        };
    }

    checkInputValidation() {
        const inputs = document.querySelectorAll('input, textarea, select');
        const validatedInputs = Array.from(inputs).filter(input => 
            input.hasAttribute('pattern') || 
            input.hasAttribute('maxlength') ||
            input.hasAttribute('required') ||
            input.type !== 'text'
        ).length;

        return {
            total: inputs.length,
            validated: validatedInputs,
            score: inputs.length > 0 ? (validatedInputs / inputs.length) * 100 : 100
        };
    }

    checkCSRFProtection() {
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        const forms = document.querySelectorAll('form');
        const protectedForms = Array.from(forms).filter(form => 
            form.querySelector('input[name="_token"]') || 
            form.querySelector('input[name="csrf_token"]')
        ).length;

        return {
            tokenPresent: !!csrfToken,
            totalForms: forms.length,
            protectedForms: protectedForms,
            score: csrfToken ? 100 : (forms.length > 0 ? (protectedForms / forms.length) * 100 : 100)
        };
    }

    checkLocalStorageSecurity() {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /private.*key/i,
            /access.*token/i
        ];

        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;
        
        let sensitiveDataFound = false;
        let totalItems = 0;

        if (localStorage) {
            totalItems += localStorage.length;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (sensitivePatterns.some(pattern => 
                    pattern.test(key) || pattern.test(value))) {
                    sensitiveDataFound = true;
                    break;
                }
            }
        }

        if (sessionStorage && !sensitiveDataFound) {
            totalItems += sessionStorage.length;
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                if (sensitivePatterns.some(pattern => 
                    pattern.test(key) || pattern.test(value))) {
                    sensitiveDataFound = true;
                    break;
                }
            }
        }

        return {
            totalItems,
            sensitiveDataFound,
            score: sensitiveDataFound ? 0 : 100
        };
    }

    calculateSecurityScore(checks) {
        const scores = Object.values(checks).map(check => check.score || 0);
        return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    }

    generateComprehensiveReport(testSuite) {
        const report = {
            metadata: {
                generated: new Date().toISOString(),
                generatedBy: 'نظام الاختبار التلقائي',
                version: '1.0.0',
                duration: testSuite.duration,
                status: testSuite.status
            },
            environment: {
                browser: testSuite.browser,
                system: testSuite.system,
                url: window.location.href,
                timestamp: testSuite.timestamp
            },
            summary: this.generateSummary(testSuite.results),
            details: testSuite.results,
            recommendations: this.generateRecommendations(testSuite.results),
            metrics: this.calculateMetrics(testSuite.results)
        };

        return report;
    }

    generateSummary(results) {
        const summary = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            warnings: 0,
            overallScore: 0,
            status: 'unknown'
        };

        // Aggregate results from all test suites
        if (results.basic) {
            summary.totalTests += results.basic.total || 0;
            summary.passedTests += results.basic.passed || 0;
            summary.failedTests += results.basic.failed || 0;
            summary.warnings += results.basic.warnings || 0;
        }

        if (results.final) {
            summary.totalTests += results.final.total || 0;
            summary.passedTests += results.final.passed || 0;
            summary.failedTests += results.final.failed || 0;
            summary.warnings += results.final.warnings || 0;
        }

        if (results.components) {
            const componentTests = results.components.length || 0;
            const passedComponents = results.components.filter(c => c.success).length || 0;
            summary.totalTests += componentTests;
            summary.passedTests += passedComponents;
            summary.failedTests += componentTests - passedComponents;
        }

        // Calculate overall score
        if (summary.totalTests > 0) {
            summary.overallScore = (summary.passedTests / summary.totalTests) * 100;
        }

        // Determine status
        if (summary.failedTests === 0) {
            summary.status = 'excellent';
        } else if (summary.overallScore >= 80) {
            summary.status = 'good';
        } else if (summary.overallScore >= 60) {
            summary.status = 'fair';
        } else {
            summary.status = 'poor';
        }

        return summary;
    }

    generateRecommendations(results) {
        const recommendations = [];

        // Performance recommendations
        if (results.performance && results.performance.analysis) {
            if (results.performance.analysis.score < 80) {
                recommendations.push({
                    category: 'performance',
                    priority: 'high',
                    title: 'تحسين الأداء',
                    description: 'النظام يحتاج إلى تحسينات في الأداء',
                    actions: [
                        'تحسين وقت التحميل',
                        'تقليل استهلاك الذاكرة',
                        'ضغط الملفات',
                        'تحسين طلبات الشبكة'
                    ]
                });
            }
        }

        // Security recommendations
        if (results.security && results.security.score < 90) {
            recommendations.push({
                category: 'security',
                priority: 'critical',
                title: 'تحسين الأمان',
                description: 'هناك مشاكل أمنية تحتاج إلى معالجة',
                actions: [
                    'تفعيل HTTPS',
                    'إضافة Content Security Policy',
                    'تحسين حماية CSRF',
                    'تأمين Local Storage'
                ]
            });
        }

        // Component recommendations
        if (results.components) {
            const failedComponents = results.components.filter(c => !c.success);
            if (failedComponents.length > 0) {
                recommendations.push({
                    category: 'components',
                    priority: 'medium',
                    title: 'إصلاح المكونات',
                    description: `${failedComponents.length} مكون يحتاج إلى إصلاح`,
                    actions: failedComponents.map(c => `إصلاح ${c.name}: ${c.error}`)
                });
            }
        }

        // General recommendations
        recommendations.push({
            category: 'maintenance',
            priority: 'low',
            title: 'الصيانة الدورية',
            description: 'اقتراحات للصيانة المنتظمة',
            actions: [
                'إجراء اختبارات أسبوعية',
                'مراجعة السجلات',
                'تحديث التوثيق',
                'تدريب المستخدمين'
            ]
        });

        return recommendations;
    }

    calculateMetrics(results) {
        const metrics = {
            reliability: 0,
            performance: 0,
            security: 0,
            usability: 0,
            overall: 0
        };

        // Reliability metric (based on test pass rate)
        const summary = this.generateSummary(results);
        metrics.reliability = summary.overallScore;

        // Performance metric
        if (results.performance && results.performance.analysis) {
            metrics.performance = results.performance.analysis.score;
        }

        // Security metric
        if (results.security) {
            metrics.security = results.security.score;
        }

        // Usability metric (based on UI tests and component tests)
        if (results.components) {
            const uiTests = results.components.filter(c => 
                c.name.includes('UI') || c.name.includes('Component'));
            if (uiTests.length > 0) {
                const passedUI = uiTests.filter(c => c.success).length;
                metrics.usability = (passedUI / uiTests.length) * 100;
            }
        }

        // Overall metric
        metrics.overall = (metrics.reliability + metrics.performance + 
                          metrics.security + metrics.usability) / 4;

        return metrics;
    }

    displayTestProgress(testName, status) {
        const message = `${testName}: ${status === 'completed' ? 'مكتمل' : 'جاري...'}`;
        console.log(`📊 ${message}`);
        
        if (window.notify) {
            if (status === 'completed') {
                notify.info('تقدم الاختبار', message);
            }
        }
    }

    displayFinalResults(report) {
        console.log('📈 النتائج النهائية:', report);
        
        const summary = report.summary;
        const statusEmoji = {
            excellent: '🏆',
            good: '✅',
            fair: '⚠️',
            poor: '❌'
        };

        const message = `${statusEmoji[summary.status]} النتيجة: ${summary.status} (${summary.passedTests}/${summary.totalTests})`;
        
        if (window.notify) {
            const notifyType = summary.status === 'excellent' || summary.status === 'good' ? 'success' :
                             summary.status === 'fair' ? 'warning' : 'error';
            notify[notifyType]('تقرير الاختبار', message);
        }

        // Display in console table
        console.table({
            'إجمالي الاختبارات': summary.totalTests,
            'الاختبارات الناجحة': summary.passedTests,
            'الاختبارات الفاشلة': summary.failedTests,
            'التحذيرات': summary.warnings,
            'النتيجة العامة': `${summary.overallScore.toFixed(1)}%`,
            'حالة النظام': summary.status
        });
    }

    saveReport(report) {
        try {
            // Save to localStorage
            localStorage.setItem('latest-test-report', JSON.stringify(report));
            
            // Save to history
            const history = JSON.parse(localStorage.getItem('test-report-history') || '[]');
            history.unshift({
                timestamp: report.metadata.generated,
                summary: report.summary,
                metrics: report.metrics
            });
            
            // Keep only last 10 reports
            if (history.length > 10) {
                history.splice(10);
            }
            
            localStorage.setItem('test-report-history', JSON.stringify(history));
            
            console.log('💾 تم حفظ التقرير بنجاح');
            
        } catch (error) {
            console.error('❌ فشل في حفظ التقرير:', error);
        }
    }

    exportReportAsHTML(report) {
        const html = this.generateHTMLReport(report);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير اختبار النظام - ${new Date(report.metadata.generated).toLocaleDateString('ar-SA')}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; }
        .metric-card { border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-excellent { background: linear-gradient(135deg, #28a745, #20c997); }
        .status-good { background: linear-gradient(135deg, #17a2b8, #6f42c1); }
        .status-fair { background: linear-gradient(135deg, #ffc107, #fd7e14); }
        .status-poor { background: linear-gradient(135deg, #dc3545, #e83e8c); }
    </style>
</head>
<body class="bg-light">
    <div class="container my-4">
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h1 class="h3 mb-0">تقرير اختبار النظام الشامل</h1>
                        <small>تاريخ الإنشاء: ${new Date(report.metadata.generated).toLocaleString('ar-SA')}</small>
                    </div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="metric-card p-3 text-center status-${report.summary.status}">
                                    <h4 class="text-white">${report.summary.overallScore.toFixed(1)}%</h4>
                                    <p class="text-white mb-0">النتيجة العامة</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="metric-card p-3 text-center bg-success">
                                    <h4 class="text-white">${report.summary.passedTests}</h4>
                                    <p class="text-white mb-0">اختبارات ناجحة</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="metric-card p-3 text-center bg-danger">
                                    <h4 class="text-white">${report.summary.failedTests}</h4>
                                    <p class="text-white mb-0">اختبارات فاشلة</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="metric-card p-3 text-center bg-warning">
                                    <h4 class="text-white">${report.summary.warnings}</h4>
                                    <p class="text-white mb-0">تحذيرات</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h5>المقاييس التفصيلية</h5>
                                <table class="table table-striped">
                                    <tr><td>الموثوقية</td><td>${report.metrics.reliability.toFixed(1)}%</td></tr>
                                    <tr><td>الأداء</td><td>${report.metrics.performance.toFixed(1)}%</td></tr>
                                    <tr><td>الأمان</td><td>${report.metrics.security.toFixed(1)}%</td></tr>
                                    <tr><td>سهولة الاستخدام</td><td>${report.metrics.usability.toFixed(1)}%</td></tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h5>معلومات البيئة</h5>
                                <table class="table table-striped">
                                    <tr><td>المتصفح</td><td>${report.environment.browser.name} ${report.environment.browser.version}</td></tr>
                                    <tr><td>نظام التشغيل</td><td>${report.environment.system.platform}</td></tr>
                                    <tr><td>مدة الاختبار</td><td>${(report.metadata.duration / 1000).toFixed(1)} ثانية</td></tr>
                                </table>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h5>التوصيات</h5>
                            ${report.recommendations.map(rec => `
                                <div class="alert alert-${rec.priority === 'critical' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'}">
                                    <h6>${rec.title}</h6>
                                    <p>${rec.description}</p>
                                    <ul>
                                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = { name: 'Unknown', version: 'Unknown' };
        
        if (ua.includes('Chrome')) {
            const match = ua.match(/Chrome\/(\d+)/);
            browser = { name: 'Chrome', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Firefox')) {
            const match = ua.match(/Firefox\/(\d+)/);
            browser = { name: 'Firefox', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Safari')) {
            const match = ua.match(/Safari\/(\d+)/);
            browser = { name: 'Safari', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Edge')) {
            const match = ua.match(/Edge\/(\d+)/);
            browser = { name: 'Edge', version: match ? match[1] : 'Unknown' };
        }
        
        return browser;
    }

    getSystemInfo() {
        return {
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            userAgent: navigator.userAgent
        };
    }

    setupPeriodicTesting() {
        // Set up daily auto-test if enabled
        const dailyTestEnabled = localStorage.getItem('daily-auto-test') === 'true';
        if (dailyTestEnabled) {
            const lastTest = localStorage.getItem('last-auto-test-date');
            const today = new Date().toDateString();
            
            if (lastTest !== today) {
                // Run daily test
                setTimeout(() => {
                    this.runAutoTests().then(() => {
                        localStorage.setItem('last-auto-test-date', today);
                    });
                }, 5000); // Wait 5 seconds after page load
            }
        }
    }

    // Public methods for manual control
    enableDailyTesting() {
        localStorage.setItem('daily-auto-test', 'true');
        notify.success('تم التفعيل', 'سيتم تشغيل الاختبار التلقائي يومياً');
    }

    disableDailyTesting() {
        localStorage.setItem('daily-auto-test', 'false');
        notify.info('تم الإلغاء', 'تم إلغاء الاختبار التلقائي اليومي');
    }

    getTestHistory() {
        return JSON.parse(localStorage.getItem('test-report-history') || '[]');
    }

    getLatestReport() {
        return JSON.parse(localStorage.getItem('latest-test-report') || 'null');
    }

    exportLatestReport() {
        const report = this.getLatestReport();
        if (report) {
            this.exportReportAsHTML(report);
        } else {
            notify.warning('لا يوجد تقرير', 'لا يوجد تقرير محفوظ للتصدير');
        }
    }
}

// Initialize global auto test reporter
window.autoTestReporter = new AutoTestReporter();

// Expose useful functions globally
window.runAutoTest = () => window.autoTestReporter.runAutoTests();
window.exportTestReport = () => window.autoTestReporter.exportLatestReport();
window.enableDailyTesting = () => window.autoTestReporter.enableDailyTesting();
window.disableDailyTesting = () => window.autoTestReporter.disableDailyTesting();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutoTestReporter };
}
