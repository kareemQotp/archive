// اختبار سريع لإضافة إشعارات متنوعة
async function addDemoNotifications() {
    if (!window.simpleNotificationService) {
        console.log('خدمة الإشعارات غير متاحة');
        return;
    }

    const demoNotifications = [
        {
            type: 'file_upload',
            title: 'تم رفع ملف جديد',
            message: 'تم رفع ملف "تقرير المبيعات.pdf" بنجاح'
        },
        {
            type: 'file_movement', 
            title: 'نقل ملف',
            message: 'تم نقل ملف "العقد_123.docx" من الإدارة المالية إلى الإدارة القانونية'
        },
        {
            type: 'user_invitation',
            title: 'مستخدم جديد',
            message: 'تم إنشاء حساب جديد للمستخدم "أحمد محمد"'
        },
        {
            type: 'security_alert',
            title: 'تنبيه أمني',
            message: 'محاولة دخول من عنوان IP غير معروف'
        },
        {
            type: 'backup_complete',
            title: 'اكتملت النسخة الاحتياطية',
            message: 'تم إنشاء نسخة احتياطية كاملة للنظام بنجاح'
        }
    ];

    for (let i = 0; i < demoNotifications.length; i++) {
        const notif = demoNotifications[i];
        await window.simpleNotificationService.sendNotification({
            recipientId: 'demo-user-' + (i + 1),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            data: { demo: true, index: i + 1 }
        });
        
        // انتظار قصير بين الإشعارات
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ تم إضافة 5 إشعارات تجريبية متنوعة');
}

// تشغيل الاختبار
console.log('🚀 لإضافة إشعارات تجريبية متنوعة، اكتب: addDemoNotifications()');
