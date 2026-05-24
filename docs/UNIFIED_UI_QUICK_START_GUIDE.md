# دليل النظام الموحد للواجهة - Quick Start Guide

## 🚀 البدء السريع

### 1. تطبيق النظام على صفحة جديدة

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <!-- CSS الأساسي -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- النظام الموحد -->
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/unified-sidebar.css">
</head>
<body>
    <!-- Navbar موحد -->
    <nav class="navbar navbar-expand-lg">
        <div class="container">
            <div class="d-flex align-items-center">
                <button class="menu-toggle me-3" id="menuToggle" title="فتح القائمة">
                    <i class="fas fa-bars"></i>
                </button>
                <a class="navbar-brand" href="index.html">
                    <i class="fas fa-archive me-2"></i>
                    نظام الأرشيف
                </a>
            </div>
            <div class="navbar-nav ms-auto">
                <span class="navbar-text me-3" id="userInfo"></span>
                <button class="btn btn-outline-danger btn-sm" onclick="logout()">
                    <i class="fas fa-sign-out-alt me-1"></i>
                    خروج
                </button>
            </div>
        </div>
    </nav>

    <!-- Sidebar موحد -->
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="sidebar" id="sidebar" aria-hidden="true">
        <div class="sidebar-header">
            <div class="d-flex align-items-center">
                <div class="logo">
                    <i class="fas fa-[PAGE_ICON]"></i>
                </div>
                <div>
                    <h5 class="mb-0">نظام الأرشيف</h5>
                    <small>[PAGE_TITLE]</small>
                </div>
            </div>
            <button class="sidebar-close" id="sidebarClose" title="إغلاق القائمة" aria-label="إغلاق القائمة">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="user-info">
            <div class="d-flex align-items-center">
                <div class="user-avatar" id="userAvatar">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <div class="user-name" id="userName">مستخدم</div>
                    <div class="user-role" id="userRole">عام</div>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav" id="sidebarNav" role="navigation" aria-label="القائمة الرئيسية">
            <!-- Will be populated by UnifiedUITemplate -->
        </nav>
        <div class="sidebar-footer">
            <small>نظام الأرشيف الإلكتروني v2.1</small>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <div class="container py-5">
        <!-- محتوى الصفحة هنا -->
    </div>

    <!-- JavaScript موحد -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/unified-ui-template.js"></script>
    <script src="assets/js/firebase-config.js"></script>
    <script src="assets/js/unified-auth.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', async function() {
            // تهيئة النظام الموحد
            const unifiedUI = new UnifiedUITemplate();
            await unifiedUI.initialize();
            
            // إعداد المصادقة
            if (window.unifiedAuth) {
                unifiedAuth.onAuthStateChanged(handleAuthStateChange);
            }
        });

        async function handleAuthStateChange(user) {
            if (user) {
                // تحديث معلومات المستخدم
                const displayName = user.displayName || user.email.split('@')[0];
                document.getElementById('userInfo').innerHTML = `
                    <i class="fas fa-user me-1"></i> ${displayName}
                `;
                
                // تحديث القائمة الجانبية
                const unifiedUI = window.unifiedUITemplate;
                if (unifiedUI) {
                    unifiedUI.updateSidebar();
                }
            } else {
                window.location.href = 'login.html';
            }
        }

        function logout() {
            unifiedAuth.signOut();
        }
    </script>
</body>
</html>
```

## 🎨 تخصيص الألوان والأيقونات

### 1. تخصيص لون القسم
```css
/* في ملف CSS مخصص للصفحة */
:root {
    --dept-color: #e74c3c; /* لون القسم */
}

.sidebar-item[data-department="legal"] {
    --item-color: var(--dept-color);
}
```

### 2. أيقونات مخصصة لكل صفحة
```javascript
// استبدال [PAGE_ICON] في HTML بأيقونة مناسبة
const pageIcons = {
    'dashboard': 'tachometer-alt',
    'search': 'search',
    'upload': 'upload',
    'reports': 'chart-bar',
    'users': 'users',
    'settings': 'cogs'
};
```

## 🔧 إضافة عناصر للقائمة الجانبية

### 1. إضافة رابط جديد
```javascript
// في unified-ui-template.js
const customMenuItems = [
    {
        label: 'عنصر جديد',
        href: 'new-page.html',
        icon: 'fas fa-plus',
        permission: 'new-feature'
    }
];

// إضافة للقائمة
this.menuItems = [...this.menuItems, ...customMenuItems];
```

### 2. إضافة فاصل في القائمة
```javascript
{
    type: 'separator',
    label: 'إدارة النظام'
}
```

## 📱 اختبار التصميم المتجاوب

### 1. نقاط التحقق
```css
/* Desktop */
@media (min-width: 992px) {
    :root {
        --sidebar-width: 280px;
    }
}

/* Tablet */
@media (max-width: 991px) {
    :root {
        --sidebar-width: 260px;
    }
}

/* Mobile */
@media (max-width: 576px) {
    :root {
        --sidebar-width: 240px;
    }
}
```

## 🛠️ أدوات التطوير

### 1. فحص الاتساق السريع
```javascript
// في Console المتصفح
new UIConsistencyChecker().quickCheck();
```

### 2. فحص شامل
```javascript
const checker = new UIConsistencyChecker();
checker.runFullCheck().then(results => {
    console.log('نتائج الفحص:', results);
});
```

### 3. اختصارات المطور
- `Ctrl+Shift+U` - فحص سريع
- `Ctrl+Shift+I` - فحص شامل

## 🔄 تطبيق على ملفات متعددة

### 1. باستخدام PowerShell
```powershell
# تطبيق على جميع الملفات
.\apply-unified-ui.ps1

# تطبيق مع نسخة احتياطية مخصصة
.\apply-unified-ui.ps1 -BackupPrefix "custom_backup_20250115"
```

### 2. تطبيق يدوي
1. نسخ الكود HTML للـ sidebar
2. تحديث مراجع CSS و JavaScript
3. إضافة تهيئة UnifiedUITemplate
4. اختبار الصفحة

## ✅ قائمة التحقق

### قبل النشر
- [ ] جميع ملفات CSS محدثة
- [ ] جميع ملفات JavaScript محدثة
- [ ] هيكل Sidebar موحد
- [ ] تهيئة UnifiedUITemplate
- [ ] اختبار على أجهزة مختلفة
- [ ] فحص إمكانية الوصول
- [ ] اختبار الأداء

### بعد النشر
- [ ] اختبار التنقل بين الصفحات
- [ ] التأكد من تحديث القائمة الجانبية
- [ ] اختبار المصادقة والصلاحيات
- [ ] مراجعة الأخطاء في Console

## 🆘 حل المشاكل الشائعة

### 1. القائمة الجانبية لا تظهر
```javascript
// تحقق من تهيئة النظام
if (!window.unifiedUITemplate) {
    console.error('UnifiedUITemplate غير مهيأ');
}
```

### 2. الأنماط لا تطبق بشكل صحيح
```html
<!-- تأكد من ترتيب CSS -->
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/unified-sidebar.css">
```

### 3. JavaScript errors
```javascript
// تحقق من تحميل Firebase
if (!window.firebase) {
    console.error('Firebase غير محمّل');
}
```

## 📞 الدعم

### 1. ملفات مهمة للدعم
- `unified-ui-template.js` - النظام الأساسي
- `unified-sidebar.css` - الأنماط الموحدة
- `ui-consistency-checker.js` - أداة الفحص

### 2. معلومات مفيدة للدعم
- إصدار المتصفح
- حجم الشاشة
- رسائل الخطأ في Console
- الصفحة المتأثرة

---

*هذا الدليل يغطي الاستخدام الأساسي للنظام الموحد. للمزيد من التفاصيل، راجع الملفات المصدرية.*