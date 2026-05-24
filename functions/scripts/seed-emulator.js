// Seed Firestore emulator with minimal data
// تشغيل: npm run seed (بعد تشغيل المحاكي أو قبله مع firestore:host)

const admin = require('firebase-admin');

async function main() {
  try {
    try { admin.app(); } catch { admin.initializeApp({ projectId: 'demo-archive-local' }); }
    const db = admin.firestore();

    // Users (admin + viewer + archive officer)
    const users = [
      { id: 'admin_local', role: 'admin', email: 'admin@test.local', isActive: true, createdAt: new Date(), department: 'central' },
      { id: 'officer_local', role: 'archive_officer', email: 'officer@test.local', isActive: true, department: 'deptA', createdAt: new Date() },
      { id: 'viewer_local', role: 'viewer', email: 'viewer@test.local', isActive: true, department: 'deptA', createdAt: new Date() }
    ];

    for (const u of users) {
      await db.collection('users').doc(u.id).set(u);
    }

    // A sample document
    await db.collection('documents').add({
      fileNumber: '2025-08-0001',
      fileName: 'وثيقة تجريبية.pdf',
      fileSize: 12345,
      fileType: 'application/pdf',
      category: 'general',
      department: 'deptA',
      description: 'مستند مبدئي داخل المحاكي',
      status: 'active',
      createdBy: 'admin_local',
      createdAt: new Date(),
      lastModified: new Date()
    });

    console.log('Seeding completed successfully.');
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  }
}

main();
