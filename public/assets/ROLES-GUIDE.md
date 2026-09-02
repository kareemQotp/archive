# نظام إدارة الأدوار والصلاحيات RBAC v1

## القاعدة العامة

- `role` يحدد مستوى الصلاحية.
- `departmentId` يحدد نطاق البيانات والإدارة.
- الإدارات مثل `legal`, `collection`, `governance`, `securitization`, `archive` ليست أدواراً.
- `system_admin` alias قراءة فقط لـ `super_admin` ولا يتم إنشاؤه في بيانات جديدة.

## الأدوار المعتمدة

| الدور | الاستخدام |
| --- | --- |
| `super_admin` | إدارة النظام الحساسة، المدراء، صلاحيات الصفحات، والإعدادات العامة. |
| `admin` | مدير تشغيل عام للتقارير وحركة الملفات والعمليات، دون إدارة صلاحيات النظام الحساسة. |
| `department_admin` | إدارة مستخدمي وبيانات نفس `departmentId` فقط. |
| `supervisor` | متابعة ملفات وتقارير الإدارة دون إدارة مستخدمين. |
| `archive_officer` | دور تشغيلي للأرشيف وحركة الملفات، غالباً مع `departmentId: archive`. |
| `employee` | تشغيل محدود داخل الإدارة. |
| `viewer` | قراءة وبحث فقط دون رفع أو حذف أو تحويل. |

## aliases القديمة

| القيمة القديمة | القيمة الجديدة |
| --- | --- |
| `system_admin` | `super_admin` |
| `manager`, `dept_admin`, `department-admin` | `department_admin` |
| `archive-officer` | `archive_officer` |
| `legal`, `collection`, `governance`, `securitization` | `employee` مع نقل القيمة إلى `departmentId` |
| `user` | `viewer` |

## دوال النظام

- `AuthConstants.normalizeRole(role)` لتطبيع الدور.
- `AuthConstants.normalizeDepartment(department)` لتطبيع الإدارة.
- `AuthConstants.departmentFromLegacyRole(role)` لاستخراج الإدارة من دور قديم.
- `AuthConstants.getRoleDisplayName(role)` لعرض اسم الدور.

## مثال

```javascript
const role = AuthConstants.normalizeRole(user.role);
const departmentId = AuthConstants.normalizeDepartment(user.departmentId || user.department);

if (role === 'department_admin' && departmentId === 'legal') {
  // إدارة مستخدمي الشؤون القانونية فقط.
}
```
