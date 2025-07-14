// Firebase Configuration and Initialization
console.log('🔄 بدء تهيئة Firebase...');

const firebaseConfig = {
    apiKey: "AIzaSyBn9zLcodNLKWlUPfqsnEGoA1z7QZw_Ezk",
    authDomain: "archive-tech.firebaseapp.com",
    projectId: "archive-tech",
    storageBucket: "archive-tech.firebasestorage.app",
    messagingSenderId: "911076711034",
    appId: "1:911076711034:web:7f190eed397becfe6779c3",
    measurementId: "G-1PQMDXZ714"
};

let auth, db, functions, storage, messaging;

// دالة التهيئة الرئيسية
async function initializeFirebase() {
    try {
        // تحقق من وجود Firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK غير محمل');
        }

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة Firebase بنجاح');
        }

        // Initialize Auth
        auth = firebase.auth();
        
        // Set auth persistence to LOCAL to maintain session across browser restarts
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('✅ تم تعيين استمرارية الجلسة');
        } catch (error) {
            console.warn('⚠️ فشل في تعيين استمرارية الجلسة:', error);
        }
        
        window.auth = auth;
        console.log('✅ تم تهيئة Firebase Auth');

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
                functions = firebase.functions();
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

// بدء التهيئة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    // بدء فوري مع تأخير صغير للتأكد من تحميل Firebase SDK
    setTimeout(initializeFirebase, 100);
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
