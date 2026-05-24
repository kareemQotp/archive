# نظام إدارة الأرشيف الإلكتروني 📁

![CI](https://github.com/kareemQotp/archive/actions/workflows/ci.yml/badge.svg)

نظام شامل لإدارة الأرشيف الإلكتروني باللغة العربية مبني على Firebase مع دعم PWA وماسح الباركود المتقدم.

## 🚀 المميزات الرئيسية

### 🔥 Firebase Integration
- **Firebase Authentication**: نظام مصادقة آمن مع إدارة الأدوار
- **Cloud Firestore**: قاعدة بيانات NoSQL مع قوانين أمان متقدمة
- **Firebase Storage**: تخزين آمن ومشفر للملفات
- **Cloud Functions**: منطق الخادم بـ TypeScript
- **Firebase Hosting**: استضافة PWA عالية الأداء

### 🌐 واجهة المستخدم المتطورة
- **دعم RTL كامل**: مصمم خصيصاً للغة العربية
- **Progressive Web App**: يعمل كتطبيق محلي على جميع الأجهزة
- **تصميم متجاوب**: Bootstrap 5 مع دعم RTL
- **واجهة حديثة**: Font Awesome icons مع تأثيرات CSS متطورة

### 🔐 الأمان والصلاحيات المتقدمة
- **أدوار هرمية**: مدير عام، مسؤول أرشيف، موظف توثيق، مستخدم عادي
- **قوانين Firestore**: حماية على مستوى قاعدة البيانات
- **تسجيل الأنشطة الشامل**: تتبع جميع العمليات مع timestamps
- **تشفير الملفات**: حماية متقدمة للبيانات الحساسة

### 📱 ماسح الباركود المتطور
- **مسح مباشر**: باستخدام كاميرا الجهاز مع تقنيات AI
- **رفع الصور**: مسح الباركود من الصور المحفوظة
- **إدخال يدوي**: كتابة الباركود مباشرة مع التحقق
- **QR Code Support**: دعم كامل لـ QR codes ورموز البار المختلفة
- **إنشاء باركود**: توليد باركود للمستندات الجديدة

### 📄 إدارة المستندات المتقدمة
- **رفع متقدم**: Drag & Drop مع معاينة فورية
- **أنواع متعددة**: PDF, Word, Excel, PowerPoint, صور
- **معاينة فورية**: عرض المستندات في المتصفح
- **تصنيفات ذكية**: نظام tags مرن مع بحث متقدم

## 🛠 التقنيات المستخدمة

### Frontend
- **JavaScript**: ES6+ Modules مع Architecture حديث
- **CSS Framework**: Bootstrap 5 RTL
- **Icons**: Font Awesome 6
- **PWA**: Service Worker مع Offline support

### Backend & Cloud
- **Firebase Cloud Functions**: TypeScript/Node.js
- **Cloud Firestore**: NoSQL Database
- **Firebase Storage**: Cloud storage
- **Firebase Auth**: Authentication service
- **Firebase Hosting**: Static hosting

## 📁 الهيكل التقني

```
archive-system/
├── public/                    # Frontend Application
│   ├── assets/js/            # JavaScript Modules (25+ files)
│   ├── *.html               # HTML Pages (Arabic RTL)
│   ├── manifest.webmanifest # PWA Configuration
│   └── sw.js               # Service Worker
├── functions/               # Firebase Cloud Functions
├── scripts/                # Utility scripts
├── firestore.rules         # Database Security Rules
└── firebase.json           # Firebase Configuration
```

## 🚀 التثبيت والإعداد

### المتطلبات الأساسية
- Node.js 18+ 
- Firebase CLI
- Git
- متصفح حديث

### خطوات التثبيت

### أوامر الاختبارات (Testing Commands)

| الأمر | الوصف |
|-------|-------|
| `npm run test:lint-rule` | اختبار قاعدة ESLint المخصصة (حماية من استعمال أسماء مجموعات خام) |
| `npm run test:fast` | اختبارات سريعة (قاعدة lint + معدل الطلبات + smoke لصحة النظام) |
| `npm run test:full` | جميع الاختبارات (58+) لضمان الاستقرار الكامل |

يُستعمل `test:fast` في CI للتحقق السريع، بينما `test:full` يُشغَّل على عمليات الدفع (push) إلى الفرع الرئيسي.

#### 1. استنساخ المشروع
```bash
git clone https://github.com/kareemQotp/archive.git
cd archive
```

#### 2. تثبيت Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### 3. إعداد Firebase Project
```bash
# ربط المشروع
firebase use your-archive-project

# نشر قوانين Firestore
firebase deploy --only firestore:rules
```

#### 4. إعداد Cloud Functions
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

#### 5. نشر التطبيق
```bash
firebase deploy --only hosting
```

## 🎯 الاستخدام السريع

### الوظائف الأساسية
1. **رفع مستند**: اذهب إلى صفحة الرفع واختر الملف
2. **مسح باركود**: استخدم الماسح الضوئي للبحث السريع
3. **إدارة المستخدمين**: لوحة تحكم المدير
4. **تعيين الصلاحيات**: ربط المستندات بالمستخدمين

## 🚀 النشر والإصدارات

### النشر السريع
```bash
# نشر كامل
firebase deploy

# نشر انتقائي
firebase deploy --only hosting
firebase deploy --only functions
```

### إدارة الإصدارات
```bash
# إنشاء إصدار جديد
git tag -a v1.0.0 -m "الإصدار الأول المستقر"
git push origin v1.0.0
```

## 🤝 المساهمة في المشروع

1. Fork المشروع
2. إنشاء branch للميزة الجديدة (`git checkout -b feature/NewFeature`)
3. Commit التغييرات (`git commit -m 'إضافة ميزة جديدة'`)
4. Push إلى Branch (`git push origin feature/NewFeature`)
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.

## 🆘 الدعم

- [GitHub Issues](https://github.com/kareemQotp/archive/issues) للمشاكل التقنية
- راجع ملفات التوثيق في مجلد `docs/`

---

**تم تطوير هذا النظام بـ ❤️ للمجتمع العربي**

[![Firebase](https://img.shields.io/badge/Firebase-FF6F00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

## المميزات

- إدارة المستندات والوثائق
- نظام مسح ضوئي للباركود
- نظام تسجيل دخول وإدارة مستخدمين
- واجهة مستخدم بالعربية

## متطلبات التشغيل

يمكنك تثبيت المتطلبات باستخدام الأمر التالي:

```
pip install -r requirements.txt
```

## طريقة التشغيل

1. قم بتثبيت المتطلبات
2. قم بتشغيل الخادم المحلي:

```
python run.py
```

## رفع المشروع على GitHub

لرفع المشروع على GitHub، اتبع الخطوات التالية:

1. قم بتثبيت Git من الموقع الرسمي: https://git-scm.com/downloads

2. بعد تثبيت Git، افتح موجه الأوامر (Command Prompt) أو PowerShell في مجلد المشروع

3. قم بتهيئة مستودع Git المحلي:

```
git init
```

4. أضف الملفات إلى منطقة التحضير:

```
git add .
```

5. قم بعمل commit للتغييرات:

```
git commit -m "النسخة الأولية من المشروع"
```

6. قم بربط المستودع المحلي بالمستودع البعيد على GitHub:

```
git remote add origin https://github.com/kareemQotp/archive.git
```

7. قم برفع التغييرات إلى GitHub:

```
git push -u origin master
```

ملاحظة: قد تحتاج إلى تسجيل الدخول بحساب GitHub الخاص بك عند تنفيذ أمر الرفع.


خطة التنفيذ مع Firebase 📋

المرحلة الأولى (3-5 أيام)
إعداد Firebase Project
دمج Firebase Auth مع الواجهة الأمامية
تحويل Flask للعمل كـ API Proxy

المرحلة الثانية (أسبوع)
نقل المستندات إلى Firebase Storage
تحويل قاعدة البيانات إلى Firestore
تطبيق قواعد الأمان

المرحلة الثالثة (3-5 أيام)
إعداد Cloud Functions
إضافة Analytics والتنبيهات
اختبار شامل للنظام