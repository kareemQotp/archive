# دليل تشخيص مشاكل التوجيه - موظف الأرشيف

## المشكلة المحلولة
**المشكلة:** عندما يسجل موظف الأرشيف الدخول، يفتح archive-dashboard.html ثم يتم إعادة توجيهه إلى dashboard.html.

## السبب الجذري
كانت المشكلة في عدة نقاط:

1. **خطأ في فحص الصلاحيات في archive-dashboard.html**
   - استخدام `authSystem.userDepartment` غير الموجود
   - عدم التعرف على موظف الأرشيف بشكل صحيح

2. **نظام التوجيه الذكي يعيد التوجيه بشكل خاطئ**
   - موظف الأرشيف كان يوجه إلى dashboard.html بدلاً من archive-dashboard.html
   - عدم وجود آلية لمنع إعادة التوجيه من الصفحة الصحيحة

## الحلول المطبقة

### 1. إصلاح فحص الصلاحيات في archive-dashboard.html
```javascript
// قبل الإصلاح
const userDepartment = authSystem.userDepartment; // خاطئ

// بعد الإصلاح
const userDepartment = authSystem.userProfile?.department || authSystem.userProfile?.departmentId;
const isArchiveOfficer = userRole === 'archive-officer' || userRole === 'archive_officer';

// توسيع قائمة أسماء الإدارات المقبولة
const hasAccess = userDepartment === 'archive' || 
                userDepartment === 'إدارة الأرشيف' ||
                userDepartment === 'إدارة الأرشيف العام' ||
                userDepartment === 'أرشيف' ||
                userDepartment === 'الأرشيف' ||
                isArchiveOfficer ||
                isSystemAdmin ||
                userRole === 'admin' ||
                user.email?.includes('admin');
```

### 2. تحديث نظام التوجيه الذكي
```javascript
// في role-based-routing.js
this.defaultRoutes = {
    'admin': 'user-management.html',
    'archive-officer': 'archive-dashboard.html', // ← تم التصحيح
    'archive_officer': 'archive-dashboard.html', // ← إضافة بديل
    'department-admin': 'dashboard.html',
    'viewer': 'dashboard.html'
};
```

### 3. إضافة نظام منع إعادة التوجيه
```javascript
// في archive-dashboard.html
window.__DISABLE_AUTO_ROUTING__ = true; // منع التوجيه التلقائي

// في role-based-routing.js
if (window.__DISABLE_AUTO_ROUTING__) {
    console.log('🚫 التوجيه التلقائي معطل في هذه الصفحة');
    return;
}

// فحص عدم إعادة التوجيه إذا كان في الصفحة الصحيحة
if (currentPage === targetPage) {
    console.log('✅ المستخدم بالفعل في الصفحة الصحيحة');
    return;
}
```

### 4. إضافة خيار إلغاء إعادة التوجيه في dashboard.html
```javascript
// إعطاء المستخدم 3 ثواني لإلغاء إعادة التوجيه
const redirectTimer = setTimeout(() => {
    // إعادة التوجيه
}, 3000);

// إظهار تنبيه مع زر الإلغاء
showAlert(
    `سيتم توجيهك تلقائياً إلى لوحة تحكم ${userData.department} خلال 3 ثواني. 
    <button onclick="cancelRedirect()">البقاء هنا</button>`,
    'info'
);
```

## كيفية اختبار الحل

### للمطورين:
1. **فتح وحدة التحكم (F12)**
2. **تسجيل الدخول بحساب موظف أرشيف**
3. **مراقبة الرسائل في console:**
   ```
   🔍 فحص صلاحيات الوصول للأرشيف: {
     userDepartment: "archive",
     userRole: "archive-officer",
     isArchiveOfficer: true,
     ...
   }
   ✅ تم منح الوصول لإدارة الأرشيف
   ```

### للمستخدمين:
1. **تسجيل الدخول بحساب موظف أرشيف**
2. **يجب أن يفتح archive-dashboard.html ويبقى فيه**
3. **لا يجب أن يتم إعادة التوجيه إلى dashboard.html**

## أدوات التشخيص

### رسائل console للمتابعة:
- `🔍 فحص صلاحيات الوصول للأرشيف` - عرض بيانات المستخدم
- `✅ تم منح الوصول لإدارة الأرشيف` - نجح فحص الصلاحيات
- `🚫 التوجيه التلقائي معطل في هذه الصفحة` - منع إعادة التوجيه
- `✅ المستخدم بالفعل في الصفحة الصحيحة` - لا حاجة لإعادة توجيه

### في حالة استمرار المشكلة:
1. **فحص بيانات المستخدم في console**
2. **التأكد من أن role = "archive-officer"**
3. **التأكد من أن department يحتوي على "archive" أو "أرشيف"**
4. **فحص أن window.__DISABLE_AUTO_ROUTING__ = true في archive-dashboard**

## أنواع حسابات موظف الأرشيف المدعومة

### أدوار صالحة:
- `archive-officer`
- `archive_officer`
- `admin` (مع إدارة أرشيف)

### أسماء إدارات صالحة:
- `archive`
- `إدارة الأرشيف`
- `إدارة الأرشيف العام`
- `أرشيف`
- `الأرشيف`

### بريد إلكتروني:
- أي بريد يحتوي على `admin`

## تاريخ الإصلاح
- **التاريخ:** 2025-09-07
- **الملفات المحدثة:**
  - `public/archive-dashboard.html`
  - `public/assets/js/role-based-routing.js`
  - `public/dashboard.html`
- **نوع الإصلاح:** إصلاح شامل لنظام التوجيه والصلاحيات