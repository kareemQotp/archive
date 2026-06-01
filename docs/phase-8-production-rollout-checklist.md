# Phase 8 Production Rollout Checklist

الحالة: In Progress (Deployment Running)
التاريخ: 2026-06-01

## تنفيذ فعلي (جلسة 2026-06-01)
- تم بدء التنفيذ.
- تم فحص نطاق التغييرات عبر `git status` و`git diff --name-only`.
- تم التحقق من الجاهزية التشغيلية للملفات المعدلة (بدون أخطاء تحريرية في ملفات المرحلة 8).
- تم حل العائق التقني:
  - العثور على Node.js المثبت محليًا.
  - ضبط PATH للجلسة.
  - تثبيت Firebase CLI (`firebase-tools`) والتحقق من النسخة `15.19.0`.

## A) Pre-Deploy
- [x] مراجعة ملفات التغيير وربطها بنطاق النشر.
- [x] فحص أخطاء الملفات المعدلة (Editor diagnostics).
- [ ] في حالة تعديل functions: `npm run build` ناجح.
- [x] مراجعة قواعد Firestore عند أي تعديل rules/indexes.
- [ ] توثيق رقم الإصدار/المرجع قبل النشر.

## B) Staged Deploy
- [x] نشر Hosting: `firebase deploy --only hosting`
- [x] نشر Firestore Rules: `firebase deploy --only firestore:rules`
- [x] نشر Firestore Indexes: `firebase deploy --only firestore:indexes`
- [ ] نشر Functions (إذا لزم): `firebase deploy --only functions` (مؤجل لحين قرار نطاق نشر الـ functions)

## C) Operational Smoke Tests
- نتائج أولية (Anonymous / بدون تسجيل دخول):
  - تم التحقق من وصول المسارات الأساسية (HTTP 200 بعد التحويل إلى المسارات canonical).
  - `file-tracking` و`client-files` و`movement-reports` تُحمّل الواجهة بنجاح.
  - تم رصد سلوك حراسة/إعادة توجيه مرتبط بعدم تسجيل الدخول (expected).
  - يلزم استكمال smoke checks بحسابات فعلية للتحقق من البيانات والصلاحيات.
- [ ] تسجيل الدخول كـ admin.
- [ ] تسجيل الدخول كـ archive_officer.
- [ ] فتح `file-tracking.html` والتحقق من الطلبات والتحويلات.
- [ ] فتح `client-files.html` والتحقق من البحث/الباركود.
- [ ] فتح `movement-reports.html` والتحقق من:
  - الملفات داخل كل إدارة
  - الطلبات المفتوحة
  - متوسط زمن التسليم/الإرجاع
  - الملفات المقفلة
- [ ] التحقق من Activity Logs وعدم وجود أحداث `critical` غير متوقعة.

### نتائج Smoke Checks - admin (جلسة 2026-06-01)
- [x] تسجيل الدخول كـ admin (نجح وتم التحويل إلى `user-management`).
- [x] فتح `file-tracking` كـ admin (واجهة workflow ظهرت وتحميل الجداول/النماذج تم).
- [ ] فتح `client-files` كـ admin
  - ملاحظة: الصفحة تظهر عناصر تسجيل الدخول بدل حالة session المتوقعة؛ يحتاج تحقق إضافي بسبب عدم ثبات الجلسة.
- [ ] فتح `movement-reports` كـ admin
  - ملاحظة: تم رصد `session-expired` وإعادة التوجيه إلى `login` بعد التحميل الأولي.
- [ ] التحقق من Activity Logs
  - ملاحظة: مؤجل لحين استقرار session/firestore connectivity في المتصفح.

## D) Acceptance Criteria
- [ ] لا يوجد وصول غير مصرح.
- [ ] التقارير التشغيلية تعرض أرقامًا متسقة مع البيانات.
- [ ] كل عملية workflow رئيسية لها أثر تدقيقي.
- [ ] لا توجد أخطاء تشغيلية حرجة بعد النشر.

## E) Rollback Triggered?
- [ ] إذا نعم: اتبع runbook في `docs/phase-8-operations-runbook.md`.
- [ ] إذا لا: اعتماد النشر وإغلاق الإصدار.
