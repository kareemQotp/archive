/**
 * تحديث بيانات المستخدمين لإضافة معلومات الإدارات
 * Update Users with Department Information
 */

// هذا الملف يتم تشغيله مرة واحدة لتحديث بيانات المستخدمين الموجودين

const firebase = require('firebase-admin');
const serviceAccount = require('../archive-tech-firebase-adminsdk.json');
const { serverTS } = require('./utils/serverTimestamp');

// تهيئة Firebase Admin
if (!firebase.apps.length) {
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
        projectId: 'archive-tech'
    });
}

const db = firebase.firestore();

async function updateUsersWithDepartments() {
    try {
        console.log('🚀 بدء تحديث بيانات المستخدمين...');

        // الحصول على جميع المستخدمين
        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            console.log('❌ لا توجد مستخدمين في قاعدة البيانات');
            return;
        }

        const batch = db.batch();
        let updateCount = 0;

        // تحديث كل مستخدم
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // تخطي إذا كان لديه إدارة بالفعل
            if (userData.department && userData.department !== 'عام') {
                console.log(`✅ المستخدم ${userData.email || userId} لديه إدارة بالفعل: ${userData.department}`);
                continue;
            }

            // تحديد الإدارة بناءً على البريد الإلكتروني أو الدور
            let assignedDepartment = 'عام';
            let assignedRole = userData.role || 'employee';

            const email = userData.email || '';
            
            // تحديد الإدارة بناءً على البريد الإلكتروني
            if (email.includes('archive.') || email.includes('أرشيف')) {
                assignedDepartment = 'archive';
                assignedRole = userData.role || 'archive-officer';
            } else if (email.includes('legal.') || email.includes('قانونية')) {
                assignedDepartment = 'legal';
                assignedRole = userData.role || 'legal-officer';
            } else if (email.includes('collection.') || email.includes('تحصيل')) {
                assignedDepartment = 'collection';
                assignedRole = userData.role || 'collection-officer';
            } else if (email.includes('governance.') || email.includes('حوكمة')) {
                assignedDepartment = 'governance';
                assignedRole = userData.role || 'compliance-officer';
            } else if (email.includes('hr.') || email.includes('موارد')) {
                assignedDepartment = 'hr';
                assignedRole = userData.role || 'hr-officer';
            } else if (email.includes('it.') || email.includes('تقنية')) {
                assignedDepartment = 'it';
                assignedRole = userData.role || 'it-officer';
            } else if (userData.role === 'admin' || userData.role === 'system-admin') {
                // مديري النظام يمكنهم الوصول لجميع الإدارات
                assignedDepartment = 'archive'; // إدارة افتراضية
                assignedRole = 'admin';
            }

            // تحديث بيانات المستخدم
            const updateData = {
                department: assignedDepartment,
                role: assignedRole,
                updatedAt: serverTS(firebase),
                departmentAssignedAt: serverTS(firebase)
            };

            // إضافة التحديث للدفعة
            batch.update(userDoc.ref, updateData);
            updateCount++;

            console.log(`📝 تحديث المستخدم: ${email} - إدارة: ${assignedDepartment} - دور: ${assignedRole}`);
        }

        // تطبيق التحديثات
        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ تم تحديث ${updateCount} مستخدم بنجاح!`);
        } else {
            console.log('ℹ️ لا توجد مستخدمين بحاجة للتحديث');
        }

        // إنشاء مستخدمين تجريبيين للإدارات
        await createTestUsers();

    } catch (error) {
        console.error('❌ خطأ في تحديث بيانات المستخدمين:', error);
    }
}

async function createTestUsers() {
    try {
        console.log('🧪 إنشاء مستخدمين تجريبيين...');

        const testUsers = [
            {
                email: 'archive.admin@aman.eg',
                department: 'archive',
                role: 'archive-admin',
                displayName: 'مدير الأرشيف',
                firstName: 'مدير',
                lastName: 'الأرشيف'
            },
            {
                email: 'legal.admin@aman.eg',
                department: 'legal',
                role: 'legal-admin',
                displayName: 'مدير الشؤون القانونية',
                firstName: 'مدير',
                lastName: 'القانونية'
            },
            {
                email: 'collection.admin@aman.eg',
                department: 'collection',
                role: 'collection-admin',
                displayName: 'مدير التحصيل',
                firstName: 'مدير',
                lastName: 'التحصيل'
            },
            {
                email: 'archive.officer@aman.eg',
                department: 'archive',
                role: 'archive-officer',
                displayName: 'موظف أرشيف',
                firstName: 'موظف',
                lastName: 'أرشيف'
            },
            {
                email: 'legal.officer@aman.eg',
                department: 'legal',
                role: 'legal-officer',
                displayName: 'موظف قانوني',
                firstName: 'موظف',
                lastName: 'قانوني'
            },
            {
                email: 'collection.officer@aman.eg',
                department: 'collection',
                role: 'collection-officer',
                displayName: 'موظف تحصيل',
                firstName: 'موظف',
                lastName: 'تحصيل'
            }
        ];

        for (const testUser of testUsers) {
            // التحقق من وجود المستخدم
            const existingUser = await db.collection('users').where('email', '==', testUser.email).get();
            
            if (!existingUser.empty) {
                console.log(`ℹ️ المستخدم ${testUser.email} موجود بالفعل`);
                continue;
            }

            // إنشاء بيانات المستخدم
            const userData = {
                ...testUser,
                createdAt: serverTS(firebase),
                isActive: true,
                permissions: getDefaultPermissions(testUser.role),
                profileComplete: false,
                loginCount: 0
            };

            // إضافة المستخدم
            await db.collection('users').add(userData);
            console.log(`✅ تم إنشاء المستخدم التجريبي: ${testUser.email}`);
        }

    } catch (error) {
        console.error('❌ خطأ في إنشاء المستخدمين التجريبيين:', error);
    }
}

function getDefaultPermissions(role) {
    const permissions = {
        'archive-admin': [
            'manage_department_users', 'approve_users', 'assign_roles', 
            'view_department_reports', 'upload_documents', 'edit_documents', 
            'view_documents', 'search_archive', 'classify_documents', 'approve_documents'
        ],
        'archive-officer': [
            'upload_documents', 'edit_documents', 'view_documents', 'search_archive'
        ],
        'legal-admin': [
            'manage_department_users', 'approve_users', 'assign_roles',
            'view_department_reports', 'view_legal_documents', 'create_contracts',
            'review_cases', 'legal_consultation', 'approve_contracts'
        ],
        'legal-officer': [
            'view_legal_documents', 'create_contracts', 'review_cases'
        ],
        'collection-admin': [
            'manage_department_users', 'approve_users', 'assign_roles',
            'view_department_reports', 'manage_debts', 'collection_reports',
            'payment_tracking', 'contact_debtors'
        ],
        'collection-officer': [
            'manage_debts', 'payment_tracking', 'contact_debtors'
        ]
    };

    return permissions[role] || ['view_documents'];
}

// تشغيل التحديث
updateUsersWithDepartments().then(() => {
    console.log('🎉 انتهى تحديث بيانات المستخدمين!');
    process.exit(0);
}).catch((error) => {
    console.error('❌ فشل في التحديث:', error);
    process.exit(1);
});

module.exports = { updateUsersWithDepartments };
