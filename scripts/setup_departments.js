// إعداد الإدارات في Firestore
// تشغيل هذا الملف مرة واحدة لإنشاء بيانات الإدارات

const firebase = require('firebase-admin');
const serviceAccount = require('../archive-tech-firebase-adminsdk.json');
const { serverTS } = require('./utils/serverTimestamp');

// تهيئة Firebase Admin
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    projectId: 'archive-tech'
});

const db = firebase.firestore();

// بيانات الإدارات
const departments = [
    {
        id: 'archive',
        name: 'إدارة الأرشيف العام',
        nameEn: 'General Archive Department',
        description: 'إدارة وحفظ الوثائق والملفات الرسمية',
        adminEmail: 'archive.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 50,
            allowedRoles: ['department_admin', 'supervisor', 'archive_officer', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'legal',
        name: 'إدارة الشؤون القانونية',
        nameEn: 'Legal Affairs Department',
        description: 'الاستشارات القانونية والعقود والمنازعات',
        adminEmail: 'legal.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 30,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'governance',
        name: 'إدارة الحوكمة والامتثال',
        nameEn: 'Governance & Compliance Department',
        description: 'ضمان الامتثال للقوانين واللوائح',
        adminEmail: 'governance.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 25,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'collection',
        name: 'إدارة التحصيل',
        nameEn: 'Collection Department',
        description: 'متابعة وتحصيل المستحقات والديون',
        adminEmail: 'collection.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 40,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'securitization',
        name: 'التوريق',
        nameEn: 'Securitization',
        description: 'إدارة عمليات التوريق والأصول المالية',
        adminEmail: 'securitization.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 20,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'hr',
        name: 'إدارة الموارد البشرية',
        nameEn: 'Human Resources Department',
        description: 'إدارة شؤون الموظفين والتوظيف',
        adminEmail: 'hr.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 15,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    },
    {
        id: 'it',
        name: 'إدارة تقنية المعلومات',
        nameEn: 'Information Technology Department',
        description: 'تطوير وصيانة الأنظمة التقنية',
        adminEmail: 'it.admin@aman.eg',
        settings: {
            requireInvite: false,
            autoApprove: false,
            maxUsers: 25,
            allowedRoles: ['department_admin', 'supervisor', 'employee', 'viewer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    }
];

// قوالب الأدوار العامة. role يحدد مستوى الصلاحية فقط، و departmentId يحدد النطاق.
const departmentRoles = {
    department_admin: {
        name: 'مدير إدارة',
        nameEn: 'Department Admin',
        level: 'department_admin',
        permissions: ['manage_department_users', 'approve_users', 'view_department_reports']
    },
    supervisor: {
        name: 'مشرف',
        nameEn: 'Supervisor',
        level: 'supervisor',
        permissions: ['view_department_documents', 'review_department_activity']
    },
    archive_officer: {
        name: 'موظف أرشيف',
        nameEn: 'Archive Officer',
        level: 'archive_officer',
        permissions: ['upload_documents', 'edit_documents', 'view_documents', 'search_archive', 'transfer_files']
    },
    employee: {
        name: 'موظف',
        nameEn: 'Employee',
        level: 'employee',
        permissions: ['view_department_documents', 'upload_department_documents']
    },
    viewer: {
        name: 'مستعرض',
        nameEn: 'Viewer',
        level: 'viewer',
        permissions: ['view_department_documents']
    }
};

// دالة لإعداد الإدارات
async function setupDepartments() {
    try {
        console.log('🚀 بدء إعداد الإدارات...');

        // إضافة الإدارات
        for (const dept of departments) {
            await db.collection('departments').doc(dept.id).set(dept);
            console.log(`✅ تم إنشاء إدارة: ${dept.name}`);
        }

        // إضافة الأدوار
        await db.collection('system').doc('roles').set({
            departmentRoles: departmentRoles,
            lastUpdated: serverTS(firebase)
        });

        console.log('✅ تم إعداد جميع الإدارات والأدوار بنجاح!');
        console.log('📊 الإدارات المُنشأة:');
        departments.forEach(dept => {
            console.log(`   - ${dept.name} (${dept.id})`);
        });

    } catch (error) {
        console.error('❌ خطأ في إعداد الإدارات:', error);
    }
}

// تشغيل الإعداد
setupDepartments().then(() => {
    console.log('🎉 انتهى إعداد النظام!');
    process.exit(0);
});

module.exports = { departments, departmentRoles };
