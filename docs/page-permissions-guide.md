# دليل نظام صلاحيات الصفحات - نظام الأرشيف

## نظرة عامة
نظام شامل لإدارة صلاحيات الوصول للصفحات في نظام الأرشيف يتيح التحكم الدقيق في ما يمكن لكل مستخدم الوصول إليه.

## الملفات الأساسية

### 1. `page-permissions.html`
صفحة إدارة صلاحيات الصفحات للمدراء
```html
<!-- يتيح للمدراء: -->
- عرض مصفوفة الصلاحيات لجميع الصفحات
- تحديد الصفحات المتاحة لكل دور مستخدم
- إضافة صفحات جديدة للنظام
- حذف الصفحات المخصصة
- حفظ الإعدادات في قاعدة البيانات
```

### 2. `assets/js/page-permissions.js`
مدير صلاحيات الصفحات الأساسي
```javascript
class PagePermissionsManager {
    // تحميل الصلاحيات من قاعدة البيانات
    async loadPermissions()
    
    // التحقق من صلاحية الوصول
    hasPageAccess(pageId, userRole)
    
    // الحصول على الصفحات المتاحة
    getAvailablePages(userRole)
    
    // إنشاء عناصر القائمة الجانبية
    generateSidebarItems(userRole)
}
```

### 3. `assets/js/page-access-control.js`
middleware للتحكم في الوصول للصفحات
```javascript
class PageAccessControl {
    // التحقق من المصادقة والصلاحيات
    checkPageAccess()
    
    // التعامل مع الوصول غير المصرح
    handleUnauthorizedAccess()
    
    // فلترة عناصر الصفحة
    filterPageElements()
}
```

## كيفية الاستخدام

### إعداد صفحة جديدة
لإضافة صفحة جديدة للنظام:

1. **إضافة الصفحة في page-permissions.html:**
```javascript
// في صفحة إدارة الصلاحيات
{
    name: 'اسم الصفحة',
    path: 'page-name.html',
    icon: 'fas fa-icon',
    description: 'وصف الصفحة',
    category: 'files', // main, files, tools, reports, admin, user
    permissions: {
        admin: true,
        manager: true,
        employee: false,
        viewer: false
    }
}
```

2. **تضمين ملفات JavaScript في الصفحة:**
```html
<!-- في أعلى الصفحة -->
<script src="assets/js/page-permissions.js"></script>
<script src="assets/js/page-access-control.js"></script>
<script src="assets/js/sidebar.js"></script>
```

3. **إضافة التحقق من الصلاحيات:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من الوصول للصفحة
    if (!pageAccessControl.hasPagePermission()) {
        return; // سيتم إعادة التوجيه تلقائياً
    }
    
    // كود تهيئة الصفحة هنا
});
```

### استخدام الصلاحيات في HTML

#### إخفاء عناصر حسب الدور:
```html
<!-- عنصر للمدراء فقط -->
<button data-role-permission="admin" class="btn btn-danger">
    حذف المستخدم
</button>

<!-- عنصر للمدراء والمديرين -->
<div data-role-permission="admin,manager">
    محتوى خاص
</div>
```

#### إخفاء عناصر حسب صلاحيات الصفحات:
```html
<!-- رابط يظهر فقط إذا كان للمستخدم صلاحية لصفحة التقارير -->
<a href="reports.html" data-page-permission="reports">
    التقارير
</a>
```

#### إخفاء عناصر حسب الإجراءات:
```html
<!-- زر يظهر فقط لمن لديه صلاحية الحذف -->
<button data-action-permission="delete" class="btn btn-danger">
    حذف
</button>

<!-- زر يظهر فقط لمن لديه صلاحية إدارة المستخدمين -->
<button data-action-permission="manage_users" class="btn btn-primary">
    إدارة المستخدمين
</button>
```

### استخدام الصلاحيات في JavaScript

#### التحقق من دور المستخدم:
```javascript
const userRole = getCurrentUserRole();
if (userRole === 'admin') {
    // كود خاص بالمدراء
}
```

#### التحقق من صلاحية الوصول لصفحة:
```javascript
if (canAccessPage('user-management')) {
    // المستخدم يمكنه الوصول لصفحة إدارة المستخدمين
    showUserManagementButton();
}
```

#### التحقق من المصادقة:
```javascript
if (isUserAuthenticated()) {
    // المستخدم مسجل الدخول
    showUserMenu();
} else {
    // المستخدم غير مسجل
    showLoginButton();
}
```

#### الحصول على الصفحات المتاحة:
```javascript
const availablePages = getAvailablePages();
console.log('الصفحات المتاحة:', availablePages);

// أو لدور معين
const adminPages = getAvailablePages('admin');
```

## بنية الأدوار

### الأدوار المتاحة:
```javascript
const USER_ROLES = {
    admin: 'مدير النظام',      // صلاحيات كاملة
    manager: 'مدير',           // صلاحيات إدارية محدودة
    employee: 'موظف',          // صلاحيات عمل أساسية
    viewer: 'مستعرض'           // صلاحيات قراءة فقط
};
```

### مصفوفة الصلاحيات الافتراضية:

| الصفحة | admin | manager | employee | viewer |
|---------|-------|---------|----------|--------|
| لوحة التحكم | ✅ | ✅ | ✅ | ✅ |
| رفع الملفات | ✅ | ✅ | ✅ | ❌ |
| البحث | ✅ | ✅ | ✅ | ✅ |
| تتبع الملفات | ✅ | ✅ | ✅ | ✅ |
| إدارة المستخدمين | ✅ | ❌ | ❌ | ❌ |
| التقارير | ✅ | ✅ | ❌ | ❌ |
| إعدادات النظام | ✅ | ❌ | ❌ | ❌ |

## إدارة القائمة الجانبية

### تحديث تلقائي:
```javascript
// القائمة الجانبية تُحدث تلقائياً حسب الصلاحيات
const sidebarManager = new SidebarManager();
sidebarManager.updateSidebarNav(true, userRole);
```

### تجميع الصفحات بالفئات:
```javascript
const categories = {
    main: 'الرئيسية',
    files: 'إدارة الملفات', 
    tools: 'الأدوات',
    reports: 'التقارير',
    admin: 'الإدارة',
    user: 'المستخدم'
};
```

## التخصيص المتقدم

### إضافة فئة جديدة:
```javascript
// في page-permissions.js
const categoryNames = {
    main: 'الرئيسية',
    files: 'إدارة الملفات',
    tools: 'الأدوات',
    reports: 'التقارير',
    admin: 'الإدارة',
    user: 'المستخدم',
    custom: 'فئة مخصصة' // إضافة جديدة
};
```

### إضافة صلاحية إجراء جديدة:
```javascript
// في page-access-control.js
const actionPermissions = {
    'create': ['admin', 'manager', 'employee'],
    'edit': ['admin', 'manager', 'employee'],
    'delete': ['admin', 'manager'],
    'manage_users': ['admin'],
    'view_reports': ['admin', 'manager'],
    'export_data': ['admin', 'manager'],
    'custom_action': ['admin'] // إضافة جديدة
};
```

### التحقق المخصص:
```javascript
// في أي صفحة
function customPermissionCheck() {
    const userRole = getCurrentUserRole();
    const hasCustomAccess = /* منطق التحقق المخصص */;
    
    if (!hasCustomAccess) {
        showAccessDeniedMessage();
        return false;
    }
    return true;
}
```

## قاعدة البيانات

### بنية تخزين الصلاحيات:
```javascript
// في Firestore: system_settings/page_permissions
{
    pages: {
        'dashboard': {
            name: 'لوحة التحكم',
            path: 'dashboard.html',
            icon: 'fas fa-tachometer-alt',
            description: 'الصفحة الرئيسية للنظام',
            category: 'main',
            permissions: {
                admin: true,
                manager: true,
                employee: true,
                viewer: true
            }
        },
        // ... باقي الصفحات
    },
    lastUpdated: timestamp,
    updatedBy: userId
}
```

### تحديث الصلاحيات:
```javascript
// حفظ تلقائي عند التغيير
await db.collection('system_settings').doc('page_permissions').set({
    pages: pagePermissions,
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: currentUser.uid
});
```

## أمثلة التطبيق

### 1. صفحة خاصة بالمدراء فقط:
```html
<!DOCTYPE html>
<html>
<head>
    <title>إدارة النظام</title>
    <script src="assets/js/page-permissions.js"></script>
    <script src="assets/js/page-access-control.js"></script>
</head>
<body>
    <div class="container">
        <h1>إدارة النظام</h1>
        
        <!-- محتوى للمدراء فقط -->
        <div data-role-permission="admin">
            <button class="btn btn-danger">إعادة تعيين النظام</button>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // التحقق التلقائي من الصلاحيات
        // لا حاجة لكود إضافي - سيتم التحقق تلقائياً
    });
    </script>
</body>
</html>
```

### 2. صفحة مشتركة مع عناصر مشروطة:
```html
<div class="dashboard">
    <h1>لوحة التحكم</h1>
    
    <!-- للجميع -->
    <div class="stats-cards">
        <div class="card">إحصائيات عامة</div>
    </div>
    
    <!-- للمدراء والمديرين فقط -->
    <div data-role-permission="admin,manager" class="admin-section">
        <h3>قسم الإدارة</h3>
        <button data-action-permission="manage_users">إدارة المستخدمين</button>
    </div>
    
    <!-- للمدراء فقط -->
    <div data-role-permission="admin" class="super-admin-section">
        <h3>إعدادات النظام</h3>
        <a href="page-permissions.html" data-page-permission="page-permissions">
            إدارة الصلاحيات
        </a>
    </div>
</div>
```

## استكشاف الأخطاء

### مشاكل شائعة:

1. **الصفحة لا تحمل الصلاحيات:**
```javascript
// التحقق من تحميل الملفات
console.log('PagePermissionsManager:', window.pagePermissionsManager);
console.log('PageAccessControl:', window.pageAccessControl);
```

2. **المستخدم يُعاد توجيهه بشكل خاطئ:**
```javascript
// التحقق من الدور والصلاحيات
console.log('User Role:', getCurrentUserRole());
console.log('Is Authenticated:', isUserAuthenticated());
console.log('Can Access Page:', canAccessPage('current-page'));
```

3. **العناصر لا تُخفى بشكل صحيح:**
```javascript
// التحقق من تطبيق الفلترة
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        pageAccessControl.filterPageElements();
    }, 1000);
});
```

## الصيانة والتحديث

### إضافة صفحة جديدة:
1. إضافة الصفحة في `page-permissions.html`
2. تحديد الصلاحيات الافتراضية
3. تضمين ملفات JavaScript
4. اختبار الوصول لجميع الأدوار

### تحديث صلاحيات موجودة:
1. الدخول لصفحة إدارة الصلاحيات
2. تحديث المصفوفة
3. حفظ التغييرات
4. التحقق من التحديث في قاعدة البيانات

### النسخ الاحتياطي:
```javascript
// تصدير الصلاحيات الحالية
const permissions = window.pagePermissionsManager.getAllPermissions();
console.log('نسخة احتياطية:', JSON.stringify(permissions, null, 2));
```

---

## خلاصة النظام

🎯 **الهدف**: تحكم دقيق ومرن في صلاحيات الوصول للصفحات

✅ **المميزات**:
- إدارة مرئية للصلاحيات
- تحكم تلقائي في القائمة الجانبية  
- فلترة عناصر الصفحة
- حماية من الوصول غير المصرح
- تخزين دائم في قاعدة البيانات
- واجهة سهلة للمدراء

🔧 **التطبيق**:
- تضمين 3 ملفات JavaScript
- إضافة attributes للعناصر المشروطة
- إعداد الصلاحيات من صفحة الإدارة

🛡️ **الأمان**:
- تحقق متعدد المستويات
- إعادة توجيه تلقائية
- تسجيل العمليات
- واجهة محمية للإعدادات

---
*تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}*
*الإصدار: 1.0 - نظام صلاحيات الصفحات الشامل*
