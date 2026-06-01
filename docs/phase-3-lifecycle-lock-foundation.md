# المرحلة 3 - أساس دورة الحياة والقفل

الحالة: Completed
التاريخ: 2026-06-01

## نطاق التنفيذ الحالي
- تفعيل state machine لحالات `client_files`.
- تطبيق قواعد `locked` حسب موقع الملف (`currentHolder`).
- منع `requested` خارج `archive`.
- دعم `digital_shared` لطلبات النسخ الرقمية.
- فرض القيود في الواجهة + `firestore.rules`.
- ربط مسار تتبع الحركة (`file-tracking-page.js`) بنفس القيود قبل تسجيل `file_movements`.
- إضافة `clientFileId` و `requestType` إلى سجل الحركة لدعم الربط مع `client_files`.

## الانتقالات المفعلة
- archived -> requested, digital_shared
- requested -> transferred, archived
- transferred -> in_legal, in_collection, returned
- in_legal -> returned, digital_shared
- in_collection -> returned, digital_shared
- digital_shared -> archived, requested
- returned -> archived

## ملاحظة
- هذه الدفعة تمثل نواة المرحلة 3. خطوات الربط الأعمق مع workflow الطلبات والتحويل (transfer_requests/transfers) ستُستكمل عند بدء المرحلة 4.

## نتيجة دفعة الاستكمال
- لم يعد مسار النقل/الاستلام في صفحة التتبع يحدث حالة المستند فقط، بل يحدث حالة ملف العميل أيضاً وفق state machine المعتمد.
- أي انتقال غير صالح يتم رفضه قبل إنشاء سجل حركة جديد.

## تحقق معيار القبول
- لا يمكن تجاوز قواعد الانتقال عبر الواجهة بسبب التحقق المسبق في `client-files-page.js` و `file-tracking-page.js`.
- لا يمكن تجاوز قواعد القفل عبر API لأن `firestore.rules` تفرض:
	- `requested` داخل `archive` فقط وبدون قفل
	- الطلب الرقمي (`digital_shared`) داخل `archive` وبدون قفل
	- الحالات التشغيلية خارج الأرشيف (`transferred`/`in_legal`/`in_collection`) بقفل إلزامي
	- العودة/الأرشفة النهائية داخل `archive` وبدون قفل
