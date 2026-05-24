// Script Loader and Dependency Manager
// مدير تحميل النصوص والتبعيات

class ScriptLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.failedScripts = new Set();
        this.pendingScripts = new Map();
        this.dependencies = {
            'notifications.js': [],
            'app-config.js': [],
            'roles.js': ['app-config.js'],
            'analytics.js': ['app-config.js'],
            'data-manager.js': ['app-config.js', 'notifications.js'],
            'performance-tester.js': [],
            'final-integration-test.js': ['notifications.js', 'analytics.js', 'data-manager.js'],
            'auto-test-reporter.js': ['notifications.js', 'analytics.js']
        };
    }

    async loadScript(src) {
        const scriptName = src.split('/').pop();
        
        if (this.loadedScripts.has(scriptName)) {
            return Promise.resolve();
        }

        if (this.failedScripts.has(scriptName)) {
            return Promise.reject(new Error(`Script ${scriptName} previously failed to load`));
        }

        if (this.pendingScripts.has(scriptName)) {
            return this.pendingScripts.get(scriptName);
        }

        const promise = this._loadScriptElement(src, scriptName);
        this.pendingScripts.set(scriptName, promise);

        try {
            await promise;
            this.loadedScripts.add(scriptName);
            this.pendingScripts.delete(scriptName);
            return Promise.resolve();
        } catch (error) {
            this.failedScripts.add(scriptName);
            this.pendingScripts.delete(scriptName);
            return Promise.reject(error);
        }
    }

    _loadScriptElement(src, scriptName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            
            script.onload = () => {
                console.log(`✅ تم تحميل: ${scriptName}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`❌ فشل تحميل: ${scriptName}`, error);
                reject(new Error(`Failed to load script: ${scriptName}`));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadScriptWithDependencies(scriptName) {
        const dependencies = this.dependencies[scriptName] || [];
        
        // Load dependencies first
        for (const dep of dependencies) {
            await this.loadScript(`assets/js/${dep}`);
        }
        
        // Load the script itself
        await this.loadScript(`assets/js/${scriptName}`);
    }

    async ensureAllScriptsLoaded() {
        const requiredScripts = [
            'app-config.js',
            'roles.js', 
            'notifications.js',
            'data-manager.js',
            'analytics.js'
        ];

        const optionalScripts = [
            '../assets/js/performance-tester.js',
            '../assets/js/final-integration-test.js',
            '../assets/js/auto-test-reporter.js'
        ];

        try {
            // Load required scripts
            for (const script of requiredScripts) {
                await this.loadScriptWithDependencies(script);
            }

            // Load optional scripts (don't fail if they're missing)
            for (const script of optionalScripts) {
                try {
                    await this.loadScript(script);
                } catch (error) {
                    console.warn(`⚠️ اختياري - فشل تحميل: ${script}`);
                }
            }

            return this.verifyGlobalObjects();
        } catch (error) {
            console.error('فشل في تحميل النصوص المطلوبة:', error);
            throw error;
        }
    }

    verifyGlobalObjects() {
        const expectedGlobals = {
            APP_CONFIG: 'window.APP_CONFIG',
            USER_ROLES: 'window.USER_ROLES', 
            notify: 'window.notify',
            analytics: 'window.analytics',
            dataManager: 'window.dataManager'
        };

        const verification = {};
        const missing = [];

        for (const [name, path] of Object.entries(expectedGlobals)) {
            const exists = this.checkGlobalExists(path);
            verification[name] = exists;
            
            if (!exists) {
                missing.push(name);
            }
        }

        if (missing.length > 0) {
            console.warn('المتغيرات العامة المفقودة:', missing);
        }

        return {
            verification,
            missing,
            allLoaded: missing.length === 0
        };
    }

    checkGlobalExists(path) {
        try {
            const parts = path.split('.');
            let obj = window;
            
            for (const part of parts) {
                if (part === 'window') continue;
                if (obj[part] === undefined) return false;
                obj = obj[part];
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    createFallbackObjects() {
        // Create fallback notification system
        if (!window.notify) {
            console.log('🔧 إنشاء نظام إشعارات احتياطي');
            window.notify = {
                success: (title, message) => {
                    console.log(`✅ ${title}: ${message}`);
                    this.showFallbackNotification('success', title, message);
                },
                error: (title, message) => {
                    console.error(`❌ ${title}: ${message}`);
                    this.showFallbackNotification('error', title, message);
                },
                warning: (title, message) => {
                    console.warn(`⚠️ ${title}: ${message}`);
                    this.showFallbackNotification('warning', title, message);
                },
                info: (title, message) => {
                    console.info(`ℹ️ ${title}: ${message}`);
                    this.showFallbackNotification('info', title, message);
                }
            };
        }

        // Create fallback analytics system
        if (!window.analytics) {
            console.log('🔧 إنشاء نظام تحليلات احتياطي');
            window.analytics = {
                trackEvent: (category, action, label) => {
                    console.log('📊 تتبع حدث:', { category, action, label });
                },
                generateReport: (days = 1) => ({
                    summary: { totalEvents: 0 },
                    events: [],
                    timestamp: new Date().toISOString()
                }),
                events: [],
                currentSession: { id: 'fallback-session' }
            };
        }

        // Create fallback data manager
        if (!window.dataManager) {
            console.log('🔧 إنشاء مدير بيانات احتياطي');
            window.dataManager = {
                getCacheStats: () => ({
                    size: 0,
                    isOnline: navigator.onLine,
                    syncQueueSize: 0
                }),
                addToSyncQueue: (item) => {
                    console.log('💾 إضافة إلى طابور المزامنة:', item);
                },
                isOnline: navigator.onLine
            };
        }

        // Unified UI handles sidebar; no legacy sidebarManager fallback needed
    }

    showFallbackNotification(type, title, message) {
        // Create a simple fallback notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        const colors = {
            success: '#38a169',
            error: '#e53e3e', 
            warning: '#d69e2e',
            info: '#3182ce'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.innerHTML = `<strong>${title}</strong><br>${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    getLoadStatus() {
        return {
            loaded: Array.from(this.loadedScripts),
            failed: Array.from(this.failedScripts),
            pending: Array.from(this.pendingScripts.keys())
        };
    }
}

// Initialize global script loader
window.scriptLoader = new ScriptLoader();

// Enhanced script loading function
window.ensureScriptsLoaded = async function() {
    try {
        console.log('🔄 بدء تحميل النصوص...');
        
        const verification = await window.scriptLoader.ensureAllScriptsLoaded();
        
        if (!verification.allLoaded) {
            console.warn('⚠️ بعض النصوص لم تحمل، إنشاء كائنات احتياطية...');
            window.scriptLoader.createFallbackObjects();
        }
        
        console.log('✅ تم إعداد جميع المكونات');
        return verification;
        
    } catch (error) {
        console.error('❌ خطأ في تحميل النصوص:', error);
        
        // Create fallback objects even on failure
        window.scriptLoader.createFallbackObjects();
        
        return {
            verification: {},
            missing: [],
            allLoaded: false,
            error: error.message
        };
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScriptLoader };
}
