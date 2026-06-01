# Admin Portal M3.5 Test Suite

## الهدف
إغلاق متطلبات M3.5 الخاصة بالتحقق الأمني والتشغيلي قبل أي rollout نهائي.

## نطاق التحقق
- Role-by-Role Access Matrix.
- Privilege Escalation Prevention.
- Smoke + Regression على المسارات القديمة والجديدة.

## المتطلبات المسبقة
1. وجود حساب Super Admin فعّال.
2. تحديث Feature Flags من صفحة الصلاحيات.
3. تشغيل أداة smoke:
- npm run test:admin:smoke

## 1) Role-by-Role Matrix

### صفحات الإدارة المستهدفة
- invitations.html
- department-management.html
- user-management.html
- admin-management.html
- admin-access-smoke.html

### الأدوار
- super_admin
- system_admin
- admin
- dept_admin
- manager
- employee
- viewer

### المتوقع
- user-management + admin-management: مسموح فقط super_admin/system_admin.
- invitations: مسموح admin/dept_admin.
- department-management: مسموح admin/super_admin/system_admin.
- admin-access-smoke: مسموح فقط super_admin/system_admin.

### آلية التنفيذ
1. افتح صفحة admin-access-smoke.html.
2. اضغط تحديث.
3. تحقق أن المصفوفة تطابق المتوقع.
4. صدّر CSV وJSON واحتفظ بهما ضمن مرفقات release.

## 2) Privilege Escalation Checks

## آلي (مطلوب)
- npm run test:admin:security
- يجب أن ينتهي Exit Code = 0.

## التحقق الآلي يغطي
- منع admin/dept_admin/employee/viewer من الوصول إلى user_management/admin_management.
- ضمان وصول super_admin/system_admin إلى user_management/admin_management عند تفعيل flags.

## يدوي (عينة)
1. سجل بحساب admin عادي.
2. حاول فتح user-management.html مباشرة.
3. تأكد من ظهور منع + redirect.
4. راجع audit/logs للحدث.

## 3) Smoke + Regression

## Smoke (بعد أي تعديل صلاحيات)
1. npm run test:admin:smoke
2. افتح admin-access-smoke.html وتحقق من الملخص العددي.
3. نفّذ رحلة سريعة:
- login -> admin-management -> page-permissions -> invitations -> activity-logs

## Regression (أسبوعي أو قبل release)
1. صفحات dashboard الأساسية لكل إدارة لا تزال تعمل.
2. الروابط الجانبية لا تُظهر صفحات Super Admin لغير المخولين.
3. عمليات حساسة ما زالت تتطلب reason + reauth.
4. Export التقارير (CSV/JSON) ما زال يعمل.

## مخرجات إلزامية لكل دورة
- ملف JSON من Smoke Matrix.
- ملف CSV من Smoke Matrix.
- نتيجة npm run test:admin:security.
- ملاحظة تحقق قصيرة في release notes.

## تعريف النجاح (M3.5)
- لا حالات escalation.
- كل نتائج smoke ناجحة.
- لا regression في المسارات القديمة.
