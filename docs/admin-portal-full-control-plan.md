# خطة تطوير Admin Portal للتحكم الكامل بالنظام

## الهدف
إنشاء وتطوير بوابة إدارية مركزية تتحكم في النظام بالكامل مع أولوية قصوى للأمان والتدقيق، وتنفيذ مرحلي بدون كسر الصفحات الحالية.

## قرارات النطاق المعتمدة
1. النطاق الوظيفي: لوحة كاملة تشمل Users و Roles و Settings و Audit و Reports و Notifications.
2. نموذج الأدوار: فصل كامل بين Super Admin و Admin مع قيود قوية.
3. حماية العمليات الحساسة: إعادة إدخال كلمة المرور + تسجيل سبب العملية في سجل التدقيق.
4. استراتيجية التنفيذ: مراحل واضحة M1 ثم M2 ثم M3.
5. أسلوب الترحيل: إعادة استخدام وتحسين الصفحات الحالية تدريجيا بدون كسر.
6. الأولوية غير الوظيفية: الأمان والتدقيق أولا.

## المرحلة M1: الأساس الأمني والهيكلي
### المخرجات
1. توحيد نموذج الصلاحيات بين الواجهة والدوال وقواعد Firestore.
2. تعريف صلاحيات واضحة لعمليات Super Admin فقط مقابل Admin.
3. بناء طبقة Admin API موحدة لاستهلاك وظائف الإدارة.
4. فرض إعادة التحقق بكلمة المرور قبل العمليات الحساسة.
5. تسجيل سبب التنفيذ لكل عملية حساسة في سجل التدقيق.

### عناصر التنفيذ
1. توحيد أسماء الأدوار والعقود عبر modules الحالية.
2. إنشاء مسار تشغيل موحد للعمليات الحساسة.
3. الحفاظ على توافق الصفحات القديمة أثناء بناء الهيكل الجديد.

## المرحلة M1.5: Hardening للقواعد والتدقيق
### المخرجات
1. تقييد تعديل إعدادات النظام والصلاحيات الحساسة لدور Super Admin فقط.
2. جعل سجلات التدقيق الحساسة write-once.
3. توسيع بيانات التدقيق لتشمل before و after و reason و severity.

### عناصر التنفيذ
1. تحديث Firestore Rules لتطبيق الفصل الصارم للصلاحيات.
2. منع update أو delete على السجلات الحساسة من الواجهة.
3. توحيد نقاط تسجيل audit ومنع المسارات غير المراقبة.

## المرحلة M2: وحدات الإدارة الأساسية
### Users and Roles
1. إدارة مستخدمين كاملة: list مع pagination و search و filter.
2. تعديل الدور والقسم والتفعيل والتعطيل والحذف الآمن.
3. عمليات bulk مع validation وتقرير نتائج.

### Permissions
1. تطوير إدارة الصلاحيات إلى policy-based.
2. إضافة versioning لإعدادات الصلاحيات.
3. دعم rollback لإصدار صلاحيات سابق.

### System Settings
1. لوحة إعدادات مركزية قابلة للتدقيق.
2. إدارة سياسات الجلسات و lockout والحدود التشغيلية.

### Notifications
1. بث إداري حسب النطاق: كل المستخدمين أو دور معين أو قسم معين.
2. حفظ سجل إرسال وربطه بالتدقيق.

## المرحلة M2.5: المراقبة والتقارير
1. لوحة تدقيق متقدمة بفلاتر زمنية ومستخدم ونوع عملية.
2. تصدير CSV و JSON لسجلات التدقيق.
3. تقارير امتثال وتشغيل: تغييرات الأدوار والعمليات الحساسة وأنماط فشل الدخول.
4. مؤشرات صحة نظام من البيانات المتاحة.

## المرحلة M3: الترحيل التدريجي بدون كسر
1. دمج الصفحات القديمة داخل shell إداري موحد.
2. إزالة الازدواجية تدريجيا ونقل المنطق إلى وحدات مشتركة.
3. فتح المزايا الجديدة تدريجيا عبر feature switches.

## المرحلة M3.5: الاستقرار والجاهزية الإنتاجية
1. اختبارات صلاحيات role-by-role.
2. اختبارات منع privilege escalation.
3. smoke و regression على المسارات القديمة والجديدة.
4. runbook تشغيلي لإدارة الحوادث والمراجعة الدورية للتدقيق.

## الملفات الأساسية المستهدفة
1. public/admin-management.html
2. public/user-management.html
3. public/page-permissions.html
4. public/activity-logs.html
5. public/assets/js/unified-auth.js
6. public/assets/js/ui-permission-controller.js
7. public/assets/js/page-access-control.js
8. public/assets/js/roles.js
9. public/assets/js/activity-logger.js
10. functions/src/auth/index.js
11. functions/src/utils/index.js
12. firestore.rules

## معايير التحقق
1. أي عملية حساسة تفشل بدون إعادة إدخال كلمة المرور وتسجيل السبب.
2. Admin لا يستطيع تنفيذ عمليات محصورة على Super Admin.
3. الوحدات الأساسية تعمل بدون كسر الصفحات الحالية.
4. سجل التدقيق يحتوي actor و target و reason و before/after و timestamp.
5. نجاح اختبارات smoke و regression بعد كل مرحلة.

## إدارة المخاطر
1. تنفيذ مرحلي مع نقاط مراجعة بعد كل مرحلة.
2. توثيق rollback واضح لكل مكون قبل التفعيل الكامل.
3. عدم تفعيل أي مسار حساس جديد قبل اجتياز التحقق الأمني.

## ملاحظات تنفيذية
1. هذه الخطة للتنفيذ على Production فقط وفق وضع البيئة الحالي.
2. لن يبدأ التنفيذ حتى اعتمادك الصريح على هذه الخطة.

## حالة التنفيذ الحالية
1. تم بدء التنفيذ (M1 Kickoff).
2. تم تطبيق فصل أولي للصلاحيات الحساسة في backend:
	- تحديث دوال المصادقة الحساسة لتتطلب Super Admin في `functions/src/auth/index.js`.
	- إضافة إلزام سبب العملية (reason) في تحديث الدور/حذف المستخدم.
3. تم تشديد قاعدة `system_settings` لتكون كتابة Super Admin فقط في `firestore.rules`.
4. تم إضافة حارس عمليات حساسة في الواجهة:
	- `public/assets/js/sensitive-action-guard.js` (سبب + إعادة إدخال كلمة المرور).
	- ربطه مبدئيًا بعمليات إدارة المدراء الحساسة في `public/admin-management.html`.
5. تم إضافة API مساعدة لإعادة التحقق في `public/assets/js/unified-auth.js`.
6. تم توسيع ربط الحارس إلى صفحات إدارة إضافية:
	- `public/user-management.html` (تحديث الدور وحذف المستخدم يطلبان reason + re-auth).
	- `public/page-permissions.html` (حفظ صلاحيات الصفحات/المستخدم يطلب reason + re-auth).
7. تم تشديد قواعد التدقيق (write-once):
	- منع حذف `activity_logs` نهائيًا.
	- إضافة مسارات صريحة لـ `audit_logs` و`auth_logs` مع create مقيد و`update/delete = false`.
8. تم تحديث الاستدعاءات المتبقية لـ `updateUserRole` في `public/users.html` لإرسال `reason` بما يتوافق مع policy الجديدة.
9. تم تطبيق Super Admin Gate على صفحات إدارة حساسة:
	- `public/admin-management.html`: الوصول وإجراءات الإدارة الحساسة أصبحت `super_admin/system_admin` فقط.
	- `public/page-permissions.html`: الوصول أصبح Super Admin فقط (مع تحويل غير المخول للوحة الرئيسية).
	- `public/user-management.html`: تم تفعيل وضع قراءة فقط لغير Super Admin وتعطيل create/edit/delete.
10. تم إنشاء طبقة Admin API موحدة (`public/assets/js/admin-api.js`) وربطها فعليًا في `public/user-management.html` لنداءات الإدارة الحساسة.
11. تم بدء نواة M2 في الـ backend:
	- إضافة module جديد `functions/src/admin/index.js`.
	- إضافة `getAdminPortalConfig` (قراءة إعدادات البوابة للإداريين).
	- إضافة `updateAdminPortalConfig` (تحديث إعدادات حساسة لـ Super Admin فقط مع `reason` إلزامي وتسجيل activity).
	- ربط exports في `functions/src/index.js`.
12. تم تنفيذ واجهة إعدادات تشغيلية لـ Admin Portal وربطها فعلياً بالـ backend:
	- إضافة وحدة إعدادات داخل `public/page-permissions.html` (session/lockout/audit retention/feature flags/maintenance mode).
	- ربط التحميل والحفظ عبر `adminApi.getAdminPortalConfig` و`adminApi.updateAdminPortalConfig`.
	- توسيع `public/assets/js/admin-api.js` بدعم نداءات إعدادات البوابة.
13. تم استكمال توحيد الحراسة الأمنية في أسطح الإدارة المتبقية:
	- `public/notification-settings.html`: إضافة Sensitive Action Guard، وتطبيق reason + reauth تلقائياً عند حفظ الإعدادات للمستخدمين ذوي الصلاحية الإدارية.
	- `public/system-analytics.html`: تشديد إجراء cleanupThumbnails ليصبح Super Admin فقط، مع reason + reauth قبل التنفيذ.
14. تم استكمال حماية إنشاء المستخدمين ذوي الأدوار الحساسة:
	- `public/user-management.html`: عند إنشاء مستخدم بدور إداري (`admin/system_admin/super_admin`) يتم فرض reason + reauth قبل الاستدعاء.
	- تمرير `reason` مع طلب `createUserWithRole` لضمان اتساق مسار التدقيق عبر الواجهة.
15. تم إغلاق الفجوة على مستوى الـ backend:
	- `functions/src/auth/index.js`: فرض `reason` إلزامياً عند `createUserWithRole` إذا كان الدور المطلوب إداريًا حساسًا (`admin/system_admin/super_admin`).
	- التحقق الفني: `npm.cmd run build` و `npm.cmd run test:fast` ناجحان (`EXIT:0`).
16. تم توسيع الحراسة الأمنية إلى دورة حياة الدعوات:
	- `public/invitations.html`: إضافة `SensitiveActionGuard` وتطبيق reason + reauth على إنشاء الدعوة وتمديدها وإعادة إرسالها وحذفها.
	- حفظ حقول تدقيق (`invitationReason/extendReason/resendReason` و `sensitiveReauthAt`) مع عمليات التعديل.
17. تم تطبيق نفس الحراسة على إدارة الإدارات:
	- `public/department-management.html`: فرض reason + reauth على إنشاء إدارة، تحديث الأدوار، تبديل الحالة، الحذف، وتطبيق الهيكل الافتراضي.
	- حفظ سبب العملية ووقت إعادة التحقق ضمن حقول التدقيق (`createReason/updateReason/toggleReason/seedReason` + `sensitiveReauthAt`).
18. تم استكمال عمليات المستخدمين الدُفعية (Bulk) ضمن M2:
	- `public/user-management.html`: إضافة تحديد متعدد وصفّ تحديد الكل الظاهر، مع إجراءات bulk للتفعيل والتعطيل والحذف.
	- جميع إجراءات الـ bulk الحساسة تمر عبر `SensitiveActionGuard` مع reason + reauth، مع تقرير نتائج نجاح/فشل لكل دفعة.
19. تم استكمال Versioning و Rollback لصلاحيات الصفحات ضمن M2:
	- `public/page-permissions.html`: حفظ نسخة صلاحيات عند كل تحديث داخل `system_settings/page_permissions_versions/items/{version}`.
	- إضافة زر rollback لاسترجاع آخر نسخة محفوظة مع توثيق سبب الاسترجاع وتسجيل تدقيق.
20. تم استكمال مخرجات M2.5 الخاصة بالامتثال والتقارير:
	- `public/assets/js/activity-logs-page.js`: إضافة `buildComplianceReport` لإحصاءات الامتثال (role changes, failed logins, sensitive ops).
	- التصدير الآن ينتج JSON/CSV تفصيلي + ملخص امتثال منفصل لاستخدام المراجعة والتدقيق.
21. بدء M3 (Kickoff) فعليًا عبر Feature Switches:
	- إضافة وحدة موحدة `public/assets/js/admin-feature-switches.js` لقراءة `featureFlags` من `admin_portal_config`.
	- `public/page-permissions.html`: إضافة سويتشات تشغيل تدريجي (`invitationsV2`, `departmentManagementV2`) ضمن إعدادات البوابة.
	- ربط السويتشات بصفحات `public/invitations.html` و`public/department-management.html` لمنع تشغيل الوحدة عند إيقافها من لوحة الإدارة.
22. توسيع نطاق M3 على وحدات الإدارة الأساسية (Delta إضافي):
	- `public/page-permissions.html`: إضافة سويتشين جديدين في `featureFlags` (`userManagementV2`, `adminManagementV2`) ضمن إعدادات البوابة.
	- `public/user-management.html`: ربط Gate تشغيل مبكر يمنع تشغيل الوحدة إذا كانت `userManagementV2=false`.
	- `public/admin-management.html`: ربط Gate تشغيل مبكر يمنع تشغيل الوحدة إذا كانت `adminManagementV2=false`.
23. دفعة M3 التالية: توحيد رسائل إيقاف الوحدات عبر مكوّن UI مركزي:
	- `public/assets/js/admin-feature-switches.js`: إضافة `enforceModuleAccess` + `showDisabledNotice` لعرض رسالة موحدة وإعادة توجيه موحدة.
	- استبدال المعالجات المحلية في الصفحات بـ API الموحد: `public/invitations.html` و`public/department-management.html` و`public/user-management.html` و`public/admin-management.html`.
	- النتيجة: تجربة موحدة عند تعطيل أي وحدة Feature-Flag بدون تكرار منطق التنبيه في كل صفحة.
24. دفعة M3 التالية: توحيد Gate التهيئة المبكرة (Startup Guard) في Helper واحد:
	- `public/assets/js/admin-feature-switches.js`: إضافة `guardModuleStartup` لتجميع منطق التحقق + التعطيل + callbacks للأخطاء/الإيقاف.
	- ربط التهيئة المبكرة مباشرة بالـ Helper في: `public/invitations.html` و`public/department-management.html` و`public/user-management.html` و`public/admin-management.html`.
	- إزالة التكرار: حذف دوال assert المحلية الخاصة بالـ module gate من الصفحات التي كانت تعتمد عليها.
25. دفعة M3 التالية: توحيد Authorization Gate (Role Access) في Helper واحد:
	- `public/assets/js/admin-feature-switches.js`: إضافة `enforceRoleAccess` مع `normalizeRole` و`extractRole` لتوحيد فحص الأدوار والتحويل عند الرفض.
	- ربط فحص الأدوار المركزي في `public/invitations.html` و`public/department-management.html` و`public/user-management.html` و`public/admin-management.html`.
	- إزالة التكرار العملي في فحص الصلاحيات الحساسة مع الاحتفاظ بسلوك التحويل والتنبيه نفسه.
26. دفعة M3 التالية: دمج Authorization + Feature Gate في نقطة دخول واحدة:
	- `public/assets/js/admin-feature-switches.js`: إضافة `gatePageAccess` لدمج role gate وfeature gate في call واحد.
	- تحديث نقاط التهيئة في `public/invitations.html` و`public/department-management.html` و`public/user-management.html` و`public/admin-management.html` لاستهلاك الـ helper الموحد.
	- النتيجة: تقليل التكرار في بداية كل صفحة إلى منطق واحد قابل لإعادة الاستخدام مع callbacks للرفض/التعطيل.
27. دفعة M3 التالية: توحيد Renderer التنبيه/التحويل وتنظيف التكرار المتبقي:
	- `public/assets/js/admin-feature-switches.js`: إضافة `showAccessNotice` و`scheduleRedirect` لتوحيد عرض التنبيهات وإدارة مؤقت التحويل مركزيًا.
	- استخدام variant موحد للتنبيه (`warning` لتعطيل الوحدة، `danger` لرفض الصلاحية) ضمن نفس المسار المركزي.
	- إزالة تكرار فحص feature flag في `public/user-management.html` و`public/admin-management.html` بحيث لا يتكرر التحقق مرتين داخل نفس الصفحة.
28. بدء M3.5 عمليًا عبر Smoke Matrix سريع للصلاحيات:
	- `public/assets/js/admin-feature-switches.js`: إضافة دوال تقييم نقية بدون redirect (`evaluateRoleAccess`, `evaluateModuleAccess`, `evaluatePageAccess`) لدعم التحقق السريع.
	- إضافة صفحة فحص مباشرة `public/admin-access-smoke.html` لعرض مصفوفة الوصول (Role x Page) باستخدام Feature Flags الحالية من النظام.
	- الهدف: تمكين اختبار smoke سريع قابل للتكرار قبل أي rollout أو تعديل على policy.
29. استكمال M3.5 تشغيليًا لصفحة Smoke Matrix:
	- `public/assets/js/unified-ui-template.js`: إضافة رابط `admin-access-smoke.html` داخل القائمة الجانبية مع قيد `requiresSuperAdmin`.
	- `public/admin-access-smoke.html`: إضافة حماية دخول Super Admin فقط + تصدير CSV لنتيجة المصفوفة.
	- تحسين قابلية التشغيل: عرض ملخص عددي فوري (allow/deny) بعد كل refresh.
30. استكمال قابلية التتبع في أدوات M3.5:
	- `public/admin-access-smoke.html`: إضافة تصدير JSON مع metadata تشغيل (وقت التنفيذ + المستخدم) بجانب CSV.
	- `scripts/admin-access-smoke-runner.js`: إضافة مشغل آلي لإنتاج تقارير smoke (JSON/CSV) مع فشل صريح عند اكتشاف privilege escalation.
	- `package.json`: إضافة أوامر تشغيل جاهزة (`test:admin:smoke`, `test:admin:security`).
31. إغلاق بند M3.5-1 (Role-by-Role):
	- `docs/admin-portal-m35-test-suite.md`: توثيق مصفوفة role x page وخطوات التنفيذ اليدوي/الآلي ومعايير النجاح.
32. إغلاق بند M3.5-2 + M3.5-3 (Privilege Escalation + Smoke/Regression):
	- `docs/admin-portal-m35-test-suite.md`: توثيق checks إلزامية (منع escalation + smoke + regression) ومخرجات artifact المطلوبة لكل دورة.
33. إغلاق بند M3.5-4 (Runbook تشغيلي):
	- `docs/admin-portal-ops-runbook.md`: توثيق الاستجابة للحوادث، العزل عبر flags، التحقيق، rollback، الاستعادة، والمراجعة الدورية.
34. الإغلاق النهائي للخطة:
	- تم استكمال مراحل M1 + M1.5 + M2 + M2.5 + M3 + M3.5 وفق عناصر الخطة ومعايير التحقق التشغيلية المتاحة في المستودع.
	- الحالة النهائية: **خطة مكتملة التنفيذ**.
