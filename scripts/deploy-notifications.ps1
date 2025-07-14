# Firebase Deployment Script for Notifications
# نشر تحديثات نظام الإشعارات

Write-Host "🚀 بدء نشر تحديثات Firebase..." -ForegroundColor Cyan

# الانتقال للمجلد الجذر للمشروع
Set-Location (Split-Path -Parent $PSScriptRoot)

# 1. نشر قواعد Firestore والفهارس
Write-Host "📋 نشر قواعد وفهارس Firestore..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,firestore:indexes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم نشر قواعد وفهارس Firestore بنجاح" -ForegroundColor Green
} else {
    Write-Host "❌ فشل في نشر قواعد Firestore" -ForegroundColor Red
    exit 1
}

# 2. نشر Cloud Functions
Write-Host "⚡ نشر Cloud Functions..." -ForegroundColor Yellow
Set-Location functions
npm install
npm run build
Set-Location ..
firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم نشر Cloud Functions بنجاح" -ForegroundColor Green
} else {
    Write-Host "❌ فشل في نشر Cloud Functions" -ForegroundColor Red
}

# 3. نشر الاستضافة
Write-Host "🌐 نشر ملفات الاستضافة..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم نشر الاستضافة بنجاح" -ForegroundColor Green
} else {
    Write-Host "❌ فشل في نشر الاستضافة" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 تم الانتهاء من عملية النشر!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 ملاحظات مهمة:" -ForegroundColor Cyan
Write-Host "- تحقق من وحدة تحكم Firebase للتأكد من إنشاء الفهارس"
Write-Host "- قد تستغرق الفهارس بضع دقائق للبناء"
Write-Host "- اختبر نظام الإشعارات بعد اكتمال الفهارس"
Write-Host ""
Write-Host "🔗 روابط مفيدة:" -ForegroundColor Cyan
Write-Host "- Firebase Console: https://console.firebase.google.com/project/tech-arc-9af9c"
Write-Host "- اختبار سريع: https://tech-arc-9af9c.web.app/notification-quick-test.html"

# إظهار حالة Firebase
Write-Host ""
Write-Host "📊 فحص حالة Firebase..." -ForegroundColor Yellow
firebase projects:list

Write-Host ""
Write-Host "🔄 لإعادة تشغيل الخدمات محلياً، استخدم:" -ForegroundColor Cyan
Write-Host "firebase serve --only hosting"
Write-Host "firebase emulators:start"
