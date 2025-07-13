# نظام الإشعارات المتقدم 🔔

نظام شامل ومتقدم لإدارة الإشعارات والتنبيهات في نظام الأرشيف، يتضمن إشعارات ذكية وتنبيهات في الوقت الفعلي مع تكامل كامل مع Firebase.

## المميزات الرئيسية ✨

### 1. نظام التنبيهات المتقدم (Advanced Alerts)
- **تنبيهات بصرية متقدمة**: تنبيهات ملونة وتفاعلية
- **مركز الإشعارات**: واجهة مركزية لإدارة جميع التنبيهات
- **تجميع الإشعارات**: دمج الإشعارات المتشابهة تلقائياً
- **أولوية الإشعارات**: تصنيف حسب الأهمية (عادي، مهم، عاجل)
- **إشعارات سطح المكتب**: دعم إشعارات النظام
- **تأثيرات صوتية**: أصوات مختلفة حسب نوع الإشعار

### 2. نظام الإشعارات الذكية (Smart Notifications)
- **قواعد ذكية**: معالجة الإشعارات حسب قواعد محددة مسبقاً
- **إشعارات مخصصة**: تخصيص الإشعارات حسب دور المستخدم
- **جدولة الإشعارات**: إرسال الإشعارات في الوقت المناسب
- **تفضيلات المستخدم**: تحكم كامل في أنواع الإشعارات المرغوبة
- **الساعات الهادئة**: تأجيل الإشعارات غير العاجلة
- **قنوات متعددة**: ويب، إيميل، إشعارات فورية

### 3. نظام التكامل (Integration System)
- **تكامل Firebase**: ربط مع Cloud Functions للإشعارات الفورية
- **مراقبة الأنشطة**: تتبع جميع الأنشطة وإرسال إشعارات مناسبة
- **إشعارات الأمان**: تنبيهات فورية للأحداث الأمنية
- **مراقبة الأداء**: تتبع أداء النظام وإرسال تقارير
- **التنظيف التلقائي**: إزالة الإشعارات القديمة تلقائياً

## الهيكل التقني 🏗️

### الملفات الرئيسية

```
public/assets/js/
├── advanced-alerts.js          # نظام التنبيهات المتقدم
├── smart-notifications.js      # نظام الإشعارات الذكية
├── notification-integration.js # نظام التكامل
└── notifications.js           # النظام الأساسي

public/
├── notification-settings.html  # واجهة إعدادات الإشعارات
├── notification-test.html      # صفحة اختبار النظام
└── index.html                 # الصفحة الرئيسية المحدثة

firebase/functions/src/utils/
└── index.js                   # Cloud Functions للإشعارات
```

### مكونات النظام

#### 1. AdvancedAlertSystem
```javascript
// إنشاء تنبيه
advancedAlertSystem.createCustomAlert({
    title: 'عنوان التنبيه',
    message: 'محتوى التنبيه',
    type: 'info', // success, info, warning, error
    priority: 'normal', // normal, high, urgent
    source: 'system'
});

// عرض مركز الإشعارات
advancedAlertSystem.showNotificationCenter();

// تحديد جميع الإشعارات كمقروءة
advancedAlertSystem.markAllAsRead();
```

#### 2. SmartNotificationManager
```javascript
// معالجة إشعار ذكي
smartNotificationManager.processNotification({
    type: 'file_upload',
    uploaderId: 'user123',
    fileName: 'document.pdf',
    department: 'IT'
});

// تحديث تفضيلات المستخدم
smartNotificationManager.updateUserPreferences(userId, {
    channels: { web: true, email: false },
    quietHours: { enabled: true, start: '22:00', end: '08:00' }
});
```

#### 3. NotificationIntegration
```javascript
// إرسال إشعار مخصص
notificationIntegration.sendCustomNotification({
    title: 'إشعار مخصص',
    message: 'رسالة الإشعار',
    type: 'info',
    priority: 'normal'
});

// الحصول على حالة النظام
const status = notificationIntegration.getSystemStatus();
```

## أنواع الإشعارات 📋

### 1. إشعارات الملفات
- **تحميل ملف**: عند تحميل ملف جديد
- **نقل ملف**: عند نقل ملف بين الأقسام
- **حذف ملف**: عند حذف ملف من النظام
- **انتهاء الصلاحية**: عند اقتراب انتهاء صلاحية وثيقة

### 2. إشعارات المستخدمين
- **تسجيل دخول**: عند تسجيل دخول مستخدم جديد
- **تسجيل دخول مشبوه**: عند اكتشاف نشاط مشبوه
- **تغيير كلمة المرور**: عند تغيير كلمة مرور
- **تحديث الصلاحيات**: عند تغيير صلاحيات المستخدم

### 3. إشعارات الأمان
- **محاولة دخول فاشلة**: عند فشل تسجيل الدخول
- **IP مشبوه**: عند اكتشاف عنوان IP مشبوه
- **محاولة اختراق**: عند اكتشاف محاولة اختراق
- **فحص البرمجيات الخبيثة**: عند اكتشاف ملف مشبوه

### 4. إشعارات النظام
- **صيانة النظام**: إشعارات الصيانة المجدولة
- **النسخ الاحتياطي**: حالة النسخ الاحتياطي
- **تحديثات النظام**: إشعارات التحديثات الجديدة
- **مراقبة الأداء**: تقارير أداء النظام

## قواعد الإشعارات الذكية 🧠

### قواعد افتراضية مدمجة

```javascript
// قاعدة تحميل الملفات
{
    id: 'file_upload',
    condition: (data) => data.type === 'file_upload',
    priority: 'normal',
    channels: ['web'],
    recipients: ['uploader', 'department_head'],
    frequency: 'immediate'
}

// قاعدة الأنشطة العاجلة
{
    id: 'urgent_activity',
    condition: (data) => data.priority === 'urgent',
    priority: 'urgent',
    channels: ['web', 'push', 'email'],
    recipients: ['admin', 'department_head'],
    frequency: 'immediate'
}
```

### تخصيص القواعد

```javascript
// إضافة قاعدة مخصصة
smartNotificationManager.addNotificationRule({
    id: 'custom_rule',
    name: 'قاعدة مخصصة',
    condition: (data) => data.customField === 'value',
    priority: 'high',
    channels: ['web', 'email'],
    template: 'custom_template',
    recipients: ['admin'],
    frequency: 'immediate'
});
```

## تفضيلات المستخدم ⚙️

### إعدادات القنوات
```javascript
{
    channels: {
        web: true,        // إشعارات الويب
        email: true,      // البريد الإلكتروني
        push: false       // الإشعارات الفورية
    }
}
```

### إعدادات الأنواع
```javascript
{
    types: {
        file_upload: true,
        file_movement: true,
        urgent_activity: true,
        security_alert: true,
        system_maintenance: false
    }
}
```

### الساعات الهادئة
```javascript
{
    quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
    }
}
```

## Cloud Functions 🔥

### الدوال المتاحة

#### إرسال إشعار
```javascript
const result = await firebase.functions().httpsCallable('sendNotification')({
    userId: 'user123',
    title: 'عنوان الإشعار',
    message: 'محتوى الإشعار',
    type: 'info',
    priority: 'normal',
    channels: ['web', 'email']
});
```

#### إرسال إشعار جماعي
```javascript
const result = await firebase.functions().httpsCallable('sendBulkNotifications')({
    recipients: 'all', // أو ['user1', 'user2'] أو 'department'
    title: 'إشعار جماعي',
    message: 'محتوى الإشعار',
    type: 'info',
    department: 'IT' // اختياري للإشعارات القسم
});
```

#### الحصول على الإشعارات
```javascript
const notifications = await firebase.functions().httpsCallable('getUserNotifications')({
    limit: 20,
    unreadOnly: false,
    type: 'file_upload'
});
```

#### تحديد الإشعارات كمقروءة
```javascript
const result = await firebase.functions().httpsCallable('markNotificationsRead')({
    notificationIds: ['id1', 'id2'],
    markAll: false
});
```

## الاختبار والتطوير 🧪

### صفحة الاختبار
افتح `notification-test.html` لاختبار جميع أنظمة الإشعارات:

- **فحص حالة الأنظمة**: التأكد من تشغيل جميع المكونات
- **اختبار التنبيهات**: تجربة أنواع مختلفة من التنبيهات
- **محاكاة الأحداث**: محاكاة تحميل ملفات وحركات الملفات
- **الإحصائيات**: عرض إحصائيات الإشعارات المرسلة
- **سجل الأحداث**: تتبع جميع الأحداث والاختبارات

### أوامر التطوير
```bash
# تشغيل النظام محلياً
npm start

# تشغيل Cloud Functions محلياً
npm run functions:serve

# نشر Cloud Functions
npm run functions:deploy

# اختبار النظام
npm run test:notifications
```

## الإعداد والتثبيت 🔧

### 1. تفعيل الإشعارات في Firebase
```javascript
// تكوين Firebase
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging(app);
getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
```

### 2. إعداد Service Worker
```javascript
// في sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
```

### 3. إعداد قواعد Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notifications/{document} {
      allow read, write: if request.auth != null;
    }
    match /user_preferences/{document} {
      allow read, write: if request.auth != null && request.auth.uid == document;
    }
  }
}
```

## الأداء والتحسين 📊

### مراقبة الأداء
- **استهلاك الذاكرة**: مراقبة استهلاك الذاكرة
- **عدد الإشعارات**: تتبع عدد الإشعارات المرسلة
- **وقت الاستجابة**: قياس سرعة معالجة الإشعارات
- **معدل الأخطاء**: مراقبة الأخطاء وحلها

### تحسينات مطبقة
- **تجميع الإشعارات**: تقليل عدد الإشعارات المرسلة
- **التنظيف التلقائي**: إزالة الإشعارات القديمة
- **التخزين المؤقت**: تحسين سرعة التحميل
- **معالجة الأخطاء**: معالجة شاملة للأخطاء المحتملة

## الأمان 🔒

### حماية البيانات
- **تشفير الإشعارات**: تشفير محتوى الإشعارات الحساسة
- **التحقق من الهوية**: التأكد من هوية المرسل والمستقبل
- **صلاحيات الوصول**: تحكم في من يمكنه إرسال الإشعارات
- **تسجيل الأنشطة**: تسجيل جميع عمليات الإشعارات

### أفضل الممارسات
- **تحديد الأولوية**: عدم إرسال إشعارات غير ضرورية
- **احترام الخصوصية**: عدم إرسال معلومات حساسة
- **التحكم في التكرار**: منع إرسال إشعارات متكررة
- **النسخ الاحتياطي**: حفظ نسخ احتياطية من الإعدادات

## استكشاف الأخطاء 🔍

### مشاكل شائعة وحلولها

#### 1. عدم ظهور الإشعارات
```javascript
// التحقق من تهيئة النظام
if (!window.advancedAlertSystem?.isInitialized) {
    console.error('نظام التنبيهات غير مهيأ');
}

// التحقق من أذونات المتصفح
if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
}
```

#### 2. عدم وصول الإشعارات عبر Firebase
```javascript
// التحقق من الاتصال
if (!firebase.apps.length) {
    console.error('Firebase غير مهيأ');
}

// التحقق من المصادقة
if (!firebase.auth().currentUser) {
    console.error('المستخدم غير مسجل دخول');
}
```

#### 3. مشاكل الأداء
```javascript
// تفعيل التنظيف التلقائي
advancedAlertSystem.settings.maxAlerts = 50;
advancedAlertSystem.settings.retention = 7 * 24 * 60 * 60 * 1000; // 7 أيام
```

## المساهمة 🤝

### كيفية المساهمة
1. **Fork** المشروع
2. إنشاء **feature branch**: `git checkout -b feature/notification-enhancement`
3. **Commit** التغييرات: `git commit -m 'Add notification feature'`
4. **Push** إلى البرنش: `git push origin feature/notification-enhancement`
5. إنشاء **Pull Request**

### إرشادات الكود
- استخدم الأسماء الواضحة للمتغيرات والدوال
- اكتب تعليقات باللغة العربية
- اتبع معايير JavaScript الحديثة
- اختبر الكود قبل الإرسال

## الترخيص 📄

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم 💬

للحصول على الدعم:
- فتح [Issue](https://github.com/your-org/archive-system/issues) جديد
- إرسال بريد إلكتروني إلى: support@archive-system.com
- مراجعة [الوثائق](https://docs.archive-system.com)

---

تم تطوير هذا النظام بواسطة **فريق نظام الأرشيف** 🚀

<div dir="rtl">
<p align="center">
<strong>نظام الأرشيف - حلول ذكية لإدارة الوثائق</strong><br>
نظام شامل ومتطور لإدارة الأرشيف مع إشعارات ذكية وتنبيهات في الوقت الفعلي
</p>
</div>
