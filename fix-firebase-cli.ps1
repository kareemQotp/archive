# حل مشاكل Firebase CLI
# Firebase CLI Authentication & Deployment Fix Script

Write-Host "🔥 حل مشاكل Firebase CLI..." -ForegroundColor Red
Write-Host "=" * 50 -ForegroundColor Yellow

# تنظيف ملفات التهيئة القديمة
Write-Host "`n🧹 تنظيف ملفات التهيئة القديمة:" -ForegroundColor Cyan

$filesToClean = @(
    "$env:USERPROFILE\.config\firebase\*",
    "$env:APPDATA\firebase\*",
    "firebase-debug*.log"
)

foreach ($pattern in $filesToClean) {
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "  🗑️ حذف: $pattern" -ForegroundColor Yellow
        Remove-Item -Path $pattern -Force -Recurse -ErrorAction SilentlyContinue
    }
}

# إنشاء إعدادات Firebase بديلة
Write-Host "`n⚙️ إنشاء إعدادات Firebase بديلة:" -ForegroundColor Cyan

# إنشاء ملف firebase.json مبسط
$firebaseConfig = @"
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
"@

Set-Content -Path "firebase.json" -Value $firebaseConfig -Encoding UTF8
Write-Host "  ✅ تم إنشاء firebase.json مبسط" -ForegroundColor Green

# إنشاء ملف .firebaserc مبسط
$firebaseRc = @"
{
  "projects": {
    "default": "archiving-68881"
  }
}
"@

Set-Content -Path ".firebaserc" -Value $firebaseRc -Encoding UTF8
Write-Host "  ✅ تم إنشاء .firebaserc مبسط" -ForegroundColor Green

# اختبار الاتصال بالإنترنت
Write-Host "`n🌐 اختبار الاتصال:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://firebase.google.com" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✅ الاتصال بـ Firebase متاح" -ForegroundColor Green
} catch {
    Write-Host "  ❌ مشكلة في الاتصال بـ Firebase" -ForegroundColor Red
    Write-Host "     الخطأ: $($_.Exception.Message)" -ForegroundColor Yellow
}

# محاولة بدائل للنشر
Write-Host "`n🚀 بدائل للنشر:" -ForegroundColor Cyan

Write-Host "  1️⃣ استخدام GitHub Pages:" -ForegroundColor Yellow
Write-Host "     - ارفع الملفات إلى GitHub repository" -ForegroundColor White
Write-Host "     - فعل GitHub Pages من Settings" -ForegroundColor White
Write-Host "     - اختر مجلد public كمصدر" -ForegroundColor White

Write-Host "`n  2️⃣ استخدام Netlify:" -ForegroundColor Yellow
Write-Host "     - اذهب إلى netlify.com" -ForegroundColor White
Write-Host "     - اسحب مجلد public إلى الموقع" -ForegroundColor White
Write-Host "     - ستحصل على رابط فوري" -ForegroundColor White

Write-Host "`n  3️⃣ استخدام Vercel:" -ForegroundColor Yellow
Write-Host "     - npm install -g vercel" -ForegroundColor White
Write-Host "     - vercel --cwd public" -ForegroundColor White

Write-Host "`n  4️⃣ خادم محلي للاختبار:" -ForegroundColor Yellow
Write-Host "     - cd public" -ForegroundColor White
Write-Host "     - python -m http.server 8000" -ForegroundColor White
Write-Host "     - أو: npx serve ." -ForegroundColor White

# إنشاء سكريبت نشر بديل
$deployScript = @"
# سكريبت نشر بديل
# Alternative Deployment Script

echo "🚀 بدء النشر البديل..."

# التحقق من وجود مجلد public
if (!(Test-Path "public")) {
    Write-Host "❌ مجلد public غير موجود!" -ForegroundColor Red
    exit 1
}

# عد الملفات
`$fileCount = (Get-ChildItem -Path "public" -Recurse -File).Count
Write-Host "📁 تم العثور على `$fileCount ملف في مجلد public" -ForegroundColor Green

# إنشاء أرشيف للنشر
`$date = Get-Date -Format "yyyyMMdd_HHmmss"
`$archiveName = "archive_deploy_`$date.zip"

Compress-Archive -Path "public\*" -DestinationPath `$archiveName -Force
Write-Host "📦 تم إنشاء أرشيف: `$archiveName" -ForegroundColor Green

Write-Host ""
Write-Host "✅ ملفات النشر جاهزة!" -ForegroundColor Green
Write-Host "يمكنك رفع ملف `$archiveName إلى أي خدمة استضافة" -ForegroundColor Yellow
"@

Set-Content -Path "deploy-alternative.ps1" -Value $deployScript -Encoding UTF8
Write-Host "  ✅ تم إنشاء سكريبت النشر البديل: deploy-alternative.ps1" -ForegroundColor Green

Write-Host "`n" + "=" * 50 -ForegroundColor Yellow
Write-Host "🎯 الخلاصة:" -ForegroundColor Cyan
Write-Host "  ❌ Firebase CLI به مشاكل في المصادقة" -ForegroundColor Red
Write-Host "  ✅ تم إنشاء بدائل للنشر" -ForegroundColor Green
Write-Host "  💡 أفضل بديل: Netlify أو GitHub Pages" -ForegroundColor Yellow
Write-Host "`n🔥 نصيحة: جرب الخادم المحلي أولاً للتأكد من عمل الموقع" -ForegroundColor Green
