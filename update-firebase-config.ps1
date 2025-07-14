# تحديث إعدادات Firebase لجميع صفحات النظام
# Firebase Configuration Update Script for Archive System

Write-Host "بدء تحديث إعدادات Firebase لجميع صفحات النظام..." -ForegroundColor Green

# قائمة إصدارات Firebase القديمة للاستبدال
$oldVersions = @("11.9.1", "10.11.0", "10.10.0", "10.8.0", "10.5.0")
$newVersion = "10.7.1"

# البحث عن جميع ملفات HTML
$htmlFiles = Get-ChildItem -Path "public\*.html" -File

Write-Host "تم العثور على $($htmlFiles.Count) ملف HTML" -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    Write-Host "معالجة ملف: $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # استبدال إصدارات Firebase القديمة
    foreach ($oldVersion in $oldVersions) {
        if ($content -match "firebasejs/$oldVersion/") {
            Write-Host "  - تحديث Firebase من $oldVersion إلى $newVersion" -ForegroundColor Yellow
            $content = $content -replace "firebasejs/$oldVersion/", "firebasejs/$newVersion/"
            $modified = $true
        }
    }
    
    # إضافة firebase-config.js إذا لم يكن موجوداً
    if ($content -notmatch "firebase-config\.js" -and $content -match "firebase-init\.js") {
        Write-Host "  - إضافة firebase-config.js" -ForegroundColor Yellow
        $content = $content -replace '(\s+<script src="assets/js/firebase-init\.js"></script>)', 
                                    "`n    <script src=`"assets/js/firebase-config.js`"></script>`$1"
        $modified = $true
    }
    
    # تحديث تعليقات Firebase
    if ($content -match "<!-- Firebase -->" -and $content -notmatch "الإصدار الموحد") {
        Write-Host "  - تحديث تعليق Firebase" -ForegroundColor Yellow
        $content = $content -replace "<!-- Firebase -->", "<!-- Firebase v$newVersion - الإصدار الموحد -->"
        $modified = $true
    }
    
    # حفظ الملف إذا تم التعديل
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "  ✅ تم تحديث الملف" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️ لا يحتاج تحديث" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "تم الانتهاء من تحديث جميع ملفات HTML!" -ForegroundColor Green
Write-Host ""

# التحقق من النتائج
Write-Host "تحقق من النتائج:" -ForegroundColor Cyan
$verificationResults = @()

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $hasFirebaseConfig = $content -match "firebase-config\.js"
    $hasCorrectVersion = $content -match "firebasejs/$newVersion/"
    $hasOldVersions = $false
    
    foreach ($oldVersion in $oldVersions) {
        if ($content -match "firebasejs/$oldVersion/") {
            $hasOldVersions = $true
            break
        }
    }
    
    $status = if ($hasFirebaseConfig -and $hasCorrectVersion -and -not $hasOldVersions) { "✅" } else { "❌" }
    
    $verificationResults += [PSCustomObject]@{
        File = $file.Name
        Status = $status
        HasConfig = $hasFirebaseConfig
        CorrectVersion = $hasCorrectVersion
        HasOldVersions = $hasOldVersions
    }
}

# عرض النتائج
$verificationResults | Format-Table -AutoSize

$successCount = ($verificationResults | Where-Object { $_.Status -eq "✅" }).Count
$totalCount = $verificationResults.Count

Write-Host ""
Write-Host "النتيجة النهائية: $successCount من $totalCount ملف تم تحديثه بنجاح" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($successCount -lt $totalCount) {
    Write-Host ""
    Write-Host "الملفات التي تحتاج مراجعة يدوية:" -ForegroundColor Red
    $verificationResults | Where-Object { $_.Status -eq "❌" } | ForEach-Object {
        Write-Host "  - $($_.File)" -ForegroundColor Red
        if (-not $_.HasConfig) { Write-Host "    * مفقود: firebase-config.js" -ForegroundColor Yellow }
        if (-not $_.CorrectVersion) { Write-Host "    * مفقود: Firebase v$newVersion" -ForegroundColor Yellow }
        if ($_.HasOldVersions) { Write-Host "    * موجود: إصدارات قديمة" -ForegroundColor Yellow }
    }
}

Write-Host ""
Write-Host "🔥 تحديث Firebase مكتمل!" -ForegroundColor Green
