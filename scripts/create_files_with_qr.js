// Script to create sample files with QR codes in Firestore
// Run this in the browser console after opening any page with Firebase initialized

// NOTE: When running in a browser with the Firebase Web SDK, serverTimestamp() is fine.
// If adapting to an Admin script, you can replace direct serverTimestamp calls with a safe helper.

const sampleFiles = [
    {
        fileNumber: "FILE001",
        fileName: "وثيقة قانونية - العقد رقم 1",
        currentDepartment: "legal",
        currentStatus: "received",
        fileType: "legal_document",
        priority: "normal",
        qrCode: {
            fileNumber: "FILE001",
            fileName: "وثيقة قانونية - العقد رقم 1",
            department: "legal",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE002",
        fileName: "تقرير الحوكمة الشهري",
        currentDepartment: "archive",
        currentStatus: "in_transit",
        fileType: "report",
        priority: "normal",
        qrCode: {
            fileNumber: "FILE002",
            fileName: "تقرير الحوكمة الشهري",
            department: "governance",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE003",
        fileName: "ملف التحصيل - العميل أ",
        currentDepartment: "collection",
        currentStatus: "received",
        fileType: "collection_file",
        priority: "urgent",
        qrCode: {
            fileNumber: "FILE003",
            fileName: "ملف التحصيل - العميل أ",
            department: "collection",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE004",
        fileName: "وثائق التوريق - المشروع ب",
        currentDepartment: "governance",
        currentStatus: "in_transit",
        fileType: "securitization_document",
        priority: "urgent",
        qrCode: {
            fileNumber: "FILE004",
            fileName: "وثائق التوريق - المشروع ب",
            department: "securitization",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE005",
        fileName: "عقد الشراكة الاستراتيجية",
        currentDepartment: "archive",
        currentStatus: "received",
        fileType: "contract",
        priority: "critical",
        qrCode: {
            fileNumber: "FILE005",
            fileName: "عقد الشراكة الاستراتيجية",
            department: "legal",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE006",
        fileName: "تقرير مراجعة داخلية",
        currentDepartment: "governance",
        currentStatus: "received",
        fileType: "audit_report",
        priority: "normal",
        qrCode: {
            fileNumber: "FILE006",
            fileName: "تقرير مراجعة داخلية",
            department: "governance",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE007",
        fileName: "ملف دعوى قضائية",
        currentDepartment: "legal",
        currentStatus: "in_transit",
        fileType: "legal_case",
        priority: "critical",
        qrCode: {
            fileNumber: "FILE007",
            fileName: "ملف دعوى قضائية",
            department: "legal",
            type: "archive_file",
            created: new Date().toISOString()
        }
    },
    {
        fileNumber: "FILE008",
        fileName: "وثائق استثمار جديد",
        currentDepartment: "securitization",
        currentStatus: "received",
        fileType: "investment_document",
        priority: "urgent",
        qrCode: {
            fileNumber: "FILE008",
            fileName: "وثائق استثمار جديد",
            department: "securitization",
            type: "archive_file",
            created: new Date().toISOString()
        }
    }
];

async function createSampleFilesWithQR() {
    console.log('🔄 بدء إنشاء ملفات تجريبية مع رموز QR...');
    
    try {
        for (const file of sampleFiles) {
            // Create file document
            await db.collection('documents').add({
                ...file,
                qrCodeData: JSON.stringify(file.qrCode),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: 'system',
                tags: ['test', 'qr_enabled'],
                description: `ملف تجريبي مع رمز QR - ${file.fileName}`,
                location: `القسم: ${file.currentDepartment}`,
                scanCount: 0,
                lastScanned: null
            });
            
            console.log(`✅ تم إنشاء الملف: ${file.fileNumber} - ${file.fileName}`);
        }
        
        console.log('🎉 تم إنشاء جميع الملفات التجريبية بنجاح!');
        console.log('📱 يمكنك الآن:');
        console.log('   1. استخدام صفحة qr-generator.html لإنشاء رموز QR');
        console.log('   2. استخدام صفحة file-tracking.html لمسح الرموز');
        console.log('   3. تجربة نقل واستلام الملفات بالماسح الضوئي');
        
        console.log('\n📋 الملفات المتاحة للاختبار:');
        sampleFiles.forEach(file => {
            console.log(`   - ${file.fileNumber}: ${file.fileName} (${file.currentStatus})`);
        });
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء الملفات:', error);
    }
}

// Function to generate QR data for testing
function generateTestQRData(fileNumber) {
    const file = sampleFiles.find(f => f.fileNumber === fileNumber);
    if (file) {
        return JSON.stringify(file.qrCode);
    }
    return JSON.stringify({
        fileNumber: fileNumber,
        fileName: 'ملف تجريبي',
        department: 'archive',
        type: 'archive_file',
        created: new Date().toISOString()
    });
}

// Execute the function
createSampleFilesWithQR();

// Make functions available globally for testing
window.generateTestQRData = generateTestQRData;
window.sampleFiles = sampleFiles;
