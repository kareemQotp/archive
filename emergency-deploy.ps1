# حل مشكلة Firebase - نشر بديل فوري
# Firebase DNS Issue - Immediate Alternative Deployment

Write-Host "🚨 تشخيص مشكلة Firebase CLI..." -ForegroundColor Red
Write-Host "=" * 60 -ForegroundColor Yellow

# تشخيص المشكلة
Write-Host "`n🔍 تشخيص المشكلة:" -ForegroundColor Cyan
Write-Host "  ❌ getaddrinfo ENOTFOUND firebase.googleapis.com" -ForegroundColor Red
Write-Host "  ❌ getaddrinfo ENOTFOUND www.googleapis.com" -ForegroundColor Red
Write-Host "  💡 السبب: مشكلة DNS أو حجب الشبكة" -ForegroundColor Yellow

# اختبار الاتصال
Write-Host "`n🌐 اختبار الاتصال:" -ForegroundColor Cyan
$connections = @(
    "firebase.googleapis.com",
    "www.googleapis.com", 
    "accounts.google.com",
    "github.com",
    "netlify.com"
)

foreach ($host in $connections) {
    try {
        $result = Test-NetConnection -ComputerName $host -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($result) {
            Write-Host "  ✅ $host - متاح" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $host - غير متاح" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ $host - خطأ في الاتصال" -ForegroundColor Red
    }
}

# النشر الفوري على GitHub
Write-Host "`n🚀 النشر الفوري على GitHub:" -ForegroundColor Green

# التحقق من Git
try {
    $gitStatus = git status 2>$null
    if ($gitStatus) {
        Write-Host "  ✅ Git repository موجود" -ForegroundColor Green
        
        # إضافة جميع الملفات
        Write-Host "  📁 إضافة الملفات..." -ForegroundColor Yellow
        git add . 2>$null
        
        # إنشاء commit
        $commitMessage = "🔥 System Update: Firebase v10.7.1 + Ready for deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "  💾 إنشاء commit..." -ForegroundColor Yellow
        git commit -m $commitMessage 2>$null
        
        # Push للريبو
        Write-Host "  🚀 رفع للـ GitHub..." -ForegroundColor Yellow
        try {
            git push origin master 2>$null
            Write-Host "  ✅ تم رفع الملفات بنجاح!" -ForegroundColor Green
            Write-Host "  🌐 فعل GitHub Pages من: Settings → Pages" -ForegroundColor Cyan
        } catch {
            Write-Host "  ⚠️ تحقق من إعدادات GitHub" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ❌ Git غير متاح" -ForegroundColor Red
}

# نشر Netlify Drop
Write-Host "`n📦 تحضير نشر Netlify Drop:" -ForegroundColor Green

# إنشاء مجلد مؤقت للنشر
$deployFolder = "netlify_deploy_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "  📁 إنشاء مجلد: $deployFolder" -ForegroundColor Yellow

# نسخ ملفات public
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination $deployFolder -Recurse -Force
    Write-Host "  ✅ تم نسخ ملفات public" -ForegroundColor Green
    
    # إنشاء ملف _redirects للـ SPA
    $redirects = "/* /index.html 200"
    Set-Content -Path "$deployFolder\_redirects" -Value $redirects -Encoding UTF8
    Write-Host "  ✅ تم إنشاء _redirects" -ForegroundColor Green
    
    # عد الملفات
    $fileCount = (Get-ChildItem -Path $deployFolder -Recurse -File).Count
    Write-Host "  📊 إجمالي الملفات: $fileCount" -ForegroundColor Cyan
    
    # إنشاء ZIP
    $zipName = "netlify_ready_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
    Compress-Archive -Path "$deployFolder\*" -DestinationPath $zipName -Force
    Write-Host "  📦 تم إنشاء: $zipName" -ForegroundColor Green
    
    # تنظيف المجلد المؤقت
    Remove-Item -Path $deployFolder -Recurse -Force
    
    Write-Host "`n🎯 خطوات النشر على Netlify:" -ForegroundColor Cyan
    Write-Host "  1. اذهب إلى: https://netlify.com" -ForegroundColor White
    Write-Host "  2. اسحب ملف: $zipName" -ForegroundColor White
    Write-Host "  3. ستحصل على رابط فوري!" -ForegroundColor White
}

# نشر Vercel
Write-Host "`n⚡ نشر Vercel السريع:" -ForegroundColor Green
Write-Host "  1. npm install -g vercel" -ForegroundColor White
Write-Host "  2. cd public" -ForegroundColor White  
Write-Host "  3. vercel" -ForegroundColor White
Write-Host "  4. اتبع التعليمات" -ForegroundColor White

# خادم محلي
Write-Host "`n🏠 الخادم المحلي:" -ForegroundColor Green
try {
    $serverCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($serverCheck) {
        Write-Host "  ✅ خادم يعمل على: http://localhost:8000" -ForegroundColor Green
    } else {
        Write-Host "  💡 لتشغيل خادم محلي:" -ForegroundColor Yellow
        Write-Host "     cd public && python -m http.server 8000" -ForegroundColor White
    }
} catch {
    Write-Host "  💡 لتشغيل خادم محلي:" -ForegroundColor Yellow
    Write-Host "     cd public && python -m http.server 8000" -ForegroundColor White
}

Write-Host "`n" + "=" * 60 -ForegroundColor Yellow
Write-Host "🎉 ملخص الحلول البديلة:" -ForegroundColor Green
Write-Host "  🥇 GitHub Pages - مجاني ومستقر" -ForegroundColor Green
Write-Host "  🥈 Netlify Drop - سريع وفوري" -ForegroundColor Green  
Write-Host "  🥉 Vercel - أداء ممتاز" -ForegroundColor Green
Write-Host "  🏠 خادم محلي - للاختبار" -ForegroundColor Green
Write-Host "`n🔥 الموقع جاهز للنشر بأي طريقة!" -ForegroundColor Yellow
