# مراجعة وبناء الأدوار والصلاحيات

Status: Draft baseline
Date: 2026-08-30

## الهدف

توحيد قرار الوصول في النظام حول عقد واضح:

- `role`: مستوى الصلاحية الوظيفي.
- `department` / `departmentId`: نطاق البيانات والإدارة.
- صلاحيات الواجهة تساعد المستخدم، لكنها لا تكفي وحدها. الحسم الأمني يجب أن يبقى في Firestore Rules وCloud Functions.

## الأدوار المعتمدة

| الدور | الاستخدام | ملاحظات توافق |
|---|---|---|
| `super_admin` | إدارة حساسة كاملة: المستخدمون، المدراء، إعدادات النظام، صلاحيات الصفحات | `system_admin` alias |
| `admin` | إدارة تشغيلية عامة بدون إدارة المدراء/المستخدمين الحساسة في بوابة الإدارة الجديدة | ما زال واسعاً في بعض قواعد Firestore |
| `department_admin` | إدارة مستخدمي وملفات نطاق الإدارة | `dept_admin`, `department-admin`, `manager` aliases |
| `supervisor` | إشراف وتقارير وتشغيل ملفات | `department_head` alias |
| `archive_officer` | تشغيل الأرشيف والحركة والاستلام والتسليم | `archive-officer` alias، ويرث صلاحيات الموظف |
| `employee` | رفع وبحث وتعديل تشغيلي ضمن النطاق | لا يُمنح تلقائياً لحسابات `user` القديمة |
| `viewer` | مشاهدة وبحث محدود | أقل صلاحية |

الأدوار القديمة مثل `legal`, `collection`, `governance`, و`securitization` يجب التعامل معها كـ scope إداري في `department`، لا كمستوى صلاحية مستقل. لدعم البيانات القديمة، تعتبرها الواجهة مكافئة لصلاحية موظف عند حساب الوصول للصفحات.

## مصفوفة الصفحات الافتراضية

| الصفحة | super_admin | admin | department_admin | supervisor | archive_officer | employee | viewer |
|---|---|---|---|---|---|---|---|
| dashboard/search/profile/file-tracking | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| upload/file-management/scanner/qr-generator | Yes | Yes | Yes | Yes | Yes | Yes | No |
| movement-reports | Yes | Yes | Yes | Yes | No | No | No |
| system-analytics | Yes | Yes | Yes | No | No | No | No |
| invitations | Yes | Yes | Yes | No | No | No | No |
| department-management | Yes | Yes | No | No | No | No | No |
| user-management/admin-management/page-permissions/role-manager/create-admin | Yes | No | No | No | No | No | No |

## تدفق قرار الوصول

```mermaid
flowchart TD
    A[طلب فتح صفحة أو تنفيذ إجراء] --> B{صفحة عامة؟}
    B -- نعم --> Z[سماح]
    B -- لا --> C{المستخدم مسجل؟}
    C -- لا --> L[تحويل إلى login]
    C -- نعم --> D[تحميل users/{uid}]
    D --> E[تطبيع role عبر AuthConstants]
    E --> F[إضافة aliases عبر getRolePermissionKeys]
    F --> G{صلاحية صفحة من system_settings/page_permissions؟}
    G -- موجودة --> H[تقييم مصفوفة الصفحة]
    G -- غير موجودة --> I[استخدام الصلاحيات الافتراضية]
    H --> J{مسموح؟}
    I --> J
    J -- نعم --> K[عرض الصفحة وفلترة عناصر UI]
    J -- لا --> M[رسالة منع وتحويل مناسب]
```

## فجوات يجب إغلاقها لاحقاً

1. `firestore.rules` ما زال يعتبر `admin` مكافئاً لـ `super_admin` في عدة عمليات حساسة. إذا كانت السياسة النهائية هي فصل الدورين، يجب تعديل `isAdmin()` أو إضافة دوال أدق لكل مجموعة عمليات.
2. `roles.js` يحتوي أدوار أقسام كأنها أدوار صلاحية. الأفضل تحويله لاحقاً إلى كتالوج عرض يستند إلى `AuthConstants` ويقرأ `department` منفصلاً.
3. بعض مسارات الواجهة تعتمد على fallback قديم عند فشل تحميل `page-permissions.js`. يجب اعتبار `AuthConstants` شرط تحميل مبكر في كل الصفحات المحمية.
4. Smoke runner يجب أن يبقى جزءاً من CI حتى لا تعود تضاربات alias بين المتصفح والاختبار.

## القرار التصميمي

نوع الرسم الموصى به: مخطط تدفق UML-like للقرار + مصفوفة RBAC.
البديل: Use Case diagram للمخاطبين غير التقنيين، لكنه لن يكشف تضارب aliases والقواعد بدقة كافية للمطورين.
