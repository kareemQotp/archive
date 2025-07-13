// Firebase Messaging Service Worker
// This file is required for Firebase Cloud Messaging to work

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1oPDm_TYJLnDUsqn32YJiDKHkfYG-bSw",
    authDomain: "archive-tech.firebaseapp.com",
    projectId: "archive-tech",
    storageBucket: "archive-tech.appspot.com",
    messagingSenderId: "1055418842313",
    appId: "1:1055418842313:web:d6a3c58e1c9b8c3a8d5e4f",
    measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification?.title || 'إشعار جديد';
    const notificationOptions = {
        body: payload.notification?.body || 'لديك إشعار جديد',
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/badge-72.png',
        data: payload.data || {},
        actions: [
            {
                action: 'open',
                title: 'فتح',
                icon: '/assets/images/action-open.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/assets/images/action-close.png'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked: ', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Close notification
        event.notification.close();
    } else {
        // Default action - open app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed: ', event);
});
