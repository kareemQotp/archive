# نظام المصادقة الموحد - دليل التطوير
# Unified Authentication System - Developer Guide

## نظرة عامة

نظام المصادقة الموحد يوفر حلاً شاملاً لإدارة المصادقة والصلاحيات في نظام الأرشيف. يجمع جميع وظائف المصادقة في مكان واحد مع دعم متقدم للصلاحيات والأدوار.

## المكونات الرئيسية

### 1. نظام المصادقة الموحد (`unified-auth.js`)
```javascript
// إنشاء مثيل عالمي
const unifiedAuth = new UnifiedAuth();

// استخدام الدوال الأساسية
await unifiedAuth.signIn(email, password);
await unifiedAuth.signOut();
await unifiedAuth.resetPassword(email);
```

### 2. وحدة التحكم في واجهة المستخدم (`ui-permission-controller.js`)
```javascript
// تحكم تلقائي في الواجهة بناءً على الصلاحيات
const uiController = new UIPermissionController(unifiedAuth);
uiController.initialize();
```

### 3. أنماط CSS للصلاحيات (`permissions.css`)
```css
/* إخفاء العناصر المحظورة */
.permission-denied {
    opacity: 0.5;
    pointer-events: none;
}
```

## الاستخدام الأساسي

### 1. تضمين الملفات
```html
<!-- Firebase -->
<script src="assets/js/firebase-init.js"></script>

<!-- نظام المصادقة الموحد -->
<script src="assets/js/unified-auth.js"></script>

<!-- وحدة التحكم في الواجهة -->
<script src="assets/js/ui-permission-controller.js"></script>

<!-- أنماط الصلاحيات -->
<link rel="stylesheet" href="assets/css/permissions.css">
```

### 2. حماية الصفحات
```javascript
// في بداية كل صفحة محمية
document.addEventListener('DOMContentLoaded', () => {
    if (!unifiedAuth.requireAuth()) {
        return; // سيتم إعادة التوجيه تلقائياً
    }
});
```

### 3. فحص الصلاحيات
```javascript
// فحص صلاحية واحدة
if (unifiedAuth.hasPermission('files.edit')) {
    // إظهار زر التعديل
}

// فحص صلاحيات متعددة
if (unifiedAuth.hasAnyPermission(['files.edit', 'files.delete'])) {
    // إظهار أزرار الإدارة
}

// فحص الأدوار
if (unifiedAuth.hasRole('admin')) {
    // إظهار لوحة الإدارة
}
```

## النظام الهرمي للصلاحيات

### الأدوار المدعومة
1. **admin** - مدير النظام (جميع الصلاحيات)
2. **manager** - مدير (صلاحيات إدارية محدودة)
3. **employee** - موظف (صلاحيات أساسية)
4. **viewer** - مستعرض (عرض فقط)

### الصلاحيات المتاحة
```javascript
const permissions = {
    // صلاحيات الملفات
    'files.view': 'عرض الملفات',
    'files.create': 'إنشاء ملفات',
    'files.edit': 'تعديل الملفات',
    'files.delete': 'حذف الملفات',
    
    // صلاحيات المستخدمين
    'users.view': 'عرض المستخدمين',
    'users.create': 'إنشاء مستخدمين',
    'users.edit': 'تعديل المستخدمين',
    'users.delete': 'حذف المستخدمين',
    
    // صلاحيات النظام
    'system.admin': 'إدارة النظام',
    'reports.view': 'عرض التقارير',
    'scanner.access': 'استخدام الماسح الضوئي',
    'invitations.manage': 'إدارة الدعوات',
    'roles.manage': 'إدارة الأدوار'
};
```

## التحكم في واجهة المستخدم

### 1. إخفاء العناصر بناءً على الصلاحيات
```html
<!-- سيتم إخفاء هذا الزر تلقائياً إذا لم تكن لديك صلاحية files.delete -->
<button class="btn btn-danger" data-permission="files.delete">
    حذف الملف
</button>
```

### 2. عرض المحتوى بناءً على الأدوار
```html
<!-- يظهر فقط للمديرين -->
<div data-role="admin,manager">
    محتوى إداري
</div>

<!-- يظهر لجميع المستخدمين -->
<div data-role="any">
    محتوى عام
</div>
```

### 3. عرض معلومات المستخدم
```html
<!-- سيتم تحديث هذه العناصر تلقائياً -->
<span data-user-name></span>
<span data-user-email></span>
<span data-user-role></span>
<span data-user-department></span>
<img data-user-avatar src="" alt="صورة المستخدم">
```

## الأحداث والمراقبة

### 1. مراقبة تغيير حالة المصادقة
```javascript
unifiedAuth.onAuthStateChange((state, user) => {
    if (state === 'login') {
        console.log('تم تسجيل الدخول:', user.email);
    } else {
        console.log('تم تسجيل الخروج');
    }
});
```

### 2. مراقبة تغيير الصلاحيات
```javascript
unifiedAuth.onPermissionChange((permissions) => {
    console.log('الصلاحيات المحدثة:', permissions);
    updateNavigationMenu();
});
```

## إدارة الجلسات

### 1. فحص صلاحية الجلسة
```javascript
if (!unifiedAuth.isSessionValid()) {
    // انتهت صلاحية الجلسة
    unifiedAuth.signOut();
}
```

### 2. تتبع النشاط
```javascript
// يتم تتبع النشاط تلقائياً
// يمكن تخصيص مدة انتهاء الجلسة
unifiedAuth.sessionTimeout = 2 * 60 * 60 * 1000; // ساعتان
```

## الأمان والحماية

### 1. منع هجمات القوة الغاشمة
```javascript
// يتم قفل الحساب تلقائياً بعد 5 محاولات فاشلة
unifiedAuth.maxLoginAttempts = 5;
unifiedAuth.lockoutDuration = 15 * 60 * 1000; // 15 دقيقة
```

### 2. تسجيل أحداث المصادقة
```javascript
// يتم تسجيل جميع أحداث المصادقة في Firestore
// - تسجيل الدخول الناجح/الفاشل
// - تغيير كلمة المرور
// - إعادة تعيين كلمة المرور
// - تسجيل الخروج
```

## التخصيص والتوسع

### 1. إضافة صلاحيات جديدة
```javascript
// في loadUserPermissions()
const customPermissions = {
    'reports.advanced': ['admin'],
    'analytics.view': ['admin', 'manager'],
    'backup.create': ['admin']
};
```

### 2. إضافة أدوار جديدة
```javascript
// في loadUserPermissions()
const rolePermissions = {
    'super_admin': [...allPermissions],
    'department_head': ['files.view', 'files.edit', 'users.view'],
    'guest': ['files.view']
};
```

### 3. تخصيص واجهة المستخدم
```javascript
// تسجيل عناصر مخصصة
uiPermissionController.registerElement('#customButton', 'custom.permission', {
    hideMethod: 'remove',
    onShow: (element) => element.classList.add('btn-success'),
    onHide: (element) => element.classList.add('btn-disabled')
});
```

## اختبار النظام

### 1. تشغيل اختبارات شاملة
```javascript
// فتح صفحة الاختبار
window.location.href = 'unified-auth-test.html';
```

### 2. اختبارات برمجية
```javascript
// فحص التهيئة
console.assert(unifiedAuth.isInitialized, 'النظام غير مهيأ');

// فحص الصلاحيات
console.assert(unifiedAuth.hasPermission('files.view'), 'لا توجد صلاحية عرض');

// فحص الجلسة
console.assert(unifiedAuth.isSessionValid(), 'الجلسة غير صالحة');
```

## استكشاف الأخطاء

### 1. أخطاء شائعة
```javascript
// خطأ: Firebase غير محمل
// الحل: تأكد من تحميل firebase-init.js أولاً

// خطأ: المستخدم غير مصادق عليه
// الحل: استخدم requireAuth() في بداية الصفحة

// خطأ: الصلاحيات غير محملة
// الحل: تأكد من وجود ملف المستخدم في Firestore
```

### 2. تسجيل التشخيص
```javascript
// تفعيل التسجيل المفصل
unifiedAuth.debug = true;

// عرض معلومات التشخيص
console.log('حالة المصادقة:', unifiedAuth.isAuthenticated);
console.log('الصلاحيات:', unifiedAuth.userPermissions);
console.log('ملف المستخدم:', unifiedAuth.profile);
```

## الهجرة من النظام القديم

### 1. استبدال الدوال القديمة
```javascript
// القديم
requireAuth();
logout();

// الجديد - نفس الوظيفة مع ميزات إضافية
unifiedAuth.requireAuth();
unifiedAuth.signOut();
```

### 2. تحديث ملفات HTML
```html
<!-- استبدال المراجع القديمة -->
<!-- القديم -->
<script src="assets/js/auth.js"></script>

<!-- الجديد -->
<script src="assets/js/unified-auth.js"></script>
<script src="assets/js/ui-permission-controller.js"></script>
<link rel="stylesheet" href="assets/css/permissions.css">
```

## الأداء والتحسين

### 1. تحسين الذاكرة
```javascript
// تنظيف المراقبين عند عدم الحاجة
unifiedAuth.authStateListeners = [];
unifiedAuth.permissionChangeListeners = [];
```

### 2. تحسين الشبكة
```javascript
// تخزين مؤقت للصلاحيات
localStorage.setItem('userPermissions', JSON.stringify(permissions));
```

## الدعم والمساعدة

للحصول على المساعدة أو الإبلاغ عن المشاكل:
1. راجع ملف `unified-auth-test.html` للاختبارات
2. تحقق من وحدة التحكم للأخطاء
3. استخدم وضع التشخيص المفصل

---

تم تطوير هذا النظام ليكون مرناً وقابلاً للتوسع مع الحفاظ على الأمان والأداء العالي.
