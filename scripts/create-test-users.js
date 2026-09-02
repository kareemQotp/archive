#!/usr/bin/env node

/**
 * إضافة مستخدمين تجريبيين لاختبار النظام
 * Add test users for system testing
 */

const admin = require('firebase-admin');
const path = require('path');

// تهيئة Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'archive-tech-firebase-adminsdk.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'archive-tech'
});

const db = admin.firestore();
const auth = admin.auth();

// مستخدمين تجريبيين
const testUsers = [
  {
    email: 'admin@archive-tech.com',
    password: 'AdminTest123!',
    displayName: 'مدير النظام',
    role: 'admin',
    departmentId: 'it',
    department: 'تقنية المعلومات',
    phone: '+966501234567'
  },
  {
    email: 'officer@archive-tech.com',
    password: 'OfficerTest123!',
    displayName: 'موظف الأرشيف',
    role: 'archive_officer',
    departmentId: 'archive',
    department: 'الأرشيف',
    phone: '+966501234568'
  },
  {
    email: 'user@archive-tech.com',
    password: 'UserTest123!',
    displayName: 'مستخدم عادي',
    role: 'viewer',
    departmentId: 'legal',
    department: 'الشؤون القانونية',
    phone: '+966501234569'
  }
];

async function createTestUsers() {
  console.log('🚀 بدء إنشاء المستخدمين التجريبيين...');

  for (const userData of testUsers) {
    try {
      console.log(`\n📝 إنشاء مستخدم: ${userData.email}`);

      // 1. التحقق من وجود المستخدم في Auth
      let authUser;
      try {
        authUser = await auth.getUserByEmail(userData.email);
        console.log(`✅ المستخدم موجود في Auth: ${authUser.uid}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // إنشاء المستخدم في Auth
          console.log(`🔧 إنشاء مستخدم جديد في Auth...`);
          authUser = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true
          });
          console.log(`✅ تم إنشاء المستخدم في Auth: ${authUser.uid}`);
        } else {
          throw error;
        }
      }

      // 2. إنشاء/تحديث المستخدم في Firestore
      const userDoc = db.collection('users').doc(authUser.uid);
      const userSnapshot = await userDoc.get();

      const firestoreData = {
        uid: authUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        departmentId: userData.departmentId,
        department: userData.department,
        phone: userData.phone,
        emailVerified: true,
        isActive: true,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (!userSnapshot.exists) {
        firestoreData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        firestoreData.createdBy = 'system';
        await userDoc.set(firestoreData);
        console.log(`✅ تم إنشاء وثيقة المستخدم في Firestore`);
      } else {
        await userDoc.update(firestoreData);
        console.log(`✅ تم تحديث وثيقة المستخدم في Firestore`);
      }

      // 3. تعيين Custom Claims للأدوار
      const customClaims = {
        role: userData.role,
        departmentId: userData.departmentId,
        department: userData.department
      };
      await auth.setCustomUserClaims(authUser.uid, customClaims);
      console.log(`✅ تم تعيين Custom Claims: ${JSON.stringify(customClaims)}`);

      console.log(`🎉 تم إنشاء/تحديث المستخدم بنجاح: ${userData.email}`);

    } catch (error) {
      console.error(`❌ خطأ في إنشاء المستخدم ${userData.email}:`, error.message);
    }
  }

  console.log('\n📊 التحقق من النتائج...');
  
  // عرض جميع المستخدمين
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`\n✅ إجمالي المستخدمين في Firestore: ${usersSnapshot.size}`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`👤 ${data.email} - ${data.role} - ${data.department}`);
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المستخدمين:', error);
  }
}

// تشغيل السكريبت
createTestUsers()
  .then(() => {
    console.log('\n🎉 تم الانتهاء من إنشاء المستخدمين التجريبيين');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ فشل في إنشاء المستخدمين:', error);
    process.exit(1);
  });
