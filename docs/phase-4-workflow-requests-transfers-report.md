# تقرير المرحلة 4 - Workflow الطلبات والتحويل

الحالة: Completed
التاريخ: 2026-06-01

## ما تم تنفيذه
- إنشاء مسار `transfer_requests` متكامل داخل صفحة تتبع الملفات:
  - create request
  - review request
  - approve / reject
- تنفيذ مسار `transfers` كسجل Chain of Custody شامل:
  - dispatch
  - receive
  - return
  - digital_share
- تحديث `currentHolder` و`status` و`locked` تلقائياً في `client_files` مع كل حركة.
- ربط الحركات التقليدية في `file_movements` بالطلب عبر `clientFileId` و`requestType`.
- إضافة جداول عرض مباشرة للطلبات والتحويلات في `file-tracking.html`.

## الحقول المضافة/المستخدمة
- transfer_requests:
  - requestType, clientFileId, fileNumber
  - fromDepartment, toDepartment
  - status, notes
  - createdBy, createdByName, createdAt
  - reviewedBy, reviewedByName, reviewedAt, reviewNotes
  - updatedAt
- transfers:
  - requestId, requestType
  - clientFileId, fileNumber
  - action, fromDepartment, toDepartment, status
  - notes
  - actorId, actorName, actorEmail
  - timestamp, createdAt

## قواعد الأمان
- إضافة قواعد Firestore لمجموعتي `transfer_requests` و`transfers`.
- تقييد انتقالات حالة الطلب `transfer_requests` وفق مسار workflow.
- منع أي مستخدم غير إداري/أرشيفي من تغيير حالة الطلب (يسمح لصاحب الطلب فقط بتعديلات لا تغيّر الحالة).

## معيار القبول
- كل انتقال يترك سجل زمني ومستخدم مسؤول وحالة دقيقة في `transfers`.
- `currentHolder` يتم تحديثه تلقائيًا مع الحركة.
- الطلب الرقمي يمر عبر approve ويُسجّل كـ `digital_share` مع إكمال الطلب.
