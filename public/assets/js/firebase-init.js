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
        }
    } catch (error) {
        console.warn('⚠️ Firebase Storage غير متاح:', error);
        storage = null;
        window.storage = null;
    }

    // Initialize Firebase Functions only if available
    try {
        if (firebase.functions) {
            functions = firebase.functions();
            window.functions = functions;
            console.log('✅ تم تهيئة Firebase Functions');
        }
    } catch (error) {
        console.warn('⚠️ Firebase Functions غير متاح:', error);
        functions = null;
        window.functions = null;
    }

    // Initialize Firebase Messaging only if available
    try {
        if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) {
            messaging = firebase.messaging();
            window.messaging = messaging;
            console.log('✅ تم تهيئة Firebase Messaging');
        }
    } catch (error) {
        console.warn('⚠️ Firebase Messaging غير متاح:', error);
        messaging = null;
        window.messaging = null;
    }

} catch (error) {
    console.error('❌ فشل في تهيئة Firebase:', error);
    
    // Create fallback objects to prevent undefined errors
    auth = {
        currentUser: null,
        onAuthStateChanged: (callback) => {
            console.log('🔧 استخدام Auth بديل');
            setTimeout(() => callback(null), 100);
            return () => {};
        },
        signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase غير متاح')),
        signOut: () => Promise.resolve()
    };
    
    db = {
        collection: (path) => ({
            doc: (id) => ({
                get: () => Promise.resolve({ exists: false, data: () => null }),
                set: () => Promise.resolve()
            })
        })
    };
    
    // Make fallback services available globally
    window.auth = auth;
    window.db = db;
    window.functions = null;
    window.storage = null;
    window.messaging = null;
}

// Cloud Functions references - only if functions is available
const cloudFunctions = functions ? {
    // Authentication functions
    createUserWithRole: functions.httpsCallable('createUserWithRole'),
    updateUserRole: functions.httpsCallable('updateUserRole'),
    deleteUserAccount: functions.httpsCallable('deleteUserAccount'),
    validateInvitation: functions.httpsCallable('validateInvitation'),
    
    // Document management functions
    processDocumentUpload: functions.httpsCallable('processDocumentUpload'),
    generateFileNumber: functions.httpsCallable('generateFileNumber'),
    createFileMovement: functions.httpsCallable('createFileMovement'),
    
    // Storage functions
    processFileUpload: functions.httpsCallable('processFileUpload'),
    scanDocument: functions.httpsCallable('scanDocument'),
    deleteFile: functions.httpsCallable('deleteFile'),
    getDownloadUrl: functions.httpsCallable('getDownloadUrl'),
    getFileInfo: functions.httpsCallable('getFileInfo'),
    
    // Utility functions
    sendNotification: functions.httpsCallable('sendNotification'),
    markNotificationRead: functions.httpsCallable('markNotificationRead'),
    generateSystemReport: functions.httpsCallable('generateSystemReport'),
    backupDatabase: functions.httpsCallable('backupDatabase'),
    updateFcmToken: functions.httpsCallable('updateFcmToken'),
    healthCheck: functions.httpsCallable('healthCheck')
} : {};

// Helper function to call cloud functions with error handling
async function callCloudFunction(functionName, data = {}) {
    try {
        if (!functions) {
            throw new Error('Firebase Functions not available');
        }
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

// Event to notify when Firebase is ready
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
}, 100);

// Make cloud functions available globally
window.cloudFunctions = cloudFunctions;
window.callCloudFunction = callCloudFunction;

console.log('🎉 اكتملت عملية تهيئة Firebase');
