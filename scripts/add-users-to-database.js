/**
 * إضافة المستخدمين الموجودين إلى قاعدة البيانات مع أدوارهم الصحيحة
 * Add existing users to database with their correct roles and departments
 */

const admin = require('firebase-admin');
const path = require('path');

// تهيئة Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'archive-tech-firebase-adminsdk.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'archive-tech'
    });
}

const db = admin.firestore();

// قائمة المستخدمين الموجودين مع أدوارهم وأقسامهم الصحيحة
const existingUsers = [
    {
        email: 'admin123@aman.eg',
        displayName: 'Admin',
        role: 'admin',
        department: 'admin',
        arabicName: 'مدير النظام',
        phone: '+966500000000',
        isActive: true
    },
    {
        email: 'khaled.mokhtar@aman.eg',
        displayName: 'Khaled Mokhtar',
        role: 'archive_officer',
        department: 'archive',
        arabicName: 'خالد مختار',
        phone: '+966500000001',
        isActive: true
    },
    {
        email: 'kareem.kotb@aman.eg',
        displayName: 'kareem kotb',
        role: 'employee',
        department: 'legal',
        arabicName: 'كريم قطب',
        phone: '+966500000002',
        isActive: true
    },
    {
        email: 'mahmoud.eltawil@aman.eg',
        displayName: 'Mahmoud Ashour',
        role: 'employee',
        department: 'collection',
        arabicName: 'محمود عاشور',
        phone: '+966500000003',
        isActive: true
    },
    {
        email: 'user@archive-tech.com',
        displayName: 'مستخدم عادي',
        role: 'viewer',
        department: 'admin',
        arabicName: 'مستخدم عادي',
        phone: '+966500000004',
        isActive: true
    },
    {
        email: 'officer@archive-tech.com',
        displayName: 'موظف أرشيف',
        role: 'archive_officer',
        department: 'archive',
        arabicName: 'موظف أرشيف',
        phone: '+966500000005',
        isActive: true
    }
];

async function addUsersToDatabase() {
    console.log('🚀 بدء إضافة المستخدمين إلى قاعدة البيانات...');
    console.log(`📊 سيتم معالجة ${existingUsers.length} مستخدم\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const userData of existingUsers) {
        try {
            console.log(`📝 معالجة المستخدم: ${userData.email}`);

            // البحث عن المستخدم في Firebase Auth بالبريد الإلكتروني
            let authUser;
            try {
                authUser = await admin.auth().getUserByEmail(userData.email);
                console.log(`✅ المستخدم موجود في Auth: ${authUser.uid}`);
            } catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`⚠️ المستخدم غير موجود في Auth، سيتم تخطيه: ${userData.email}`);
                    continue;
                } else {
                    throw authError;
                }
            }

            // التحقق من وجود المستخدم في Firestore
            const userDocRef = db.collection('users').doc(authUser.uid);
            const existingDoc = await userDocRef.get();

            const firestoreData = {
                uid: authUser.uid,
                email: userData.email,
                displayName: userData.displayName,
                arabicName: userData.arabicName,
                role: userData.role,
                department: userData.department,
                departmentId: userData.department,
                phone: userData.phone,
                isActive: userData.isActive,
                emailVerified: authUser.emailVerified || false,
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                profileComplete: true
            };

            if (existingDoc.exists) {
                // تحديث البيانات الموجودة
                await userDocRef.update({
                    ...firestoreData,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ تم تحديث بيانات المستخدم: ${userData.email}`);
                console.log(`   الدور: ${userData.role} | الإدارة: ${userData.department}`);
            } else {
                // إنشاء وثيقة جديدة
                await userDocRef.set({
                    ...firestoreData,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: 'system'
                });
                console.log(`✅ تم إنشاء وثيقة جديدة للمستخدم: ${userData.email}`);
                console.log(`   الدور: ${userData.role} | الإدارة: ${userData.department}`);
            }

            // تعيين Custom Claims
            const customClaims = {
                role: userData.role,
                departmentId: userData.department,
                department: userData.department
            };
            await admin.auth().setCustomUserClaims(authUser.uid, customClaims);
            console.log(`✅ تم تعيين Custom Claims للمستخدم: ${userData.email}`);

            successCount++;
            console.log(`✅ تمت معالجة المستخدم بنجاح: ${userData.email}\n`);

        } catch (error) {
            console.error(`❌ خطأ في معالجة المستخدم ${userData.email}:`, error.message);
            errorCount++;
            console.log('---');
        }
    }

    console.log('\n📊 تقرير النتائج:');
    console.log(`✅ نجح: ${successCount} مستخدم`);
    console.log(`❌ فشل: ${errorCount} مستخدم`);
    console.log(`📋 إجمالي: ${existingUsers.length} مستخدم`);

    // عرض قائمة المستخدمين النهائية
    console.log('\n📋 قائمة المستخدمين في قاعدة البيانات:');
    try {
        const usersSnapshot = await db.collection('users').get();
        console.log(`\n📊 إجمالي المستخدمين: ${usersSnapshot.size}`);
        
        usersSnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ${data.email || 'بدون بريد'} - ${data.role || 'بدون دور'} - ${data.department || 'بدون إدارة'}`);
        });
    } catch (error) {
        console.error('❌ خطأ في جلب قائمة المستخدمين:', error);
    }
}

// تشغيل السكريبت
if (require.main === module) {
    addUsersToDatabase()
        .then(() => {
            console.log('\n🎉 تم الانتهاء من إضافة المستخدمين إلى قاعدة البيانات');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ فشل في إضافة المستخدمين:', error);
            process.exit(1);
        });
}

module.exports = { addUsersToDatabase, existingUsers };
