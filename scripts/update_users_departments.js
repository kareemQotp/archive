/**
 * تحديث بيانات المستخدمين لإضافة معلومات الإدارات
 * Update Users with Department Information
 */

// هذا الملف يتم تشغيله مرة واحدة لتحديث بيانات المستخدمين الموجودين

const firebase = require('firebase-admin');
const serviceAccount = require('../archive-tech-firebase-adminsdk.json');
const { serverTS } = require('./utils/serverTimestamp');
const AuthConstants = require('../public/assets/js/auth-constants');

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
            let assignedDepartment = AuthConstants.normalizeDepartment(userData.departmentId || userData.department || 'admin');
            let assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');

            const email = userData.email || '';
            
            // تحديد الإدارة بناءً على البريد الإلكتروني
            if (email.includes('archive.') || email.includes('أرشيف')) {
                assignedDepartment = 'archive';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'archive_officer');
            } else if (email.includes('legal.') || email.includes('قانونية')) {
                assignedDepartment = 'legal';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');
            } else if (email.includes('collection.') || email.includes('تحصيل')) {
                assignedDepartment = 'collection';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');
            } else if (email.includes('governance.') || email.includes('حوكمة')) {
                assignedDepartment = 'governance';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');
            } else if (email.includes('hr.') || email.includes('موارد')) {
                assignedDepartment = 'hr';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');
            } else if (email.includes('it.') || email.includes('تقنية')) {
                assignedDepartment = 'it';
                assignedRole = AuthConstants.normalizeRole(userData.role || 'employee');
            } else if (['admin', 'super_admin'].includes(AuthConstants.normalizeRole(userData.role))) {
                // مديري النظام يمكنهم الوصول لجميع الإدارات
                assignedDepartment = 'admin';
                assignedRole = 'admin';
            }

            // تحديث بيانات المستخدم
            const updateData = {
                department: assignedDepartment,
                departmentId: assignedDepartment,
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
                departmentId: 'archive',
                role: 'department_admin',
                displayName: 'مدير الأرشيف',
                firstName: 'مدير',
                lastName: 'الأرشيف'
            },
            {
                email: 'legal.admin@aman.eg',
                department: 'legal',
                departmentId: 'legal',
                role: 'department_admin',
                displayName: 'مدير الشؤون القانونية',
                firstName: 'مدير',
                lastName: 'القانونية'
            },
            {
                email: 'collection.admin@aman.eg',
                department: 'collection',
                departmentId: 'collection',
                role: 'department_admin',
                displayName: 'مدير التحصيل',
                firstName: 'مدير',
                lastName: 'التحصيل'
            },
            {
                email: 'archive.officer@aman.eg',
                department: 'archive',
                departmentId: 'archive',
                role: 'archive_officer',
                displayName: 'موظف أرشيف',
                firstName: 'موظف',
                lastName: 'أرشيف'
            },
            {
                email: 'legal.officer@aman.eg',
                department: 'legal',
                departmentId: 'legal',
                role: 'employee',
                displayName: 'موظف قانوني',
                firstName: 'موظف',
                lastName: 'قانوني'
            },
            {
                email: 'collection.officer@aman.eg',
                department: 'collection',
                departmentId: 'collection',
                role: 'employee',
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
        'department_admin': [
            'manage_department_users', 'approve_users', 'assign_roles', 
            'view_department_reports', 'upload_documents', 'edit_documents', 
            'view_documents', 'search_archive', 'classify_documents', 'approve_documents'
        ],
        'archive_officer': [
            'upload_documents', 'edit_documents', 'view_documents', 'search_archive'
        ],
        'employee': [
            'view_department_documents', 'upload_department_documents'
        ],
        'viewer': [
            'view_department_documents'
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
