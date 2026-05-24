# نظام التوجيه الذكي بناءً على الدور والإدارة
## Role-Based and Department-Based Routing System

تم إنشاء نظام توجيه ذكي يوجه المستخدمين تلقائياً إلى الداشبورد المناسب حسب دورهم وإدارتهم بعد تسجيل الدخول.

## الملفات الجديدة

### 1. `role-based-routing.js`
- **الموقع**: `public/assets/js/role-based-routing.js`
- **الوظيفة**: المحرك الأساسي لنظام التوجيه
- **الفئات**:
  - `RoleBasedRouter`: فئة التوجيه الرئيسية
  - دوال مساعدة للتوجيه والتحقق

### 2. `update-dashboards.ps1`
- **الموقع**: `update-dashboards.ps1`
- **الوظيفة**: سكريپت أتمتة لتحديث جميع الداشبوردات

## آلية العمل

### 1. تسجيل الدخول (login.html)
```javascript
// بعد نجاح تسجيل الدخول
const userData = await authSystem.getCurrentUserData();
await window.redirectToDashboard(userData);
```

### 2. التوجيه الذكي
- **مسؤول النظام (admin)** → `user-management.html`
- **إدارة الأرشيف** → `archive-dashboard.html`  
- **الإدارة القانونية** → `legal-dashboard.html`
- **إدارة الملفات** → `file-management-dashboard.html`
- **إدارة التحصيل** → `collection-dashboard.html`
- **تقنية المعلومات** → `dashboard.html`
- **افتراضي** → `dashboard.html`

### 3. الحماية والتحقق
- تحقق من صحة المصادقة
- تحقق من صلاحيات الصفحة
- إعادة توجيه غير المصرح لهم

## خريطة التوجيه

| الدور | الإدارة | الصفحة المستهدفة |
|-------|---------|------------------|
| `admin` | أي إدارة | `user-management.html` |
| أي دور | `archive` | `archive-dashboard.html` |
| أي دور | `legal` | `legal-dashboard.html` |
| أي دور | `file-management` | `file-management-dashboard.html` |
| أي دور | `collection` | `collection-dashboard.html` |
| أي دور | `it` | `dashboard.html` |

## التحديثات المطبقة

### الصفحات المحدثة:
- ✅ `login.html` - إضافة التوجيه الذكي
- ✅ `dashboard.html` - إضافة فحص التوجيه
- ✅ `user-management.html` - حماية المسؤولين فقط
- ✅ `archive-dashboard.html` - إضافة نظام التوجيه
- ✅ `legal-dashboard.html` - إضافة نظام التوجيه
- ✅ `file-management-dashboard.html` - إضافة نظام التوجيه
- ✅ `collection-dashboard.html` - إضافة نظام التوجيه

### unified-auth.js:
- ✅ إضافة دالة `redirectToDashboard()`
- ✅ إضافة دالة `redirectAfterLogin()`
- ✅ إضافة التوجيه البسيط كـ fallback

## كيفية الاستخدام

### للمطورين:
```javascript
// التوجيه اليدوي
window.redirectToDashboard(userData);

// إضافة مسار جديد
window.roleBasedRouter.addRoute('new-dept', {
    defaultDashboard: 'new-dashboard.html',
    roles: {
        'admin': 'new-admin-dashboard.html',
        'viewer': 'new-viewer-dashboard.html'
    }
});
```

### لإضافة إدارة جديدة:
1. أضف الإدارة في `routes` في `role-based-routing.js`
2. حدّث `normalizeDepartmentName()` للأسماء العربية
3. أنشئ صفحة الداشبورد الجديدة

## الميزات

### ✅ المطبقة:
- توجيه ذكي بناءً على الدور والإدارة
- حماية الصفحات حسب الصلاحيات
- دعم اللغة العربية في أسماء الإدارات
- نظام fallback للتوجيه البسيط
- تسجيل العمليات للمراقبة
- دعم Google Analytics للتتبع

### 🔄 قيد التطوير:
- واجهة إدارة المسارات
- تخصيص المسارات حسب المشروع
- إشعارات التوجيه للمستخدم

## الاختبار

### سيناريوهات الاختبار:
1. **مسؤول النظام**: يجب أن يذهب لـ `user-management.html`
2. **موظف أرشيف**: يجب أن يذهب لـ `archive-dashboard.html`
3. **موظف قانوني**: يجب أن يذهب لـ `legal-dashboard.html`
4. **مستخدم غير مصرح**: يجب إعادة توجيهه للصفحة المناسبة

### كيفية الاختبار:
1. سجل دخول بحسابات مختلفة
2. راقب console للتأكد من التوجيه
3. تأكد من وصول المستخدم للصفحة الصحيحة

## الصيانة

### رسائل Console:
- `🚀 تفعيل التوجيه الذكي بناءً على الدور`
- `✅ توجيه حسب معرف الإدارة والدور`
- `📊 سجل التوجيه`

### ملفات المراقبة:
- جميع عمليات التوجيه مسجلة في Console
- دعم Google Analytics للتحليلات المتقدمة