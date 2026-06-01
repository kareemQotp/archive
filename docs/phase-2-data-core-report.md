# تقرير المرحلة 2: نواة البيانات

الحالة: Completed
التاريخ: 2026-05-25

## ما تم تنفيذه
- إنشاء صفحة جديدة لإدارة العملاء وملفات العملاء:
  - `public/client-files.html`
  - `public/assets/js/client-files-page.js`
- دعم CRUD للعملاء (`clients`) وملفات العملاء (`client_files`).
- إنشاء Barcode على مستوى ملف العميل عند الإنشاء.
- ربط صفحة الرفع بنموذج بيانات العميل/ملف العميل عبر حقول:
  - clientFileId
  - clientName
  - clientId
  - nationalId
  - contractNumber
  - caseNumber
  - barcode
- توسيع قواعد Firestore لدعم:
  - `match /clients/{clientDocId}`
  - `match /client_files/{clientFileId}`
  - توسيع `documentAllowedKeys` لحقول الربط الجديدة.
- دمج صفحة ملفات العملاء في التنقل الجانبي والصلاحيات الافتراضية.

## التحقق
- فحص أخطاء المحرر للملفات المعدلة: لا توجد أخطاء.

## ملاحظات
- بيئة التشغيل الحالية لا تحتوي على Node/npm، لذا لم يتم تشغيل اختبارات runtime عبر terminal.
- تم تنفيذ الربط في مسار رفع الملف الأساسي في `upload-page.js`.
