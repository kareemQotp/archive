# نشر المشروع على Archive-Tech
# Deploy to Archive-Tech Firebase Project

Write-Host "🔥 نشر المشروع على Archive-Tech..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Blue

# التحقق من حالة Firebase
Write-Host "`n🔍 فحص حالة Firebase:" -ForegroundColor Cyan

try {
    # محاولة تسجيل الدخول
    Write-Host "  🔐 محاولة تسجيل الدخول..." -ForegroundColor Yellow
    $loginResult = firebase login --no-localhost 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ تم تسجيل الدخول بنجاح" -ForegroundColor Green
    } else {
        Write-Host "  ❌ مشكلة في تسجيل الدخول" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ خطأ في Firebase CLI" -ForegroundColor Red
}

# إنشاء مشروع Archive-Tech إذا لم يكن موجوداً
Write-Host "`n🏗️ إعداد مشروع Archive-Tech:" -ForegroundColor Cyan

# تحديث .firebaserc للمشروع المطلوب
$firebaseRc = @"
{
  "projects": {
    "default": "archive-tech",
    "production": "archive-tech"
  }
}
"@

Set-Content -Path ".firebaserc" -Value $firebaseRc -Encoding UTF8
Write-Host "  ✅ تم تحديث .firebaserc لمشروع archive-tech" -ForegroundColor Green

# تحديث firebase.json للاستضافة
$firebaseJson = @"
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
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
"@

Set-Content -Path "firebase.json" -Value $firebaseJson -Encoding UTF8
Write-Host "  ✅ تم تحديث firebase.json" -ForegroundColor Green

# محاولة النشر على archive-tech
Write-Host "`n🚀 محاولة النشر على archive-tech:" -ForegroundColor Green

try {
    Write-Host "  🔄 جاري النشر..." -ForegroundColor Yellow
    $deployResult = firebase deploy --project archive-tech --only hosting 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ تم النشر بنجاح على archive-tech!" -ForegroundColor Green
        Write-Host "  🌐 رابط الموقع: https://archive-tech.web.app" -ForegroundColor Cyan
    } else {
        Write-Host "  ❌ فشل النشر على archive-tech" -ForegroundColor Red
        Write-Host "  💡 الخطأ: $deployResult" -ForegroundColor Yellow
        
        # الحلول البديلة
        Write-Host "`n🔄 تجربة الحلول البديلة..." -ForegroundColor Cyan
        
        # محاولة إنشاء المشروع
        Write-Host "  🏗️ محاولة إنشاء مشروع جديد..." -ForegroundColor Yellow
        $createResult = firebase projects:create archive-tech --display-name "Archive-Tech" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ تم إنشاء المشروع!" -ForegroundColor Green
            
            # محاولة النشر مرة أخرى
            Write-Host "  🚀 محاولة النشر مرة أخرى..." -ForegroundColor Yellow
            $deployResult2 = firebase deploy --project archive-tech --only hosting 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ تم النشر بنجاح!" -ForegroundColor Green
                Write-Host "  🌐 رابط الموقع: https://archive-tech.web.app" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ⚠️ المشروع موجود أو مشكلة في الإنشاء" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ❌ خطأ في عملية النشر" -ForegroundColor Red
}

# إنشاء حزمة النشر البديلة
Write-Host "`n📦 إنشاء حزمة النشر البديلة:" -ForegroundColor Green

if (Test-Path "public") {
    # إنشاء مجلد للنشر
    $deployFolder = "archive-tech-deploy-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path "public" -Destination $deployFolder -Recurse -Force
    
    # إضافة ملفات خاصة بـ Archive-Tech
    $redirects = @"
/* /index.html 200
/api/* https://us-central1-archive-tech.cloudfunctions.net/:splat 200
"@
    Set-Content -Path "$deployFolder\_redirects" -Value $redirects -Encoding UTF8
    
    # إنشاء ملف netlify.toml للتكوين المتقدم
    $netlifyToml = @"
[build]
  publish = "."

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
"@
    Set-Content -Path "$deployFolder\netlify.toml" -Value $netlifyToml -Encoding UTF8
    
    # عد الملفات
    $fileCount = (Get-ChildItem -Path $deployFolder -Recurse -File).Count
    
    # إنشاء ZIP
    $zipName = "archive-tech-ready-$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
    Compress-Archive -Path "$deployFolder\*" -DestinationPath $zipName -Force
    
    # تنظيف
    Remove-Item -Path $deployFolder -Recurse -Force
    
    Write-Host "  ✅ تم إنشاء: $zipName ($fileCount ملف)" -ForegroundColor Green
    
    # خطوات النشر البديل
    Write-Host "`n🎯 خطوات النشر البديلة لـ Archive-Tech:" -ForegroundColor Cyan
    Write-Host "  1️⃣ Netlify:" -ForegroundColor Yellow
    Write-Host "     - اذهب إلى: https://netlify.com" -ForegroundColor White
    Write-Host "     - اسحب: $zipName" -ForegroundColor White
    Write-Host "     - غير اسم الموقع إلى: archive-tech" -ForegroundColor White
    
    Write-Host "`n  2️⃣ Vercel:" -ForegroundColor Yellow
    Write-Host "     - npm install -g vercel" -ForegroundColor White
    Write-Host "     - cd public && vercel --name archive-tech" -ForegroundColor White
    
    Write-Host "`n  3️⃣ GitHub Pages:" -ForegroundColor Yellow
    Write-Host "     - أنشئ repo جديد: archive-tech" -ForegroundColor White
    Write-Host "     - ارفع مجلد public" -ForegroundColor White
    Write-Host "     - فعل GitHub Pages" -ForegroundColor White
}

# فحص الخادم المحلي
Write-Host "`n🏠 فحص الخادم المحلي:" -ForegroundColor Green
try {
    $serverCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($serverCheck) {
        Write-Host "  ✅ خادم محلي يعمل على: http://localhost:8000" -ForegroundColor Green
    } else {
        Write-Host "  💡 لتشغيل خادم محلي:" -ForegroundColor Yellow
        Write-Host "     cd public && python -m http.server 8000" -ForegroundColor White
    }
} catch {
    Write-Host "  💡 لتشغيل خادم محلي:" -ForegroundColor Yellow
    Write-Host "     cd public && python -m http.server 8000" -ForegroundColor White
}

Write-Host "`n" + "=" * 60 -ForegroundColor Blue
Write-Host "🎉 ملخص نشر Archive-Tech:" -ForegroundColor Green
Write-Host "  🔥 Firebase: محاولة النشر المباشر" -ForegroundColor Green
Write-Host "  📦 ملف جاهز: $zipName" -ForegroundColor Green
Write-Host "  🌐 خيارات بديلة متعددة" -ForegroundColor Green
Write-Host "  🏠 خادم محلي للاختبار" -ForegroundColor Green
Write-Host "`n🚀 Archive-Tech جاهز للنشر!" -ForegroundColor Yellow
