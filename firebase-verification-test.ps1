# سكريبت الاختبار النهائي لتحديث Firebase
# Final Firebase Update Verification Script

Write-Host "🔥 بدء الاختبار النهائي لتحديث Firebase..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Blue

# التحقق من الملفات الأساسية
$coreFiles = @("firebase-config.js", "firebase-init.js", "unified-auth.js", "dataconnect-sdk.js")
$missingCoreFiles = @()

Write-Host "`n📂 فحص الملفات الأساسية:" -ForegroundColor Cyan
foreach ($file in $coreFiles) {
    $filePath = "public\assets\js\$file"
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - مفقود!" -ForegroundColor Red
        $missingCoreFiles += $file
    }
}

# التحقق من صفحات HTML
Write-Host "`n🌐 فحص صفحات HTML:" -ForegroundColor Cyan
$htmlFiles = Get-ChildItem -Path "public\*.html" -File | Where-Object { $_.Name -notlike "*test*" -and $_.Name -notlike "*debug*" -and $_.Name -notlike "*emergency*" }

$results = @()
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    $hasFirebase = $content -match "firebasejs/10\.7\.1/"
    $hasConfig = $content -match "firebase-config\.js"
    $hasOldVersions = $content -match "firebasejs/(11\.|10\.11\.|10\.10\.|9\.)"
    
    $status = if ($hasFirebase -and $hasConfig -and -not $hasOldVersions) { 
        "✅ مكتمل" 
    } elseif ($hasFirebase -and -not $hasOldVersions) { 
        "⚠️ ناقص Config" 
    } elseif ($hasOldVersions) { 
        "❌ إصدار قديم" 
    } else { 
        "❓ غير واضح" 
    }
    
    $results += [PSCustomObject]@{
        File = $file.Name
        Status = $status
        Firebase = $hasFirebase
        Config = $hasConfig
        OldVersions = $hasOldVersions
    }
    
    $statusColor = switch ($status) {
        "✅ مكتمل" { "Green" }
        "⚠️ ناقص Config" { "Yellow" }
        "❌ إصدار قديم" { "Red" }
        default { "Gray" }
    }
    
    Write-Host "  $status $($file.Name)" -ForegroundColor $statusColor
}

# إحصائيات النتائج
Write-Host "`n📊 إحصائيات النتائج:" -ForegroundColor Cyan
$totalFiles = $results.Count
$completeFiles = ($results | Where-Object { $_.Status -eq "✅ مكتمل" }).Count
$incompleteFiles = ($results | Where-Object { $_.Status -eq "⚠️ ناقص Config" }).Count
$oldVersionFiles = ($results | Where-Object { $_.Status -eq "❌ إصدار قديم" }).Count

Write-Host "  📁 إجمالي الملفات: $totalFiles" -ForegroundColor White
Write-Host "  ✅ مكتملة: $completeFiles" -ForegroundColor Green
Write-Host "  ⚠️ ناقصة: $incompleteFiles" -ForegroundColor Yellow
Write-Host "  ❌ قديمة: $oldVersionFiles" -ForegroundColor Red

$successRate = [math]::Round(($completeFiles / $totalFiles) * 100, 1)
Write-Host "  📈 معدل النجاح: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 75) { "Yellow" } else { "Red" })

# اختبار الصفحات الأساسية
Write-Host "`n🎯 فحص الصفحات الأساسية:" -ForegroundColor Cyan
$criticalPages = @("index.html", "login.html", "dashboard.html", "forgot-password.html")
$criticalIssues = @()

foreach ($page in $criticalPages) {
    $result = $results | Where-Object { $_.File -eq $page }
    if ($result) {
        if ($result.Status -eq "✅ مكتمل") {
            Write-Host "  ✅ $page" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $page - $($result.Status)" -ForegroundColor Red
            $criticalIssues += $page
        }
    } else {
        Write-Host "  ❓ $page - غير موجود" -ForegroundColor Gray
    }
}

# تقرير نهائي
Write-Host "`n" + "=" * 60 -ForegroundColor Blue
Write-Host "📋 التقرير النهائي:" -ForegroundColor Cyan

if ($missingCoreFiles.Count -eq 0 -and $criticalIssues.Count -eq 0 -and $successRate -ge 90) {
    Write-Host "`n🎉 تم التحديث بنجاح!" -ForegroundColor Green
    Write-Host "   ✅ جميع الملفات الأساسية موجودة" -ForegroundColor Green
    Write-Host "   ✅ الصفحات الحساسة تعمل بشكل صحيح" -ForegroundColor Green
    Write-Host "   ✅ معدل النجاح مرتفع ($successRate%)" -ForegroundColor Green
    Write-Host "`n🚀 النظام جاهز للاستخدام!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ يوجد مشاكل تحتاج حل:" -ForegroundColor Yellow
    
    if ($missingCoreFiles.Count -gt 0) {
        Write-Host "   ❌ ملفات أساسية مفقودة: $($missingCoreFiles -join ', ')" -ForegroundColor Red
    }
    
    if ($criticalIssues.Count -gt 0) {
        Write-Host "   ❌ صفحات حساسة بها مشاكل: $($criticalIssues -join ', ')" -ForegroundColor Red
    }
    
    if ($successRate -lt 90) {
        Write-Host "   ❌ معدل النجاح منخفض: $successRate%" -ForegroundColor Red
    }
}

Write-Host "`n🔧 للحصول على تفاصيل أكثر، راجع:" -ForegroundColor Cyan
Write-Host "   📄 FIREBASE_SYSTEM_UPDATE_REPORT.md" -ForegroundColor White

Write-Host "`n" + "=" * 60 -ForegroundColor Blue
