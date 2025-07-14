# دليل نشر Firebase Data Connect
## Firebase Data Connect Deployment Guide

### 📋 **المتطلبات الأساسية**

1. **Firebase CLI** (الإصدار 13.0.0 أو أحدث)
```powershell
npm install -g firebase-tools@latest
```

2. **Node.js** (الإصدار 18 أو أحدث)
3. **PostgreSQL** (للبيئة المحلية)
4. **حساب Firebase** مع مشروع مُفعل

---

### 🚀 **خطوات النشر**

#### **1. تسجيل الدخول إلى Firebase**
```powershell
firebase login
```

#### **2. تهيئة المشروع**
```powershell
# في المجلد الجذر للمشروع
cd "D:\Archive 2.1"

# ربط المشروع (إذا لم يكن مربوطاً)
firebase use your-project-id

# أو تهيئة مشروع جديد
firebase init
```

#### **3. التحقق من هيكل Data Connect**
تأكد من وجود الملفات التالية:
```
dataconnect/
├── dataconnect.yaml              ✅ موجود
├── schema/
│   └── schema.gql               ✅ موجود
├── connector/
│   ├── connector.yaml           ✅ موجود
│   ├── queries.gql              ✅ موجود
│   └── mutations.gql            ✅ موجود
└── migrations/
    └── 001_initial_setup.sql    ✅ موجود
```

#### **4. نشر Data Connect**
```powershell
# نشر Data Connect فقط
firebase deploy --only dataconnect

# أو نشر كامل للمشروع
firebase deploy
```

---

### 🔧 **ما بعد النشر**

#### **1. توليد JavaScript SDK**
```powershell
# توليد SDK للـ JavaScript
firebase dataconnect:sdk:generate --connector=archive-connector --output-dir=public/assets/js/generated

# أو توليد لجميع الـ connectors
firebase dataconnect:sdk:generate
```

#### **2. اختبار الاتصال**
```powershell
# فتح Data Connect في المتصفح
firebase dataconnect:console

# اختبار الـ queries المحلية
firebase dataconnect:sql:shell --database=your-database-name
```

#### **3. تشغيل الـ Demo**
1. افتح `dataconnect-demo.html` في المتصفح
2. تحقق من حالة النظام (يجب أن تكون كلها خضراء)
3. سجل دخول باستخدام `admin@aman.eg` / `admin123`
4. اختبر العمليات المختلفة

---

### ⚙️ **إعدادات البيئة**

#### **للبيئة المحلية (Development)**
```yaml
# dataconnect/dataconnect.yaml
connectorDirs: ["connector"]
schemaDir: "schema"
datasource:
  postgresql:
    cloudSql:
      instanceId: "your-local-instance"
```

#### **للبيئة الإنتاجية (Production)**
```yaml
# dataconnect/dataconnect.yaml
connectorDirs: ["connector"]
schemaDir: "schema"
datasource:
  postgresql:
    cloudSql:
      instanceId: "your-project:region:instance-name"
      database: "archive21"
```

---

### 🔍 **استكشاف الأخطاء**

#### **خطأ: "Could not find dataconnect.yaml"**
```powershell
# تأكد من وجود الملف في المكان الصحيح
ls dataconnect/dataconnect.yaml

# إنشاء الملف إذا كان مفقوداً
firebase dataconnect:init
```

#### **خطأ: "Schema validation failed"**
```powershell
# التحقق من صحة الـ schema
firebase dataconnect:schema:validate

# عرض تفاصيل الأخطاء
firebase dataconnect:schema:validate --verbose
```

#### **خطأ: "PostgreSQL connection failed"**
1. تحقق من إعدادات Cloud SQL
2. تأكد من وجود قاعدة البيانات
3. تحقق من صلاحيات الشبكة

#### **خطأ: "SDK generation failed"**
```powershell
# حذف الملفات المُولدة وإعادة التوليد
rm -rf public/assets/js/generated
firebase dataconnect:sdk:generate --force
```

---

### 📊 **مراقبة الأداء**

#### **1. Firebase Console**
- انتقل إلى [Firebase Console](https://console.firebase.google.com)
- اختر مشروعك
- انتقل إلى Data Connect
- راقب الاستعلامات والأداء

#### **2. Cloud SQL Monitoring**
- انتقل إلى [Google Cloud Console](https://console.cloud.google.com)
- اختر SQL > your-instance
- راقب الاتصالات والاستعلامات

#### **3. Application Logs**
```javascript
// في الكود
console.log('Data Connect operation:', result);

// في متصفح الشبكة
// تحقق من طلبات GraphQL في تبويب Network
```

---

### 🔒 **الأمان والصلاحيات**

#### **1. Firebase Security Rules**
```javascript
// في firestore.rules (للمصادقة)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### **2. Data Connect Auth Directives**
```graphql
# في queries.gql و mutations.gql
# تم تطبيق @auth(level: USER) في جميع العمليات
```

#### **3. PostgreSQL Security**
- استخدم SSL connections
- قم بتقييد عناوين IP المصرح لها
- استخدم كلمات مرور قوية

---

### 📈 **النسخ الاحتياطي**

#### **1. قاعدة البيانات**
```sql
-- نسخ احتياطي يومي
pg_dump archive21 > backup_$(date +%Y%m%d).sql

-- استعادة النسخة الاحتياطية
psql archive21 < backup_20250101.sql
```

#### **2. إعدادات Firebase**
```powershell
# تصدير إعدادات المشروع
firebase projects:list
firebase use your-project-id
firebase setup:web
```

---

### 🔄 **التحديثات المستقبلية**

#### **1. تحديث Schema**
```powershell
# إضافة migration جديد
firebase dataconnect:migration:new

# تطبيق التحديثات
firebase deploy --only dataconnect
```

#### **2. تحديث SDK**
```powershell
# إعادة توليد SDK بعد تحديث Schema
firebase dataconnect:sdk:generate --force
```

---

### 📞 **الدعم الفني**

#### **مصادر المساعدة:**
1. [Firebase Data Connect Documentation](https://firebase.google.com/docs/data-connect)
2. [GitHub Issues](https://github.com/firebase/firebase-tools/issues)
3. [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase-data-connect)
4. [Firebase Community](https://firebase.google.com/community)

#### **أوامر التشخيص:**
```powershell
# معلومات النظام
firebase --version
node --version
npm --version

# حالة المشروع
firebase projects:list
firebase use

# تشخيص Data Connect
firebase dataconnect:info
firebase dataconnect:schema:validate
```

---

### ✅ **قائمة التحقق النهائية**

- [ ] Firebase CLI مُثبت ومُحدث
- [ ] تسجيل الدخول إلى Firebase
- [ ] ملفات Data Connect موجودة وصحيحة
- [ ] قاعدة البيانات PostgreSQL جاهزة
- [ ] نشر Data Connect نجح
- [ ] توليد SDK نجح
- [ ] اختبار Demo نجح
- [ ] تكامل مع النظام الحالي يعمل
- [ ] مراقبة الأداء مُفعلة
- [ ] النسخ الاحتياطية مُعدة

---

**🎉 تم! Firebase Data Connect جاهز للاستخدام في نظام الأرشيف**
