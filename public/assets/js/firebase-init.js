// Firebase Configuration and Initialization
console.log('🔄 بدء تهيئة Firebase...');

// 👇 تعطيل وضع الديمو عالمياً (منع القراءة/الكتابة لأي أعلام ديمو)
(function hardDisableDemoMode() {
    try {
        const DEMO_KEYS = ['archiveDemoMode', 'demo_mode'];
        // إزالة أي أعلام موجودة مسبقاً
        DEMO_KEYS.forEach(k => {
            try { localStorage.removeItem(k); } catch (_) {}
        });
        // منع ضبط هذه الأعلام لاحقاً
        const _setItem = localStorage.setItem.bind(localStorage);
        const _getItem = localStorage.getItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            if (DEMO_KEYS.includes(key)) {
                console.warn('🚫 Demo mode is globally disabled; ignoring setItem for', key);
                return; // تجاهل محاولات التفعيل
            }
            return _setItem(key, value);
        };
        localStorage.getItem = function(key) {
            if (DEMO_KEYS.includes(key)) {
                return null; // تصيير الديمو دائماً غير مفعل
            }
            return _getItem(key);
        };
        // علم عمومي لمنع أي صفحة من تفعيل الديمو
        try { window.__ALLOW_DEMO_MODE__ = false; } catch (_) {}
    } catch (e) {
        console.warn('⚠️ فشل تعطيل وضع الديمو عالمياً:', e);
    }
})();

// استخدام الإعدادات من firebase-config.js إذا كانت متوفرة
let config;
if (typeof firebaseConfig !== 'undefined') {
    config = firebaseConfig;
    console.log('✅ استخدام firebaseConfig من ملف منفصل');
} else {
    // إعدادات احتياطية
    config = {
        apiKey: "AIzaSyBn9zLcodNLKWlUPfqsnEGoA1z7QZw_Ezk",
        authDomain: "archive-tech.firebaseapp.com",
        projectId: "archive-tech",
        storageBucket: "archive-tech.firebasestorage.app",
        messagingSenderId: "911076711034",
        appId: "1:911076711034:web:7f190eed397becfe6779c3",
        measurementId: "G-1PQMDXZ714"
    };
    console.log('⚠️ استخدام الإعدادات الاحتياطية');
}

let auth, db, functions, storage, messaging, appCheck;

// دالة التهيئة الرئيسية
async function initializeFirebase() {
    console.log('📥 دخول دالة initializeFirebase...');
    
    try {
        // تحقق من وجود Firebase
        console.log('🔍 فحص Firebase SDK...');
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK غير محمل');
            throw new Error('Firebase SDK غير محمل');
        }
        console.log('✅ Firebase SDK موجود');

        // Initialize Firebase
        console.log('🔍 فحص Firebase Apps...');
        console.log(`عدد التطبيقات الحالية: ${firebase.apps.length}`);
        
        if (!firebase.apps.length) {
            console.log('🔧 بدء تهيئة Firebase App...');
            console.log('إعدادات Firebase:', config);
            
            firebase.initializeApp(config);
            console.log(`✅ تم تهيئة Firebase بنجاح - عدد التطبيقات الآن: ${firebase.apps.length}`);
        } else {
            console.log('ℹ️ Firebase App مهيئ مسبقاً');
        }

        // Initialize App Check (compat) if available
        try {
            if (false && firebase.appCheck) { // Temporarily disabled
                // Enable debug token for development/testing
                const debugSetting = localStorage.getItem('APP_CHECK_DEBUG') || 'true';
                if (debugSetting === 'true' || (typeof debugSetting === 'string' && debugSetting.length > 20)) {
                    // true => random, or provide fixed token string
                    window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugSetting === 'true' ? true : debugSetting;
                    console.warn('⚠️ App Check Debug Token enabled for development');
                }

                const siteKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.appCheckSiteKey) || 
                               (typeof window.APP_CHECK_SITE_KEY !== 'undefined' ? window.APP_CHECK_SITE_KEY : null);
                
                if (siteKey === 'debug') {
                    // Development mode with debug token
                    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
                    console.warn('🔧 App Check Debug Mode - للتطوير فقط');
                    
                    try {
                        // compat API follows firebase.appCheck().activate
                        appCheck = firebase.appCheck();
                        appCheck.activate(siteKey, true);
                        window.appCheck = appCheck;
                        console.log('✅ تم تفعيل App Check (وضع التطوير)');
                    } catch (e) {
                        console.warn('⚠️ فشل تفعيل App Check (compat):', e);
                    }
                } else if (siteKey) {
                    try {
                        // compat API follows firebase.appCheck().activate
                        appCheck = firebase.appCheck();
                        appCheck.activate(siteKey, true);
                        window.appCheck = appCheck;
                        console.log('✅ تم تفعيل App Check (reCAPTCHA v3)');
                    } catch (e) {
                        console.warn('⚠️ فشل تفعيل App Check (compat):', e);
                    }
                } else {
                    console.warn('⚠️ لم يتم تعيين مفتاح موقع reCAPTCHA v3 لـ App Check');
                }
            } else {
                console.warn('⚠️ Firebase App Check غير متاح في SDK المحمل');
            }
        } catch (e) {
            console.warn('⚠️ تخطي تهيئة App Check:', e);
        }

        // Initialize Auth
        console.log('🔧 بدء تهيئة Firebase Auth...');
        auth = firebase.auth();
        
        // Set auth immediately to window
        window.auth = auth;
        console.log('✅ تم تعيين window.auth فوراً');
        
        // إرسال حدث أولي للإشارة إلى تهيئة Auth
        window.dispatchEvent(new CustomEvent('firebaseAuthReady', {
            detail: { auth: window.auth }
        }));
        
        // Set auth persistence to LOCAL to maintain session across browser restarts
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('✅ تم تعيين استمرارية الجلسة');
        } catch (error) {
            console.warn('⚠️ فشل في تعيين استمرارية الجلسة:', error);
        }
        
        console.log('✅ تم تهيئة Firebase Auth بنجاح');

        // Initialize Firestore
        db = firebase.firestore();
        window.db = db;
        console.log('✅ تم تهيئة Firebase Firestore');

        // Initialize Firebase Storage only if available
        try {
            if (firebase.storage) {
                storage = firebase.storage();
                window.storage = storage;
                console.log('✅ تم تهيئة Firebase Storage');
            } else {
                console.warn('⚠️ Firebase Storage غير متوفر');
            }
        } catch (error) {
            console.warn('⚠️ فشل في تهيئة Firebase Storage:', error);
        }

        // Initialize Firebase Functions only if available
        try {
            if (firebase.functions) {
                // Use explicit region to match deployed Cloud Functions and prevent CORS/region mismatches
                const FUNCTIONS_REGION = 'us-central1';
                // compat API: pass region via app.functions('region')
                const app = firebase.app();
                functions = app.functions(FUNCTIONS_REGION);
                window.functions = functions;
                console.log('✅ تم تهيئة Firebase Functions');
            } else {
                console.warn('⚠️ Firebase Functions غير متوفر');
            }
        } catch (error) {
            console.warn('⚠️ فشل في تهيئة Firebase Functions:', error);
        }

        // Initialize Firebase Messaging only if available
        try {
            if (firebase.messaging && firebase.messaging.isSupported()) {
                messaging = firebase.messaging();
                window.messaging = messaging;
                console.log('✅ تم تهيئة Firebase Messaging');
            } else {
                console.warn('⚠️ Firebase Messaging غير مدعوم في هذا المتصفح');
            }
        } catch (error) {
            console.warn('⚠️ فشل في تهيئة Firebase Messaging:', error);
        }

        console.log('🎉 تم تهيئة Firebase بنجاح');
        
        // إرسال حدث firebaseReady بعد التهيئة
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('firebaseReady', {
                detail: { 
                    auth: window.auth, 
                    db: window.db, 
                    functions: window.functions, 
                    storage: window.storage, 
                    messaging: window.messaging,
                    appCheck: window.appCheck,
                    initialized: !!(firebase && firebase.apps && firebase.apps.length)
                }
            }));
            console.log('📡 تم إرسال حدث firebaseReady');
        }, 200); // زيادة وقت الانتظار قليلاً

    } catch (error) {
        console.error('❌ فشل في تهيئة Firebase:', error);
        window.auth = null;
        window.db = null;
        window.functions = null;
        window.storage = null;
        window.messaging = null;
    }
}

// بدء التهيئة فوراً
console.log('🚀 تشغيل التهيئة فوراً...');
initializeFirebase();

// أيضاً عند DOM ready كاحتياط
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM ready - فحص إذا كانت التهيئة مطلوبة...');
        if (!firebase.apps.length || !window.auth) {
            console.log('🔄 إعادة محاولة التهيئة...');
            initializeFirebase();
        }
    });
} else {
    // إذا كان DOM جاهز والصفحة محملة
    setTimeout(() => {
        if (!firebase.apps.length || !window.auth) {
            console.log('🔄 إعادة محاولة التهيئة بعد تأخير...');
            initializeFirebase();
        }
    }, 100);
}

// دوال مساعدة للـ Cloud Functions
const cloudFunctions = {
    // يمكن إضافة دوال هنا
};

async function callCloudFunction(functionName, data = {}) {
    try {
        if (!cloudFunctions[functionName]) {
            throw new Error(`Function ${functionName} not found`);
        }
        const result = await cloudFunctions[functionName](data);
        return result.data;
    } catch (error) {
        console.error(`Error calling ${functionName}:`, error);
        throw error;
    }
}

// Make cloud functions available globally
window.cloudFunctions = cloudFunctions;
window.callCloudFunction = callCloudFunction;

console.log('📄 Firebase initialization script loaded');
