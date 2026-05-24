# تنفيذ إدارة انتهاء صلاحية الجلسة
## Session Expiration Management Implementation

### النظرة العامة (Overview)

تم تنفيذ نظام شامل لإدارة انتهاء صلاحية الجلسة في نظام الأرشيف، والذي يشمل:

- **كشف انتهاء صلاحية الرموز المميزة (Token Expiration Detection)**
- **إعادة التوجيه التلقائي مع الرسائل المناسبة**
- **الحفاظ على الصفحة المطلوبة للعودة إليها بعد تسجيل الدخول**
- **مراقبة دورية للرموز المميزة**

---

## الميزات المُحدَّثة (Updated Features)

### 1. نظام المصادقة الموحد (Unified Auth System)
**الملف:** `public/assets/js/unified-auth.js`

#### الوظائف الجديدة:

```javascript
async checkTokenValidity()
```
- **الغرض:** فحص صلاحية الرمز المميز الحالي
- **العمل:** يحاول تحديث الرمز المميز ويتعامل مع الأخطاء
- **المعالجة:** يستدعي `handleSessionExpiration()` عند انتهاء الصلاحية

```javascript
async refreshUserToken()
```
- **الغرض:** تحديث الرمز المميز للمستخدم
- **الاستخدام:** يمكن استدعاؤه قبل العمليات الهامة
- **المعالجة:** يتعامل مع أخطاء انتهاء الصلاحية

```javascript
setupTokenMonitoring()
```
- **الغرض:** بدء مراقبة دورية للرمز المميز (كل 30 دقيقة)
- **التفعيل:** يتم تشغيله تلقائياً عند تسجيل الدخول
- **الإيقاف:** يتوقف تلقائياً عند تسجيل الخروج

```javascript
redirectToLoginWithSessionExpired()
```
- **الغرض:** إعادة التوجيه مع معاملات خاصة لانتهاء الجلسة
- **المعاملات:** `message=session-expired` و `redirect=current_page`
- **التنظيف:** يزيل بيانات المصادقة المحلية

```javascript
handleSessionExpiration()
```
- **الغرض:** معالجة شاملة لانتهاء الجلسة
- **العرض:** يعرض تنبيه للمستخدم (إذا كان متاحاً)
- **التأخير:** انتظار ثانيتين قبل إعادة التوجيه

### 2. صفحة تسجيل الدخول (Login Page)
**الملف:** `public/login.html`

#### التحديثات:

```javascript
function handleUrlMessages()
```
- **معالجة جديدة:** `message=session-expired`
- **الرسالة:** "انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى للمتابعة."
- **السلوك:** تنظيف بيانات المصادقة وتركيز حقل البريد الإلكتروني
- **معالجة إضافية:** `unauthorized`, `account-disabled`

#### حفظ صفحة الإعادة التوجيه:
```javascript
const redirect = urlParams.get('redirect');
if (redirect && !redirect.includes('login.html') && !redirect.includes('register.html')) {
    sessionStorage.setItem('redirectAfterLogin', decodeURIComponent(redirect));
}
```

---

## كيفية الاستخدام (How to Use)

### 1. للصفحات المحمية (Protected Pages)

```javascript
// في بداية الصفحة المحمية
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebaseInit();
    
    // فحص المصادقة
    if (!window.unifiedAuth.isAuthenticated) {
        window.unifiedAuth.redirectToLoginWithSessionExpired();
        return;
    }
    
    // فحص صلاحية الرمز المميز (اختياري)
    const isTokenValid = await window.unifiedAuth.checkTokenValidity();
    if (!isTokenValid) {
        return; // سيتم التعامل مع انتهاء الصلاحية تلقائياً
    }
    
    // متابعة تهيئة الصفحة...
});
```

### 2. قبل العمليات الهامة (Before Critical Operations)

```javascript
async function performCriticalOperation() {
    try {
        // تحديث الرمز المميز قبل العملية الهامة
        await window.unifiedAuth.refreshUserToken();
        
        // تنفيذ العملية...
        const result = await someImportantFirebaseOperation();
        return result;
        
    } catch (error) {
        if (error.code === 'auth/user-token-expired') {
            // سيتم التعامل مع هذا تلقائياً
            return;
        }
        throw error;
    }
}
```

### 3. معالجة أخطاء Firebase (Firebase Error Handling)

```javascript
async function handleFirebaseOperation() {
    try {
        const result = await firebase.firestore().collection('documents').get();
        return result;
    } catch (error) {
        // فحص أخطاء انتهاء الصلاحية
        if (error.code === 'auth/user-token-expired' || 
            error.code === 'auth/invalid-user-token') {
            window.unifiedAuth.handleSessionExpiration();
            return;
        }
        throw error;
    }
}
```

---

## سيناريوهات الاستخدام (Usage Scenarios)

### السيناريو 1: انتهاء الجلسة أثناء التصفح
1. المستخدم يتصفح النظام لفترة طويلة
2. ينتهي الرمز المميز (عادة بعد ساعة)
3. النظام يكتشف انتهاء الصلاحية تلقائياً كل 30 دقيقة
4. يتم عرض تنبيه وإعادة التوجيه لصفحة تسجيل الدخول
5. بعد تسجيل الدخول، يعود المستخدم للصفحة التي كان عليها

### السيناريو 2: انتهاء الجلسة أثناء عملية رفع ملف
1. المستخدم في صفحة رفع الملفات
2. ينتهي الرمز المميز أثناء العملية
3. Firebase يرفض العملية مع خطأ انتهاء الصلاحية
4. النظام يكتشف الخطأ ويعيد التوجيه
5. بعد تسجيل الدخول، يعود المستخدم لصفحة الرفع

### السيناريو 3: الدخول المباشر مع انتهاء الجلسة
```
https://archive-system.com/upload.html
↓ (جلسة منتهية)
https://archive-system.com/login.html?message=session-expired&redirect=upload.html
↓ (بعد تسجيل الدخول)
https://archive-system.com/upload.html
```

---

## الاختبار (Testing)

### 1. اختبار انتهاء الجلسة يدوياً

```javascript
// في وحدة تحكم المتصفح
// محاكاة انتهاء الجلسة
window.unifiedAuth.handleSessionExpiration();
```

### 2. اختبار فحص الرمز المميز

```javascript
// فحص صلاحية الرمز المميز الحالي
const isValid = await window.unifiedAuth.checkTokenValidity();
console.log('Token valid:', isValid);
```

### 3. اختبار إعادة التوجيه

```javascript
// محاكاة إعادة التوجيه مع انتهاء الجلسة
window.unifiedAuth.redirectToLoginWithSessionExpired();
```

---

## المراقبة والتشخيص (Monitoring & Diagnostics)

### رسائل وحدة التحكم (Console Messages)

```
✅ Token monitoring started
⚠️ Token validation failed: [error details]
🔄 Handling token expiration...
⚠️ انتهت صلاحية الجلسة
🔄 جلسة منتهية الصلاحية، توجيه إلى: [login URL]
```

### التتبع في الأنشطة (Activity Logging)

سيتم تسجيل أحداث انتهاء الجلسة في `activity-logger.js`:
- **حدث:** "session_expired"
- **التفاصيل:** الصفحة الحالية ووقت انتهاء الصلاحية
- **المستخدم:** معرف المستخدم (إذا كان متاحاً)

---

## الأمان (Security Considerations)

### 1. تنظيف البيانات المحلية
- إزالة `demo_mode` من localStorage
- إزالة `userSession` من sessionStorage
- عدم ترك بيانات حساسة في المتصفح

### 2. التحقق من معاملات إعادة التوجيه
- التأكد من أن صفحة الإعادة التوجيه آمنة
- منع إعادة التوجيه لصفحات تسجيل الدخول أو التسجيل
- التحقق من صحة النطاق (Domain)

### 3. مراقبة دورية
- فحص كل 30 دقيقة (يمكن تخصيصه)
- إيقاف المراقبة عند تسجيل الخروج
- عدم إجراء فحوصات غير ضرورية

---

## التخصيص (Customization)

### تغيير فترة المراقبة

```javascript
// في setupTokenMonitoring()
const checkInterval = 15 * 60 * 1000; // 15 دقيقة بدلاً من 30
```

### تخصيص رسائل انتهاء الجلسة

```javascript
// في handleUrlMessages() في login.html
if (message === 'session-expired') {
    showAlert('رسالة مخصصة لانتهاء الجلسة', 'warning');
}
```

### إضافة معالجة خاصة

```javascript
// في unified-auth.js
handleSessionExpiration() {
    // معالجة إضافية مخصصة
    this.customSessionExpirationHandler();
    
    // المعالجة الافتراضية
    // ...
}
```

---

## استكشاف الأخطاء (Troubleshooting)

### المشكلة: عدم إعادة التوجيه تلقائياً
**السبب:** عدم تهيئة `window.unifiedAuth`
**الحل:** التأكد من تحميل `unified-auth.js` قبل استخدامه

### المشكلة: فقدان الصفحة المطلوبة بعد تسجيل الدخول
**السبب:** عدم تمرير معامل `redirect` بشكل صحيح
**الحل:** التحقق من تنفيذ `redirectToLoginWithSessionExpired()`

### المشكلة: رسائل خطأ متكررة
**السبب:** عدم إيقاف مراقبة الرمز المميز
**الحل:** التأكد من استدعاء `clearInterval()` عند تسجيل الخروج

---

## الخلاصة (Summary)

تم تنفيذ نظام شامل لإدارة انتهاء صلاحية الجلسة يشمل:

✅ **كشف تلقائي** لانتهاء الرموز المميزة  
✅ **إعادة توجيه ذكية** مع حفظ الصفحة المطلوبة  
✅ **رسائل واضحة** للمستخدمين  
✅ **مراقبة دورية** استباقية  
✅ **تنظيف آمن** للبيانات المحلية  
✅ **سهولة التخصيص** والصيانة  

هذا النظام يوفر تجربة مستخدم سلسة وآمنة عند انتهاء صلاحية الجلسة.