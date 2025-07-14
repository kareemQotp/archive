/**
 * إصلاح نظام الإشعارات وإنشاء بيانات تجريبية
 * Fix Notification System and Create Sample Data
 */

const firebase = require('firebase-admin');
const serviceAccount = require('../archive-tech-firebase-adminsdk.json');

// تهيئة Firebase Admin إذا لم يكن مُهيأً
if (!firebase.apps.length) {
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
        projectId: 'archive-tech'
    });
}

const db = firebase.firestore();

async function fixNotificationSystem() {
    try {
        console.log('🔧 إصلاح نظام الإشعارات...');

        // 1. إنشاء مجموعة الإشعارات إذا لم تكن موجودة
        await createNotificationsCollection();

        // 2. إنشاء فهارس قاعدة البيانات المطلوبة
        await createNotificationIndexes();

        // 3. إنشاء إشعارات تجريبية
        await createSampleNotifications();

        // 4. إنشاء إعدادات الإشعارات للمستخدمين
        await createNotificationSettings();

        console.log('✅ تم إصلاح نظام الإشعارات بنجاح!');

    } catch (error) {
        console.error('❌ خطأ في إصلاح نظام الإشعارات:', error);
    }
}

async function createNotificationsCollection() {
    try {
        // التحقق من وجود المجموعة
        const notificationsRef = db.collection('notifications');
        const snapshot = await notificationsRef.limit(1).get();
        
        if (snapshot.empty) {
            console.log('📁 إنشاء مجموعة الإشعارات...');
            
            // إنشاء إشعار تجريبي لإنشاء المجموعة
            await notificationsRef.add({
                title: 'مرحباً بالنظام',
                message: 'تم إنشاء نظام الإشعارات بنجاح',
                type: 'system',
                userId: 'system',
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                priority: 'normal'
            });
            
            console.log('✅ تم إنشاء مجموعة الإشعارات');
        } else {
            console.log('ℹ️ مجموعة الإشعارات موجودة بالفعل');
        }
    } catch (error) {
        console.error('خطأ في إنشاء مجموعة الإشعارات:', error);
    }
}

async function createNotificationIndexes() {
    console.log('📊 إنشاء فهارس قاعدة البيانات...');
    
    // ملاحظة: الفهارس يجب إنشاؤها يدوياً في Firebase Console
    // أو باستخدام Firebase CLI
    console.log('ℹ️ الفهارس المطلوبة:');
    console.log('   - userId, isRead, createdAt (desc)');
    console.log('   - userId, type, createdAt (desc)');
    console.log('   - userId, priority, createdAt (desc)');
    console.log('📝 يرجى إنشاء هذه الفهارس في Firebase Console إذا لزم الأمر');
}

async function createSampleNotifications() {
    try {
        console.log('🧪 إنشاء إشعارات تجريبية...');

        // البحث عن المستخدمين الموجودين
        const usersSnapshot = await db.collection('users').limit(5).get();
        
        if (usersSnapshot.empty) {
            console.log('⚠️ لا توجد مستخدمين لإنشاء إشعارات تجريبية');
            return;
        }

        const sampleNotifications = [
            {
                title: 'مرحباً بك في النظام',
                message: 'تم تفعيل حسابك بنجاح. يمكنك الآن استخدام جميع الميزات المتاحة.',
                type: 'welcome',
                icon: 'fas fa-hand-wave',
                priority: 'normal',
                category: 'system'
            },
            {
                title: 'تحديث مهم للنظام',
                message: 'تم إضافة ميزات جديدة لتحسين تجربة المستخدم.',
                type: 'system_update',
                icon: 'fas fa-arrow-up',
                priority: 'high',
                category: 'system'
            },
            {
                title: 'رفع ملف جديد',
                message: 'تم رفع ملف جديد بنجاح في النظام.',
                type: 'file_upload',
                icon: 'fas fa-file-upload',
                priority: 'normal',
                category: 'files'
            },
            {
                title: 'طلب مراجعة',
                message: 'يوجد ملف جديد يتطلب مراجعتك.',
                type: 'review_request',
                icon: 'fas fa-eye',
                priority: 'high',
                category: 'workflow'
            },
            {
                title: 'تذكير',
                message: 'لديك مهام معلقة تتطلب إنجازها.',
                type: 'reminder',
                icon: 'fas fa-bell',
                priority: 'medium',
                category: 'tasks'
            }
        ];

        const batch = db.batch();
        let createdCount = 0;

        // إنشاء إشعارات لكل مستخدم
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            // إنشاء 2-3 إشعارات لكل مستخدم
            const notificationsToCreate = sampleNotifications.slice(0, 3);
            
            for (let i = 0; i < notificationsToCreate.length; i++) {
                const notification = notificationsToCreate[i];
                const notificationRef = db.collection('notifications').doc();
                
                batch.set(notificationRef, {
                    ...notification,
                    userId: userId,
                    userEmail: userData.email,
                    isRead: i === 0 ? true : false, // أول إشعار مقروء
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readAt: i === 0 ? firebase.firestore.FieldValue.serverTimestamp() : null,
                    id: notificationRef.id
                });
                
                createdCount++;
            }
        }

        await batch.commit();
        console.log(`✅ تم إنشاء ${createdCount} إشعار تجريبي`);

    } catch (error) {
        console.error('خطأ في إنشاء الإشعارات التجريبية:', error);
    }
}

async function createNotificationSettings() {
    try {
        console.log('⚙️ إنشاء إعدادات الإشعارات...');

        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            console.log('⚠️ لا توجد مستخدمين لإنشاء إعدادات');
            return;
        }

        const defaultSettings = {
            emailNotifications: true,
            pushNotifications: true,
            desktopNotifications: true,
            soundEnabled: true,
            categories: {
                system: true,
                files: true,
                workflow: true,
                tasks: true,
                social: false
            },
            frequency: {
                immediate: ['system_update', 'review_request'],
                daily: ['file_upload', 'reminder'],
                weekly: ['welcome']
            },
            quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
            }
        };

        const batch = db.batch();
        let settingsCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const settingsRef = db.collection('notification_settings').doc(userId);
            
            // التحقق من وجود الإعدادات
            const existingSettings = await settingsRef.get();
            
            if (!existingSettings.exists) {
                batch.set(settingsRef, {
                    ...defaultSettings,
                    userId: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                settingsCount++;
            }
        }

        if (settingsCount > 0) {
            await batch.commit();
            console.log(`✅ تم إنشاء إعدادات الإشعارات لـ ${settingsCount} مستخدم`);
        } else {
            console.log('ℹ️ إعدادات الإشعارات موجودة بالفعل لجميع المستخدمين');
        }

    } catch (error) {
        console.error('خطأ في إنشاء إعدادات الإشعارات:', error);
    }
}

// تشغيل الإصلاح
fixNotificationSystem().then(() => {
    console.log('🎉 انتهى إصلاح نظام الإشعارات!');
    console.log('\n📋 الخطوات التالية:');
    console.log('1. إنشاء الفهارس المطلوبة في Firebase Console');
    console.log('2. اختبار النظام مع المستخدمين');
    console.log('3. مراجعة الإشعارات التجريبية');
    process.exit(0);
}).catch((error) => {
    console.error('❌ فشل في إصلاح النظام:', error);
    process.exit(1);
});

module.exports = { fixNotificationSystem };
