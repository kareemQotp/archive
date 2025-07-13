const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../archive-tech-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'archive-tech'
});

const db = admin.firestore();

async function createTestInvitation() {
  try {
    console.log('🔄 إنشاء دعوة اختبار جديدة...');
    
    // Create the exact invitation code you tested
    const invitationData = {
      code: '9HMYXB96KDQA',
      department: 'it', // IT department
      departmentName: 'إدارة تقنية المعلومات',
      invitedBy: 'مدير تقنية المعلومات',
      suggestedRole: 'مطور',
      status: 'active',
      autoApprove: false,
      maxUses: 1,
      currentUses: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      notes: 'دعوة اختبار للتطوير'
    };

    // Create the invitation document
    const docRef = await db.collection('invitations').add(invitationData);
    
    console.log('✅ تم إنشاء الدعوة بنجاح!');
    console.log('📋 تفاصيل الدعوة:');
    console.log(`   - الكود: ${invitationData.code}`);
    console.log(`   - الإدارة: ${invitationData.departmentName}`);
    console.log(`   - مرسل من: ${invitationData.invitedBy}`);
    console.log(`   - الدور المقترح: ${invitationData.suggestedRole}`);
    console.log(`   - معرف الوثيقة: ${docRef.id}`);
    console.log(`   - تنتهي في: ${invitationData.expiresAt.toDate().toLocaleString('ar')}`);
    
    return invitationData;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الدعوة:', error);
    throw error;
  }
}

// Run the function
createTestInvitation()
  .then(() => {
    console.log('🎉 انتهت العملية بنجاح!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 فشلت العملية:', error);
    process.exit(1);
  });
