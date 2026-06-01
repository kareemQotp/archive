# Admin Portal Ops Runbook

## الهدف
دليل تشغيلي لإدارة حوادث صلاحيات Admin Portal ومراجعات التدقيق الدورية بعد إغلاق M3.5.

## 1) تصنيف الحوادث
- P1: وصول غير مصرح لصفحة حساسة.
- P2: تعطّل مسار إدارة أساسي (users/admin/permissions).
- P3: خطأ تقارير/تصدير أو انحراف في matrix بدون أثر أمني مباشر.

## 2) استجابة أول 15 دقيقة
1. تأكيد البلاغ (صفحة/دور/وقت/مستخدم).
2. تفعيل جمع الأدلة:
- admin-access-smoke.html (Refresh + Export JSON/CSV).
- npm run test:admin:security
3. عزل مؤقت عند الحاجة عبر Feature Flags من page-permissions.html.

## 3) عزل الأثر (Containment)
- إيقاف الوحدة المتأثرة (flag = false):
- invitationsV2
- departmentManagementV2
- userManagementV2
- adminManagementV2
- توثيق سبب الإيقاف في audit logs عبر آلية reason + reauth.

## 4) التحقيق
1. مراجعة آخر تغييرات:
- system_settings/admin_portal_config
- system_settings/page_permissions
- system_settings/page_permissions_versions
2. مراجعة audit_logs:
- page_permissions_updated
- page_permissions_rollback
- admin operations الحساسة
3. مقارنة نتائج smoke الحالية مع آخر baseline ناجح.

## 5) الاستعادة
1. rollback صلاحيات عند الحاجة من page-permissions.html.
2. إعادة تفعيل flags تدريجيًا (واحدة واحدة).
3. تشغيل smoke/security بعد كل خطوة.

## 6) التحقق بعد الاستعادة
- npm run test:admin:smoke
- npm run test:admin:security
- التحقق اليدوي لعينة أدوار: super_admin, admin, dept_admin, viewer.

## 7) مراجعة دورية
- يومي: Smoke سريع (صفحة smoke + Export).
- أسبوعي: Regression checklist كاملة.
- شهري: تدقيق privileges + مراجعة نسخ page permissions.

## 8) مخرجات إلزامية للحادث
- وقت البدء والانتهاء.
- الصفحات والأدوار المتأثرة.
- ملفات JSON/CSV المرفقة.
- root cause.
- إجراء وقائي لمنع التكرار.
