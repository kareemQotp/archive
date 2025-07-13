// Script to create sample file movements data
// Run this in the browser console on any page with Firebase initialized

const sampleMovements = [
    {
        fileNumber: "FILE001",
        fileName: "وثيقة قانونية - العقد رقم 1",
        fromDepartment: "archive",
        toDepartment: "legal",
        action: "transfer",
        status: "received",
        notes: "مطلوب للمراجعة القانونية",
        userEmail: "admin@archive.com",
        userDisplayName: "مدير النظام",
        timestamp: new Date("2024-01-15T10:00:00")
    },
    {
        fileNumber: "FILE001",
        fileName: "وثيقة قانونية - العقد رقم 1",
        fromDepartment: "archive",
        toDepartment: "legal",
        action: "receive",
        status: "received",
        notes: "تم الاستلام بواسطة القسم القانوني",
        userEmail: "legal@archive.com",
        userDisplayName: "موظف قانوني",
        timestamp: new Date("2024-01-15T14:30:00")
    },
    {
        fileNumber: "FILE002",
        fileName: "تقرير الحوكمة الشهري",
        fromDepartment: "governance",
        toDepartment: "archive",
        action: "transfer",
        status: "in_transit",
        notes: "أرشفة التقرير الشهري",
        userEmail: "governance@archive.com",
        userDisplayName: "موظف الحوكمة",
        timestamp: new Date("2024-01-16T09:15:00")
    },
    {
        fileNumber: "FILE003",
        fileName: "ملف التحصيل - العميل أ",
        fromDepartment: "collection",
        toDepartment: "legal",
        action: "transfer",
        status: "received",
        notes: "قضية تحصيل تحتاج استشارة قانونية",
        userEmail: "collection@archive.com",
        userDisplayName: "موظف التحصيل",
        timestamp: new Date("2024-01-17T11:20:00")
    },
    {
        fileNumber: "FILE003",
        fileName: "ملف التحصيل - العميل أ",
        fromDepartment: "collection",
        toDepartment: "legal",
        action: "receive",
        status: "received",
        notes: "تم استلام الملف للمراجعة",
        userEmail: "legal@archive.com",
        userDisplayName: "المستشار القانوني",
        timestamp: new Date("2024-01-17T15:45:00")
    },
    {
        fileNumber: "FILE004",
        fileName: "وثائق التوريق - المشروع ب",
        fromDepartment: "securitization",
        toDepartment: "governance",
        action: "transfer",
        status: "in_transit",
        notes: "مراجعة الامتثال للوائح التوريق",
        userEmail: "securitization@archive.com",
        userDisplayName: "مدير التوريق",
        timestamp: new Date("2024-01-18T08:30:00")
    },
    {
        fileNumber: "FILE005",
        fileName: "عقد الشراكة الاستراتيجية",
        fromDepartment: "legal",
        toDepartment: "archive",
        action: "transfer",
        status: "received",
        notes: "أرشفة العقد بعد التوقيع",
        userEmail: "legal@archive.com",
        userDisplayName: "المدير القانوني",
        timestamp: new Date("2024-01-19T13:10:00")
    },
    {
        fileNumber: "FILE005",
        fileName: "عقد الشراكة الاستراتيجية",
        fromDepartment: "legal",
        toDepartment: "archive",
        action: "receive",
        status: "received",
        notes: "تم الأرشفة بنجاح",
        userEmail: "archive@archive.com",
        userDisplayName: "أمين الأرشيف",
        timestamp: new Date("2024-01-19T16:20:00")
    }
];

async function createSampleMovements() {
    console.log('بدء إنشاء بيانات تجريبية لحركة الملفات...');
    
    try {
        for (const movement of sampleMovements) {
            await db.collection('file_movements').add({
                ...movement,
                userId: 'sample-user-id',
                timestamp: firebase.firestore.Timestamp.fromDate(movement.timestamp)
            });
            console.log(`تم إنشاء حركة للملف: ${movement.fileNumber}`);
        }
        
        console.log('✅ تم إنشاء جميع البيانات التجريبية بنجاح!');
        console.log('يمكنك الآن تجربة صفحة تتبع الملفات');
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء البيانات:', error);
    }
}

// Execute the function
createSampleMovements();
