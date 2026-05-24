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
            allowedRoles: ['archive-officer', 'archive-specialist', 'document-manager']
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
            allowedRoles: ['legal-officer', 'legal-specialist', 'contract-manager']
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
            allowedRoles: ['compliance-officer', 'governance-specialist', 'risk-manager']
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
            allowedRoles: ['collection-officer', 'collection-specialist', 'recovery-manager']
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
            allowedRoles: ['securitization-officer', 'asset-manager', 'financial-analyst']
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
            allowedRoles: ['hr-officer', 'hr-specialist', 'recruitment-manager']
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
            allowedRoles: ['it-officer', 'system-admin', 'developer']
        },
        stats: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0
        },
    createdAt: serverTS(firebase)
    }
];

// إعداد أدوار الإدارات
const departmentRoles = {
    // أدوار الأرشيف
    'archive-admin': {
        name: 'مدير إدارة الأرشيف',
        nameEn: 'Archive Department Manager',
        department: 'archive',
        level: 'admin',
        permissions: ['manage_department_users', 'approve_users', 'assign_roles', 'view_department_reports']
    },
    'archive-officer': {
        name: 'موظف أرشيف',
        nameEn: 'Archive Officer',
        department: 'archive',
        level: 'officer',
        permissions: ['upload_documents', 'edit_documents', 'view_documents', 'search_archive']
    },
    'archive-specialist': {
        name: 'أخصائي أرشيف',
        nameEn: 'Archive Specialist',
        department: 'archive',
        level: 'specialist',
        permissions: ['upload_documents', 'edit_documents', 'view_documents', 'search_archive', 'classify_documents']
    },
    'document-manager': {
        name: 'مدير الوثائق',
        nameEn: 'Document Manager',
        department: 'archive',
        level: 'manager',
        permissions: ['upload_documents', 'edit_documents', 'view_documents', 'search_archive', 'classify_documents', 'approve_documents']
    },

    // أدوار قانونية
    'legal-admin': {
        name: 'مدير الشؤون القانونية',
        nameEn: 'Legal Affairs Manager',
        department: 'legal',
        level: 'admin',
        permissions: ['manage_department_users', 'approve_users', 'assign_roles', 'view_department_reports']
    },
    'legal-officer': {
        name: 'موظف قانوني',
        nameEn: 'Legal Officer',
        department: 'legal',
        level: 'officer',
        permissions: ['view_legal_documents', 'create_contracts', 'review_cases']
    },
    'legal-specialist': {
        name: 'أخصائي قانوني',
        nameEn: 'Legal Specialist',
        department: 'legal',
        level: 'specialist',
        permissions: ['view_legal_documents', 'create_contracts', 'review_cases', 'legal_consultation']
    },
    'contract-manager': {
        name: 'مدير العقود',
        nameEn: 'Contract Manager',
        department: 'legal',
        level: 'manager',
        permissions: ['view_legal_documents', 'create_contracts', 'review_cases', 'legal_consultation', 'approve_contracts']
    },

    // أدوار الحوكمة
    'governance-admin': {
        name: 'مدير الحوكمة والامتثال',
        nameEn: 'Governance & Compliance Manager',
        department: 'governance',
        level: 'admin',
        permissions: ['manage_department_users', 'approve_users', 'assign_roles', 'view_department_reports']
    },
    'compliance-officer': {
        name: 'موظف امتثال',
        nameEn: 'Compliance Officer',
        department: 'governance',
        level: 'officer',
        permissions: ['monitor_compliance', 'create_reports', 'audit_processes']
    },
    'governance-specialist': {
        name: 'أخصائي حوكمة',
        nameEn: 'Governance Specialist',
        department: 'governance',
        level: 'specialist',
        permissions: ['monitor_compliance', 'create_reports', 'audit_processes', 'policy_review']
    },
    'risk-manager': {
        name: 'مدير المخاطر',
        nameEn: 'Risk Manager',
        department: 'governance',
        level: 'manager',
        permissions: ['monitor_compliance', 'create_reports', 'audit_processes', 'policy_review', 'risk_assessment']
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
