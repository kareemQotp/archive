## Lint Rules Enforcement (Firestore Collections & Timestamps)

هذه الوثيقة تشرح القواعد المخصصة المضافة لمنع الأخطاء الشائعة:

### 1. منع أسماء المجموعات الصريحة مباشرة
لا تكتب:
```js
db.collection('users').doc(uid)
```
بل استخدم:
```js
const { COLLECTIONS } = require('../config/constants');
db.collection(COLLECTIONS.USERS).doc(uid);
```
القاعدة: `local-firestore/no-raw-firestore` تعطي خطأ عند أي literal مطابق للقائمة.

### المجموعات الخاضعة للفحص
`users, documents, file_movements, notifications, activity_logs, reports, system_backups, daily_statistics, system_settings, notification_settings, rate_limits, invitations, counters`

### 2. منع الاستعمال المباشر لـ FieldValue.serverTimestamp
ممنوع:
```js
admin.firestore.FieldValue.serverTimestamp()
```
مسموح:
```js
const { serverTS } = require('../utils/serverTimestamp');
serverTS();
```

### 3. إضافة مجموعة جديدة
1. أضف الاسم إلى `COLLECTIONS` في `config/constants.ts`.
2. أضف الاسم إلى مصفوفة `FORBIDDEN_COLLECTIONS` داخل `eslint-rules/no-raw-firestore.js`.
3. شغّل ESLint للتأكد من عدم وجود تحذيرات.

### تشغيل الفحص يدويًا
```bash
cd functions
npx eslint src --ext .js,.ts
```

### الهدف
تقليل تكرار الأخطاء + توحيد مصادر الحقيقة + تسهيل refactor المستقبلي.
