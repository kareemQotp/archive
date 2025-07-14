# سكريبت نشر بديل
# Alternative Deployment Script

echo "🚀 بدء النشر البديل..."

# التحقق من وجود مجلد public
if (!(Test-Path "public")) {
    Write-Host "❌ مجلد public غير موجود!" -ForegroundColor Red
    exit 1
}

# عد الملفات
$fileCount = (Get-ChildItem -Path "public" -Recurse -File).Count
Write-Host "📁 تم العثور على $fileCount ملف في مجلد public" -ForegroundColor Green

# إنشاء أرشيف للنشر
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveName = "archive_deploy_$date.zip"

Compress-Archive -Path "public\*" -DestinationPath $archiveName -Force
Write-Host "📦 تم إنشاء أرشيف: $archiveName" -ForegroundColor Green

Write-Host ""
Write-Host "✅ ملفات النشر جاهزة!" -ForegroundColor Green
Write-Host "يمكنك رفع ملف $archiveName إلى أي خدمة استضافة" -ForegroundColor Yellow
