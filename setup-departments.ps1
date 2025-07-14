# إعداد نظام لوحات التحكم للإدارات
# Department Dashboards Setup Script

Write-Host "🚀 بدء إعداد نظام لوحات التحكم للإدارات..." -ForegroundColor Green

# التحقق من وجود Node.js
Write-Host "🔍 التحقق من Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js متوفر - الإصدار: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js غير متوفر. يرجى تثبيت Node.js أولاً" -ForegroundColor Red
    exit 1
}

# التحقق من firebase-admin
Write-Host "🔍 التحقق من firebase-admin..." -ForegroundColor Yellow
$adminPackageExists = Test-Path "node_modules/firebase-admin"
if (-not $adminPackageExists) {
    Write-Host "📦 تثبيت firebase-admin..." -ForegroundColor Yellow
    npm install firebase-admin
}

# التحقق من ملف firebase credentials
Write-Host "🔍 التحقق من ملف firebase credentials..." -ForegroundColor Yellow
$credentialsExists = Test-Path "archive-tech-firebase-adminsdk.json"
if (-not $credentialsExists) {
    Write-Host "❌ ملف firebase credentials غير موجود: archive-tech-firebase-adminsdk.json" -ForegroundColor Red
    Write-Host "يرجى تحميل ملف credentials من Firebase Console ووضعه في المجلد الرئيسي" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ جميع المتطلبات متوفرة" -ForegroundColor Green

# إعداد الإدارات
Write-Host "`n🏢 إعداد الإدارات في قاعدة البيانات..." -ForegroundColor Green
try {
    node scripts/setup_departments.js
    Write-Host "✅ تم إعداد الإدارات بنجاح" -ForegroundColor Green
} catch {
    Write-Host "❌ خطأ في إعداد الإدارات" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# تحديث المستخدمين
Write-Host "`n👥 تحديث بيانات المستخدمين..." -ForegroundColor Green
$updateUsers = Read-Host "هل تريد تحديث بيانات المستخدمين الموجودين؟ (y/n)"
if ($updateUsers -eq "y" -or $updateUsers -eq "Y" -or $updateUsers -eq "yes") {
    try {
        node scripts/update_users_departments.js
        Write-Host "✅ تم تحديث بيانات المستخدمين بنجاح" -ForegroundColor Green
    } catch {
        Write-Host "❌ خطأ في تحديث المستخدمين" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "⏭️ تم تخطي تحديث المستخدمين" -ForegroundColor Yellow
}

Write-Host "`n🎉 انتهى إعداد نظام لوحات التحكم!" -ForegroundColor Green
Write-Host "`n📋 ملخص الإعداد:" -ForegroundColor Cyan
Write-Host "   • إدارة الأرشيف العام: archive-dashboard.html" -ForegroundColor White
Write-Host "   • إدارة الشؤون القانونية: legal-dashboard.html" -ForegroundColor White  
Write-Host "   • إدارة التحصيل: collection-dashboard.html" -ForegroundColor White
Write-Host "   • نظام التوجيه التلقائي: assets/js/department-router.js" -ForegroundColor White

Write-Host "`n🚀 لبدء الخادم المحلي:" -ForegroundColor Green
Write-Host "   npm start" -ForegroundColor Yellow

Write-Host "`n📖 لقراءة دليل الاستخدام:" -ForegroundColor Green
Write-Host "   docs/department-dashboards-guide.md" -ForegroundColor Yellow

Write-Host "`n⚠️ ملاحظات مهمة:" -ForegroundColor Red
Write-Host "   • تأكد من تحديث بيانات المستخدمين بالإدارات الصحيحة" -ForegroundColor Yellow
Write-Host "   • اختبر النظام مع مستخدمين من إدارات مختلفة" -ForegroundColor Yellow
Write-Host "   • راجع console المتصفح لأي أخطاء" -ForegroundColor Yellow

Write-Host "`nاضغط أي مفتاح للخروج..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
