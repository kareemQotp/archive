// Emergency Session Reset Script
// سكريپت طوارئ لإعادة تعيين الجلسة

console.log('🚨 تشغيل سكريپت طوارئ لإعادة تعيين الجلسة...');

// 1. مسح جميع بيانات localStorage المتعلقة بالجلسة
const sessionKeys = [
    'lastActivity',
    'sessionExpired', 
    'loginAttempts',
    'userLockout',
    'authToken',
    'firebase:authUser:AIzaSyBILxwMOLGSaE_FWKaPdGF6LFtLvTgYqSk:[DEFAULT]',
    'firebase:host:archive-tech-default-rtdb.firebaseio.com'
];

sessionKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ تم حذف ${key}`);
});

// 2. تعطيل فحص الجلسة نهائياً
if (window.unifiedAuth) {
    window.unifiedAuth.sessionCheckDisabled = true;
    window.unifiedAuth.loginAttempts = 0;
    console.log('✅ تم تعطيل فحص الجلسة');
}

// 3. إعادة تعيين النشاط
if (window.unifiedAuth && window.unifiedAuth.updateActivity) {
    window.unifiedAuth.updateActivity();
    console.log('✅ تم تحديث نشاط الجلسة');
}

// 4. فرض تحديث حالة المصادقة
if (window.auth && window.auth.currentUser) {
    console.log('✅ المستخدم متصل:', window.auth.currentUser.email);
} else {
    console.log('⚠️ لا يوجد مستخدم متصل حالياً');
}

console.log('🎉 تم الانتهاء من إعادة تعيين الجلسة');
console.log('📋 الآن يمكنك تسجيل الدخول بدون مشاكل');

// تشغيل تلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 تم تشغيل إعادة تعيين الجلسة تلقائياً');
});
