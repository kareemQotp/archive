/**
 * نظام التشخيص والمراقبة للتوثيق
 * Authentication Diagnostics and Monitoring System
 */

class AuthDiagnostics {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.isEnabled = true;
        
        // إعداد مراقبة أحداث التوثيق
        this.setupEventListeners();
    }

    setupEventListeners() {
        // مراقبة تغيير حالة التوثيق
        window.addEventListener('userAuthenticated', (event) => {
            this.log('auth', 'تسجيل دخول ناجح', event.detail);
        });

        window.addEventListener('userSignedOut', () => {
            this.log('auth', 'تسجيل خروج', {});
        });

        // مراقبة أخطاء إعادة التوجيه
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('redirect')) {
                this.log('error', 'خطأ في إعادة التوجيه', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno
                });
            }
        });

        // مراقبة تغيير الصفحة
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                this.log('navigation', 'تغيير صفحة', {
                    from: currentUrl,
                    to: window.location.href
                });
                currentUrl = window.location.href;
            }
        }, 1000);
    }

    log(category, message, data = {}) {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            category,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };

        this.logs.push(logEntry);

        // الحفاظ على حد أقصى من السجلات
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // طباعة في وحدة التحكم
        console.log(`[Auth Diagnostics] ${category.toUpperCase()}: ${message}`, data);

        // إرسال للخدمة السحابية إن وجدت
        this.sendToRemoteLogging(logEntry);
    }

    sendToRemoteLogging(logEntry) {
        // يمكن إضافة إرسال السجلات لخدمة المراقبة السحابية هنا
        // مثل Google Analytics, Firebase Analytics, أو خدمة مخصصة
    }

    getCurrentState() {
        const state = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            user: null,
            authSystem: null,
            redirectProtection: null
        };

        try {
            if (window.unifiedAuth) {
                state.authSystem = {
                    isInitialized: window.unifiedAuth.isInitialized,
                    isAuthenticated: window.unifiedAuth.isAuthenticated,
                    currentUser: window.unifiedAuth.currentUser ? {
                        uid: window.unifiedAuth.currentUser.uid,
                        email: window.unifiedAuth.currentUser.email
                    } : null,
                    userProfile: window.unifiedAuth.userProfile
                };
            }

            if (window.redirectProtection) {
                state.redirectProtection = window.redirectProtection.getRedirectStats();
            }
        } catch (error) {
            state.error = error.message;
        }

        return state;
    }

    getRecentLogs(count = 10) {
        return this.logs.slice(-count);
    }

    exportDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            currentState: this.getCurrentState(),
            recentLogs: this.getRecentLogs(20),
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            localStorage: this.getLocalStorageInfo(),
            sessionStorage: this.getSessionStorageInfo()
        };

        return diagnostics;
    }

    getLocalStorageInfo() {
        const info = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
                    info[key] = localStorage.getItem(key)?.substring(0, 100) + '...';
                }
            }
        } catch (error) {
            info.error = error.message;
        }
        return info;
    }

    getSessionStorageInfo() {
        const info = {};
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && (key.includes('redirect') || key.includes('auth') || key.includes('user'))) {
                    info[key] = sessionStorage.getItem(key);
                }
            }
        } catch (error) {
            info.error = error.message;
        }
        return info;
    }

    downloadDiagnostics() {
        const diagnostics = this.exportDiagnostics();
        const blob = new Blob([JSON.stringify(diagnostics, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auth-diagnostics-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showDiagnosticsPanel() {
        const panel = document.createElement('div');
        panel.id = 'authDiagnosticsPanel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: 'Courier New', monospace;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        const currentState = this.getCurrentState();
        const recentLogs = this.getRecentLogs(5);

        panel.innerHTML = `
            <div style="background: #007bff; color: white; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-size: 14px;">تشخيص التوثيق</h4>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
            <div style="padding: 10px; overflow-y: auto; flex: 1;">
                <div style="margin-bottom: 15px;">
                    <strong>حالة النظام:</strong><br>
                    <small>URL: ${currentState.url}</small><br>
                    <small>مُوثق: ${currentState.authSystem?.isAuthenticated ? 'نعم' : 'لا'}</small><br>
                    <small>مُهيّأ: ${currentState.authSystem?.isInitialized ? 'نعم' : 'لا'}</small><br>
                    ${currentState.authSystem?.currentUser ? `<small>المستخدم: ${currentState.authSystem.currentUser.email}</small><br>` : ''}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>السجلات الحديثة:</strong><br>
                    ${recentLogs.map(log => `<small>${log.timestamp.substring(11, 19)} [${log.category}] ${log.message}</small>`).join('<br>')}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="window.authDiagnostics.downloadDiagnostics()" 
                            style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        تصدير السجل
                    </button>
                    <button onclick="window.authDiagnostics.clearLogs()" 
                            style="background: #ffc107; color: black; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        مسح السجل
                    </button>
                </div>
            </div>
        `;

        // إزالة اللوحة الموجودة إن وجدت
        const existingPanel = document.getElementById('authDiagnosticsPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        document.body.appendChild(panel);
    }

    clearLogs() {
        this.logs = [];
        console.log('تم مسح سجلات التشخيص');
    }
}

// إنشاء مثيل عام من نظام التشخيص
if (!window.authDiagnostics) {
    window.authDiagnostics = new AuthDiagnostics();
}

// إضافة اختصار لوحة المفاتيح لفتح لوحة التشخيص (Ctrl+Shift+D)
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        window.authDiagnostics.showDiagnosticsPanel();
    }
});

console.log('✅ نظام التشخيص والمراقبة جاهز (اضغط Ctrl+Shift+D لفتح لوحة التشخيص)');