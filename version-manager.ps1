# PowerShell Version Manager for Archive System
# نسخة PowerShell من مدير الإصدارات

# Colors for display
$Color = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Cyan"
}

# Colored output functions
function Write-Success($message) {
    Write-Host "✅ $message" -ForegroundColor $Color.Green
}

function Write-Error($message) {
    Write-Host "❌ $message" -ForegroundColor $Color.Red
}

function Write-Warning($message) {
    Write-Host "⚠️ $message" -ForegroundColor $Color.Yellow
}

function Write-Info($message) {
    Write-Host "ℹ️ $message" -ForegroundColor $Color.Blue
}

# Project variables
$BackupDir = "backups"
$CurrentDate = Get-Date -Format "yyyyMMdd_HHmmss"

# Check requirements
function Test-Requirements {
    Write-Info "Checking requirements..."
    
    $requirements = @(
        @{Name = "git"; Command = "git --version"},
        @{Name = "node"; Command = "node --version"},
        @{Name = "npm"; Command = "npm --version"},
        @{Name = "firebase"; Command = "firebase --version"}
    )
    
    $allGood = $true
    
    foreach ($req in $requirements) {
        try {
            $null = Invoke-Expression $req.Command -ErrorAction Stop
            Write-Success "$($req.Name) available"
        }
        catch {
            Write-Error "$($req.Name) not installed"
            $allGood = $false
        }
    }
    
    if ($allGood) {
        Write-Success "All requirements are available"
    } else {
        Write-Error "Please install missing requirements"
        exit 1
    }
}

# Create backup
function New-Backup {
    Write-Info "Creating backup..."
    
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    $backupFile = "$BackupDir\backup_$CurrentDate.zip"
    
    # Files to exclude
    $excludePatterns = @(
        ".git*",
        "node_modules*",
        "functions\node_modules*",
        "functions\lib*",
        ".firebase*",
        "backups*",
        "*.log"
    )
    
    # Create temp file with file list
    $tempFile = [System.IO.Path]::GetTempFileName()
    Get-ChildItem -Recurse -File | Where-Object {
        $file = $_
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($file.FullName -like "*$pattern*") {
                $shouldExclude = $true
                break
            }
        }
        return !$shouldExclude
    } | ForEach-Object { $_.FullName } | Out-File -FilePath $tempFile
    
    # Create ZIP
    try {
        $filesToZip = Get-Content $tempFile
        Compress-Archive -Path $filesToZip -DestinationPath $backupFile -Force
        Write-Success "Backup created: $backupFile"
    }
    catch {
        Write-Error "Failed to create backup: $($_.Exception.Message)"
    }
    finally {
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
}

# فحص حالة Git
function Test-GitStatus {
    Write-Info "فحص حالة Git..."
    
    $status = git status --porcelain
    if ($status) {
        Write-Warning "يوجد تغييرات غير محفوظة"
        git status --short
        
        $response = Read-Host "هل تريد حفظ التغييرات؟ (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            $commitMessage = Read-Host "أدخل رسالة الـ commit"
            git add .
            git commit -m $commitMessage
            Write-Success "تم حفظ التغييرات"
        } else {
            Write-Warning "لم يتم حفظ التغييرات"
        }
    } else {
        Write-Success "جميع التغييرات محفوظة"
    }
}

# إنشاء إصدار جديد
function New-Release {
    Write-Info "إنشاء إصدار جديد..."
    
    # الحصول على آخر tag
    try {
        $lastTag = git describe --tags --abbrev=0 2>$null
        if (!$lastTag) { $lastTag = "v0.0.0" }
    }
    catch {
        $lastTag = "v0.0.0"
    }
    
    Write-Info "آخر إصدار: $lastTag"
    
    # تحليل رقم الإصدار
    if ($lastTag -match "v(\d+)\.(\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        $patch = [int]$Matches[3]
        
        $suggestedPatch = "v$major.$minor.$($patch + 1)"
        $suggestedMinor = "v$major.$($minor + 1).0"
        $suggestedMajor = "v$($major + 1).0.0"
    } else {
        $suggestedPatch = "v1.0.0"
        $suggestedMinor = "v1.0.0"
        $suggestedMajor = "v1.0.0"
    }
    
    Write-Host "اختر نوع الإصدار:"
    Write-Host "1) Patch ($suggestedPatch) - إصلاحات bugs"
    Write-Host "2) Minor ($suggestedMinor) - ميزات جديدة"
    Write-Host "3) Major ($suggestedMajor) - تغييرات جذرية"
    Write-Host "4) مخصص"
    
    $choice = Read-Host "اختر (1-4)"
    
    switch ($choice) {
        1 { $newTag = $suggestedPatch }
        2 { $newTag = $suggestedMinor }
        3 { $newTag = $suggestedMajor }
        4 { $newTag = Read-Host "أدخل رقم الإصدار (مثال: v1.2.3)" }
        default {
            Write-Error "اختيار غير صحيح"
            return
        }
    }
    
    $releaseMessage = Read-Host "أدخل وصف الإصدار"
    
    # إنشاء الـ tag
    git tag -a $newTag -m $releaseMessage
    Write-Success "تم إنشاء الإصدار: $newTag"
}

# بناء المشروع
function Build-Project {
    Write-Info "بناء المشروع..."
    
    # بناء Cloud Functions
    if (Test-Path "functions") {
        Write-Info "بناء Cloud Functions..."
        Push-Location "functions"
        try {
            npm install
            npm run build
            Write-Success "تم بناء Cloud Functions"
        }
        catch {
            Write-Error "فشل في بناء Cloud Functions: $($_.Exception.Message)"
        }
        finally {
            Pop-Location
        }
    }
    
    Write-Success "تم بناء المشروع بنجاح"
}

# اختبار المشروع
function Test-Project {
    Write-Info "اختبار المشروع..."
    
    # اختبار Firebase Functions
    if (Test-Path "functions") {
        Push-Location "functions"
        try {
            npm run test 2>$null
            Write-Success "اختبارات Functions نجحت"
        }
        catch {
            Write-Warning "لا توجد اختبارات Functions أو فشلت"
        }
        finally {
            Pop-Location
        }
    }
    
    # فحص ملفات Firebase
    if (Test-Path "firebase.json") {
        Write-Success "ملف firebase.json موجود"
    } else {
        Write-Error "ملف firebase.json غير موجود"
        return
    }
    
    if (Test-Path "firestore.rules") {
        Write-Success "ملف firestore.rules موجود"
    } else {
        Write-Warning "ملف firestore.rules غير موجود"
    }
    
    Write-Success "اكتملت الاختبارات"
}

# النشر على Firebase
function Deploy-Firebase {
    param($Environment = "prod")
    
    Write-Info "النشر على Firebase - البيئة: $Environment"
    
    switch ($Environment) {
        "dev" { 
            try { firebase use development } catch { Write-Warning "مشروع development غير موجود" }
        }
        "prod" { 
            try { firebase use production } catch { firebase use default }
        }
        default { firebase use default }
    }
    
    # نشر انتقائي
    Write-Host "اختر ما تريد نشره:"
    Write-Host "1) الكل (hosting + functions + firestore)"
    Write-Host "2) الواجهة فقط (hosting)"
    Write-Host "3) الوظائف فقط (functions)"
    Write-Host "4) قوانين قاعدة البيانات فقط (firestore:rules)"
    
    $deployChoice = Read-Host "اختر (1-4)"
    
    try {
        switch ($deployChoice) {
            1 { firebase deploy }
            2 { firebase deploy --only hosting }
            3 { firebase deploy --only functions }
            4 { firebase deploy --only firestore:rules }
            default {
                Write-Error "اختيار غير صحيح"
                return
            }
        }
        Write-Success "تم النشر بنجاح"
    }
    catch {
        Write-Error "فشل النشر: $($_.Exception.Message)"
    }
}

# رفع على GitHub
function Push-ToGitHub {
    Write-Info "رفع على GitHub..."
    
    try {
        # رفع الكود
        $currentBranch = git branch --show-current
        git push origin $currentBranch
        
        # رفع الـ tags
        git push origin --tags
        
        Write-Success "تم الرفع على GitHub"
    }
    catch {
        Write-Error "فشل الرفع على GitHub: $($_.Exception.Message)"
    }
}

# تنظيف الملفات
function Clear-TempFiles {
    Write-Info "تنظيف الملفات المؤقتة..."
    
    # حذف ملفات مؤقتة
    Get-ChildItem -Recurse -Filter "*.tmp" | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Filter ".DS_Store" | Remove-Item -Force -ErrorAction SilentlyContinue
    
    # تنظيف cache
    if (Test-Path "functions/node_modules") {
        Push-Location "functions"
        npm prune
        Pop-Location
    }
    
    Write-Success "تم التنظيف"
}

# عرض الإحصائيات
function Show-ProjectStats {
    Write-Info "إحصائيات المشروع:"
    
    # إحصائيات Git
    $commitCount = git rev-list --count HEAD
    $lastCommit = git log -1 --format="%h - %s (%cr)"
    $currentBranch = git branch --show-current
    
    Write-Host "📊 إحصائيات Git:" -ForegroundColor $Color.Blue
    Write-Host "   - عدد الـ commits: $commitCount"
    Write-Host "   - آخر commit: $lastCommit"
    Write-Host "   - الفرع الحالي: $currentBranch"
    
    # إحصائيات الملفات
    if (Test-Path "public") {
        $htmlFiles = (Get-ChildItem -Path "public" -Filter "*.html" -Recurse).Count
        $jsFiles = if (Test-Path "public/assets/js") {
            (Get-ChildItem -Path "public/assets/js" -Filter "*.js" -Recurse).Count
        } else { 0 }
        
        Write-Host "📁 ملفات المشروع:" -ForegroundColor $Color.Blue
        Write-Host "   - ملفات HTML: $htmlFiles"
        Write-Host "   - ملفات JS: $jsFiles"
    }
    
    # إحصائيات Cloud Functions
    if (Test-Path "functions/src") {
        $tsFiles = (Get-ChildItem -Path "functions/src" -Filter "*.ts" -Recurse).Count
        Write-Host "⚡ Cloud Functions:" -ForegroundColor $Color.Blue
        Write-Host "   - ملفات TypeScript: $tsFiles"
    }
}

# العملية الشاملة
function Start-FullDeployment {
    Write-Info "بدء العملية الشاملة..."
    
    Test-Requirements
    New-Backup
    Test-GitStatus
    Build-Project
    Test-Project
    
    $createRelease = Read-Host "هل تريد إنشاء إصدار جديد؟ (y/n)"
    if ($createRelease -eq 'y' -or $createRelease -eq 'Y') {
        New-Release
    }
    
    $env = Read-Host "أدخل البيئة للنشر (dev/prod)"
    Deploy-Firebase $env
    
    Push-ToGitHub
    Clear-TempFiles
    
    Write-Success "اكتملت العملية الشاملة بنجاح! 🎉"
    Show-ProjectStats
}

# القائمة الرئيسية
function Show-MainMenu {
    Clear-Host
    Write-Host "🚀 مدير إصدارات نظام الأرشيف" -ForegroundColor $Color.Green
    Write-Host "==================================" -ForegroundColor $Color.Green
    Write-Host "1)  فحص المتطلبات"
    Write-Host "2)  إنشاء نسخة احتياطية"
    Write-Host "3)  فحص حالة Git"
    Write-Host "4)  إنشاء إصدار جديد"
    Write-Host "5)  بناء المشروع"
    Write-Host "6)  اختبار المشروع"
    Write-Host "7)  النشر على Firebase"
    Write-Host "8)  رفع على GitHub"
    Write-Host "9)  تنظيف الملفات"
    Write-Host "10) عرض الإحصائيات"
    Write-Host "11) عملية شاملة (الكل)"
    Write-Host "0)  خروج"
    Write-Host ""
    
    $choice = Read-Host "اختر (0-11)"
    
    switch ($choice) {
        1 { Test-Requirements }
        2 { New-Backup }
        3 { Test-GitStatus }
        4 { New-Release }
        5 { Build-Project }
        6 { Test-Project }
        7 { 
            $env = Read-Host "أدخل البيئة (dev/prod)"
            Deploy-Firebase $env
        }
        8 { Push-ToGitHub }
        9 { Clear-TempFiles }
        10 { Show-ProjectStats }
        11 { Start-FullDeployment }
        0 { exit }
        default { Write-Error "اختيار غير صحيح" }
    }
    
    if ($choice -ne 0) {
        Write-Host ""
        Read-Host "اضغط Enter للمتابعة..."
    }
}

# نقطة البداية
if ($args.Count -eq 0) {
    # تشغيل القائمة التفاعلية
    do {
        Show-MainMenu
    } while ($true)
} else {
    # تشغيل الأمر المباشر
    switch ($args[0]) {
        "check" { Test-Requirements }
        "backup" { New-Backup }
        "status" { Test-GitStatus }
        "release" { New-Release }
        "build" { Build-Project }
        "test" { Test-Project }
        "deploy" { Deploy-Firebase $args[1] }
        "push" { Push-ToGitHub }
        "cleanup" { Clear-TempFiles }
        "stats" { Show-ProjectStats }
        "full" { Start-FullDeployment }
        default {
            Write-Host "الاستخدام: .\version-manager.ps1 [check|backup|status|release|build|test|deploy|push|cleanup|stats|full]"
        }
    }
}
