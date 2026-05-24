# نظام النسخ الاحتياطي (المرحلة الأولى)

هذه الوثيقة تشرح بنية النسخ الاحتياطي الحالية (المبسطة) وخطة التطوير للوصول إلى نسخ احتياطي إنتاجي يعتمد على Export/Import من Firestore وملفات التخزين.

## الوضع الحالي (Implemented)
- دالة `backupDatabase` (Callable) للمسؤول (Admin فقط):
  - تنشئ سجل Backup في مجموعة `system_backups` مع الحقول:
    - `backupId`, `type` (manual / scheduled), `status` (running/success/failed), `initiatedBy`, `startedAt`, `finishedAt`, `stats`, `retentionExpiry`.
  - تحصي أعداد الوثائق (Counts) لكل من: `users`, `documents`, `file_movements`, `activity_logs`, `notifications` كإحصائيات سريعة (محاكاة export).
  - تُحدّث السجل إلى `success` أو `failed`.
- دالة `listBackups` (Callable) لعرض آخر النسخ (Admin فقط).
- دالة مجدولة `performDailyBackup` تُنفّذ 3 صباحاً (UTC) افتراضياً:
  - تنادي نفس منطق `startBackupOperation` بنوع `scheduled`.
  - تُنفّذ تنظيف (Retention) للنسخ المنتهية صلاحيتها (`retentionExpiry`).
- تنظيف تلقائي للنسخ المنتهية بناءً على `BACKUP_RETENTION_DAYS` (إفتراض 30 يوماً إذا لم تُضبط بيئياً).
- اختبارات وحدة تغطي:
  - نجاح النسخ اليدوي.
  - رفض النسخ للمستخدم غير المدير.
  - إرجاع قائمة النسخ.

## القيود الحالية
1. لا يتم تنفيذ Firestore Export فعلي (gcloud firestore export) بسبب الحاجة لصلاحيات خدمة Cloud Scheduler / IAM وبيئة CI.
2. لا يتم نسخ محتوى Firebase Storage (الملفات) في هذه المرحلة.
3. لا توجد آلية استرجاع (Restore) من النسخ الاحتياطية بعد.
4. الإحصائيات تعتمد على `count()` وهي محاكاة لحجم البيانات وليست نسخة بيانات فعلية.
5. لم تتم إضافة إشعارات أو تنبيهات فورية عند فشل النسخ (يمكن إضافتها عبر Activity Log + Trigger لاحقاً).

## خارطة الطريق (Roadmap)
| المرحلة | الهدف | التفاصيل |
|---------|-------|----------|
| 2 | دعم Firestore Export فعلي | استخدام Cloud Tasks أو Scheduler Function تستدعي REST API: `projects.databases.exportDocuments` مع OAuth لخدمة السحابة |
| 3 | تضمين Storage (مجلد محدد) | نسخ الملفات إلى مسار `gs://<bucket>/backups/<date>/` باستخدام واجهة Storage وإدراج manifest JSON |
| 4 | وظيفة Restore أولية | Callable تتحقق من صلاحيات Admin وتطلق عملية import (تحقق من بيئة آمنة، وضع صيانة) |
| 5 | تنبيهات فشل النسخ الاحتياطي | Trigger على `system_backups` عند `status=failed` لإرسال إشعار أمني للمشرفين |
| 6 | تشفير/تكامل (Integrity) | توليد hash manifest (SHA256) لكل مجموعة وتحزينه في السجل للتحقق بعد الاستعادة |
| 7 | Dashboard واجهة | صفحة Frontend لعرض النسخ، البحث، تصفية حسب الحالة، تنفيذ Restore/Download |

## تصميم Firestore Export المستقبلي
- سيتم إنشاء وظيفة **Privileged** (إما Cloud Function HTTP محمية أو Workflow) تستدعي:
```
POST https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default):exportDocuments
{
  "outputUriPrefix": "gs://<bucket>/firestore-backups/<ISO_DATE>",
  "collectionIds": ["users","documents","file_movements","activity_logs","notifications"]
}
```
- يتطلب ذلك منح حساب الخدمة `roles/datastore.importExportAdmin` + `roles/storage.admin` أو الأقل تقييداً حسب الحاجة.

## الحقول في system_backups
| الحقل | الوصف |
|-------|-------|
| backupId | معرف فريد (timestamp-based) |
| type | manual / scheduled |
| status | running / success / failed |
| initiatedBy | UID أو `system` |
| startedAt | طابع زمني لبداية العملية |
| finishedAt | طابع زمني للنهاية (إن وُجد) |
| stats | كائن يحوي أعداد الوثائق لكل مجموعة |
| retentionExpiry | تاريخ انتهاء صلاحية النسخة (لأغراض الحذف التلقائي) |
| error | رسالة خطأ عند الفشل |

## المتغيرات البيئية المقترحة
| المتغير | الوظيفة | القيمة الإفتراضية |
|---------|---------|--------------------|
| BACKUP_RETENTION_DAYS | مدة الاحتفاظ (أيام) | 30 |
| BACKUP_EXPORT_BUCKET | اسم حاوية التخزين المخصصة للنسخ | نفس حاوية المشروع |
| BACKUP_SCHEDULE_CRON | يمكن لاحقاً جعله متغيراً بدلاً من ثابت | `0 3 * * *` |

## اعتبارات أمنية
- حصر الاستدعاء اليدوي بـ Admin فقط.
- تسجيل كل عملية في `activity_logs` (لم يضف بعد؛ تحسين مقترح قريب).
- منع عمليات Restore في بيئة الإنتاج بدون رمز تأكيد داخلي (Guard Clause في المستقبل).

## تحسينات قريبة مقترحة
1. إضافة Activity Log (category=backup) عند النجاح والفشل.
2. إضافة Trigger يرسل إشعار أمني إذا status=failed.
3. توسيع الاختبارات لتشمل مسار فشل (محاكاة استثناء أثناء الإحصاء).
4. Badge للتغطية في README وربطه بنظام النسخ الاحتياطي (حالة آخر نسخة).

---
تم إعداد هذه الوثيقة بتاريخ 2025-08-18 وتُحدّث مع تطور النظام.
