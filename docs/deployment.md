# Deployment Guide

الحالة: Active
آخر تحديث: 2026-06-01

## الهدف
توفير مسار نشر تدريجي آمن (Hosting / Rules / Functions) مع تحقق بعد كل خطوة وتقليل مخاطر الرجوع.

## نطاق النشر
- UI/Hosting: أي تعديل في `public/`
- Firestore Rules/Indexes: أي تعديل في `firestore.rules` أو `firestore.indexes.json`
- Functions: أي تعديل في `functions/src/`

## بوابات الأمان قبل النشر
1. مراجعة الملفات المعدلة والتأكد من نطاق النشر المطلوب.
2. تنفيذ فحص أخطاء للملفات المعدلة.
3. في حالة تعديل Functions:
	- `cd functions`
	- `npm run build`
	- `npm run test:fast` (إن كانت متاحة في البيئة)
4. مراجعة قواعد الأمان إذا تغيّرت (`firestore.rules`).

## استراتيجية النشر التدريجي
1. Hosting أولاً عندما تكون التعديلات واجهة فقط:
	- `firebase deploy --only hosting`
2. Firestore Rules/Indexes ثانيًا عند تغييرات البيانات/الأمان:
	- `firebase deploy --only firestore:rules`
	- `firebase deploy --only firestore:indexes`
3. Functions أخيرًا عند تغييرات backend:
	- `firebase deploy --only functions`

## Smoke Checks بعد النشر
1. تسجيل الدخول بالأدوار الأساسية (admin + archive_officer + مستخدم قسم).
2. فتح صفحات التشغيل الأساسية:
	- `file-tracking.html`
	- `movement-reports.html`
	- `client-files.html`
3. تحقق من:
	- إنشاء طلب تحويل
	- استلام/إرجاع
	- البحث بالباركود
	- تحميل التقارير التشغيلية
4. مراجعة Activity Logs لأي أخطاء حرجة.

## Rollback سريع
عند رصد خلل صلاحيات/تعطل تشغيلي:
1. إيقاف النشر الحالي.
2. إعادة نشر آخر نسخة مستقرة من Hosting.
3. إعادة نشر آخر نسخة مستقرة من Rules.
4. إعادة نشر آخر نسخة مستقرة من Functions (إن كانت ضمن التغيير).
5. تنفيذ Smoke Checks الأساسية للتأكد من التعافي.

## ملاحظات
- يفضل النشر الانتقائي Selective Deploy بدل `firebase deploy` الكامل.
- أي نشر قواعد يجب أن يسبقه مراجعة منطق الأدوار والـ helper functions.
