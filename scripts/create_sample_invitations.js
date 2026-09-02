// إنشاء دعوات تجريبية في Firestore
const admin = require('firebase-admin');
const { serverTS } = require('./utils/serverTimestamp');

// Initialize Firebase Admin SDK (reuse existing initialization)
if (!admin.apps.length) {
    const serviceAccount = require('../archive-tech-firebase-adminsdk.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "archive-tech"
    });
}

const db = admin.firestore();

// Sample invitations
const sampleInvitations = [
    {
        code: 'ARCHIVE2024001',
        department: 'archive',
        departmentId: 'archive',
        departmentName: 'إدارة الأرشيف العام',
        invitedBy: 'مدير الأرشيف العام',
        invitedByEmail: 'archive.manager@aman.eg',
        suggestedRole: 'archive_officer',
        message: 'دعوة للانضمام لفريق إدارة الأرشيف العام',
        status: 'active',
        autoApprove: false,
        maxUses: 5,
        currentUses: 0,
    createdAt: serverTS(admin),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days
    },
    {
        code: 'LEGAL2024001',
        department: 'legal',
        departmentId: 'legal',
        departmentName: 'إدارة الشؤون القانونية',
        invitedBy: 'مدير الشؤون القانونية',
        invitedByEmail: 'legal.manager@aman.eg',
        suggestedRole: 'employee',
        message: 'دعوة للانضمام لفريق الاستشارات القانونية',
        status: 'active',
        autoApprove: false,
        maxUses: 3,
        currentUses: 0,
    createdAt: serverTS(admin),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    },
    {
        code: 'IT2024001',
        department: 'it',
        departmentId: 'it',
        departmentName: 'إدارة تقنية المعلومات',
        invitedBy: 'مدير تقنية المعلومات',
        invitedByEmail: 'it.manager@aman.eg',
        suggestedRole: 'employee',
        message: 'دعوة للانضمام لفريق التطوير',
        status: 'active',
        autoApprove: true, // IT department auto-approves
        maxUses: 10,
        currentUses: 0,
    createdAt: serverTS(admin),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)) // 60 days
    },
    {
        code: 'HR2024001',
        department: 'hr',
        departmentId: 'hr',
        departmentName: 'إدارة الموارد البشرية',
        invitedBy: 'مدير الموارد البشرية',
        invitedByEmail: 'hr.manager@aman.eg',
        suggestedRole: 'employee',
        message: 'دعوة للانضمام لفريق الموارد البشرية',
        status: 'active',
        autoApprove: false,
        maxUses: 5,
        currentUses: 0,
    createdAt: serverTS(admin),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)) // 45 days
    },
    {
        code: 'GOVERN2024001',
        department: 'governance',
        departmentId: 'governance',
        departmentName: 'إدارة الحوكمة والامتثال',
        invitedBy: 'مدير الحوكمة والامتثال',
        invitedByEmail: 'governance.manager@aman.eg',
        suggestedRole: 'employee',
        message: 'دعوة للانضمام لفريق الحوكمة والامتثال',
        status: 'active',
        autoApprove: false,
        maxUses: 3,
        currentUses: 0,
    createdAt: serverTS(admin),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    }
];

async function createSampleInvitations() {
    try {
        console.log('🚀 بدء إنشاء الدعوات التجريبية...');

        for (const invitation of sampleInvitations) {
            await db.collection('invitations').add(invitation);
            console.log(`✅ تم إنشاء دعوة: ${invitation.code} - ${invitation.departmentName}`);
        }

        console.log('🎉 تم إنشاء جميع الدعوات التجريبية بنجاح!');
        console.log('\n📋 أكواد الدعوات المتاحة:');
        sampleInvitations.forEach(inv => {
            console.log(`   ${inv.code} - ${inv.departmentName} (${inv.autoApprove ? 'موافقة تلقائية' : 'تحتاج موافقة'})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ في إنشاء الدعوات:', error);
        process.exit(1);
    }
}

// Run the function
createSampleInvitations();
