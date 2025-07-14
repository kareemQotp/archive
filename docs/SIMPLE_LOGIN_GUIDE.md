# 🔍 دليل اختبار تسجيل الدخول المبسط

## 🎯 ملف جديد للاختبار
تم إنشاء `simple-login.html` - نسخة مبسطة جداً لاختبار Firebase

## 🚀 كيفية الاستخدام:

### 1. افتح الصفحة الجديدة:
```
http://localhost:5000/simple-login.html
```

### 2. راقب Debug Info:
ستجد معلومات تشخيصية مفصلة تُظهر:
- ✅ حالة تهيئة Firebase
- 🔐 محاولات تسجيل الدخول
- ❌ رسائل الخطأ إن وجدت

### 3. اختبر الوظائف:
- **اختبار Firebase**: زر للتأكد من اتصال Firebase
- **مسح البيانات**: زر لمسح localStorage
- **تسجيل الدخول**: نموذج مبسط

## 📋 معلومات مهمة:

### إذا لم تكن لديك حسابات:
يمكنك إنشاء حساب تجريبي:

1. افتح Firebase Console
2. اذهب إلى Authentication > Users
3. أضف مستخدم جديد

### أو استخدم هذه البيانات التجريبية:
```
Email: admin@archive.com
Password: admin123
```

## 🔍 ما يجب أن تراه:

### إذا كان Firebase يعمل:
```
[وقت] 🔄 بدء تهيئة Firebase...
[وقت] ✅ Firebase App تم تهيئته
[وقت] ✅ Firebase Auth تم تهيئته
[وقت] ✅ Firebase Firestore تم تهيئته
[وقت] ✅ Firebase Persistence تم تعيينه
[وقت] 🎯 نموذج تسجيل الدخول جاهز للاستخدام
```

### عند تسجيل الدخول:
```
[وقت] 🔐 محاولة تسجيل الدخول: user@example.com
[وقت] ✅ تم تسجيل الدخول بنجاح: user@example.com
[وقت] 👤 المستخدم مسجل دخول: user@example.com
```

## 🐛 استكشاف الأخطاء:

### إذا ظهرت أخطاء:
1. تأكد من أن Firebase project نشط
2. تحقق من صحة API key
3. تأكد من وجود المستخدم في Authentication

### رسائل خطأ شائعة:
- `auth/user-not-found` = المستخدم غير موجود
- `auth/wrong-password` = كلمة مرور خاطئة
- `auth/invalid-email` = بريد إلكتروني غير صحيح

---
**اختبر simple-login.html وأخبرني بما تراه في Debug Info** 🔍
