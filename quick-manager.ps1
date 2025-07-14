# أداة إدارة الإصدارات - نظام الأرشيف
# Version Manager for Archive System

# فحص حالة Git
function Get-GitStatus {
    Write-Host "📊 حالة Git:" -ForegroundColor Cyan
    Write-Host "   - الفرع الحالي: $(git branch --show-current)" -ForegroundColor White
    Write-Host "   - عدد الـ commits: $(git rev-list --count HEAD)" -ForegroundColor White
    Write-Host "   - آخر commit: $(git log -1 --format='%h - %s (%cr)')" -ForegroundColor White
    
    $tags = git tag --list | Measure-Object | Select-Object -ExpandProperty Count
    Write-Host "   - عدد الإصدارات: $tags" -ForegroundColor White
    
    if ($tags -gt 0) {
        $latestTag = git describe --tags --abbrev=0
        Write-Host "   - آخر إصدار: $latestTag" -ForegroundColor White
    }
}

# عرض إحصائيات المشروع
function Get-ProjectStats {
    Write-Host "🚀 إحصائيات نظام الأرشيف" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    
    Get-GitStatus
    
    Write-Host ""
    Write-Host "📁 ملفات المشروع:" -ForegroundColor Cyan
    
    if (Test-Path "public") {
        $htmlFiles = (Get-ChildItem -Path "public" -Filter "*.html" -Recurse).Count
        Write-Host "   - ملفات HTML: $htmlFiles" -ForegroundColor White
        
        if (Test-Path "public/assets/js") {
            $jsFiles = (Get-ChildItem -Path "public/assets/js" -Filter "*.js" -Recurse).Count
            Write-Host "   - ملفات JavaScript: $jsFiles" -ForegroundColor White
        }
    }
    
    if (Test-Path "functions/src") {
        $tsFiles = (Get-ChildItem -Path "functions/src" -Filter "*.ts" -Recurse).Count
        Write-Host "   - ملفات TypeScript: $tsFiles" -ForegroundColor White
    }
    
    if (Test-Path "docs") {
        $docFiles = (Get-ChildItem -Path "docs" -Filter "*.md" -Recurse).Count
        Write-Host "   - ملفات التوثيق: $docFiles" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "🔗 روابط المشروع:" -ForegroundColor Cyan
    $remote = git remote get-url origin
    Write-Host "   - GitHub: $remote" -ForegroundColor White
    Write-Host "   - المجلد المحلي: $PWD" -ForegroundColor White
}

# إنشاء إصدار جديد
function New-ProjectRelease {
    param($Version, $Message)
    
    Write-Host "🏷️ إنشاء إصدار جديد..." -ForegroundColor Yellow
    
    if (-not $Version) {
        # الحصول على آخر إصدار
        try {
            $lastTag = git describe --tags --abbrev=0 2>$null
            if (-not $lastTag) { $lastTag = "v0.0.0" }
        }
        catch {
            $lastTag = "v0.0.0"
        }
        
        Write-Host "آخر إصدار: $lastTag" -ForegroundColor White
        
        # اقتراح إصدارات
        if ($lastTag -match "v(\d+)\.(\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            $patch = [int]$Matches[3]
            
            $suggestedPatch = "v$major.$minor.$($patch + 1)"
            $suggestedMinor = "v$major.$($minor + 1).0"
            $suggestedMajor = "v$($major + 1).0.0"
        }
        else {
            $suggestedPatch = "v1.0.1"
            $suggestedMinor = "v1.1.0"
            $suggestedMajor = "v2.0.0"
        }
        
        Write-Host "اختر نوع الإصدار:"
        Write-Host "1) Patch ($suggestedPatch) - إصلاحات أخطاء"
        Write-Host "2) Minor ($suggestedMinor) - ميزات جديدة"
        Write-Host "3) Major ($suggestedMajor) - تغييرات جذرية"
        Write-Host "4) مخصص"
        
        $choice = Read-Host "اختر (1-4)"
        
        switch ($choice) {
            1 { $Version = $suggestedPatch }
            2 { $Version = $suggestedMinor }
            3 { $Version = $suggestedMajor }
            4 { $Version = Read-Host "أدخل رقم الإصدار (مثل: v1.2.3)" }
            default {
                Write-Host "❌ اختيار غير صحيح" -ForegroundColor Red
                return
            }
        }
    }
    
    if (-not $Message) {
        $Message = Read-Host "أدخل وصف الإصدار"
    }
    
    # إنشاء التاج
    git tag -a $Version -m $Message
    Write-Host "✅ تم إنشاء الإصدار: $Version" -ForegroundColor Green
    
    # رفع التاج
    $pushChoice = Read-Host "هل تريد رفع الإصدار على GitHub؟ (y/n)"
    if ($pushChoice -eq 'y' -or $pushChoice -eq 'Y') {
        git push origin $Version
        Write-Host "✅ تم رفع الإصدار على GitHub" -ForegroundColor Green
    }
}

# نشر سريع
function Deploy-Quick {
    Write-Host "🚀 نشر سريع للمشروع..." -ForegroundColor Yellow
    
    # فحص التغييرات
    $status = git status --porcelain
    if ($status) {
        Write-Host "⚠️ يوجد تغييرات غير محفوظة" -ForegroundColor Yellow
        git status --short
        
        $commit = Read-Host "هل تريد حفظ التغييرات؟ (y/n)"
        if ($commit -eq 'y' -or $commit -eq 'Y') {
            $message = Read-Host "أدخل رسالة الحفظ"
            git add .
            git commit -m $message
            Write-Host "✅ تم حفظ التغييرات" -ForegroundColor Green
        }
    }
    
    # رفع على GitHub
    $push = Read-Host "هل تريد رفع التحديثات على GitHub؟ (y/n)"
    if ($push -eq 'y' -or $push -eq 'Y') {
        $branch = git branch --show-current
        git push origin $branch
        Write-Host "✅ تم رفع التحديثات" -ForegroundColor Green
    }
    
    # نشر على Firebase
    $deploy = Read-Host "هل تريد النشر على Firebase؟ (y/n)"
    if ($deploy -eq 'y' -or $deploy -eq 'Y') {
        Write-Host "اختر نوع النشر:"
        Write-Host "1) نشر كامل"
        Write-Host "2) الواجهة فقط (hosting)"
        Write-Host "3) الوظائف فقط (functions)"
        
        $deployChoice = Read-Host "اختر (1-3)"
        
        try {
            switch ($deployChoice) {
                1 { firebase deploy }
                2 { firebase deploy --only hosting }
                3 { firebase deploy --only functions }
                default { firebase deploy }
            }
            Write-Host "✅ تم النشر بنجاح" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ فشل النشر: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# القائمة الرئيسية
function Show-Menu {
    Clear-Host
    Write-Host "🚀 مدير إصدارات نظام الأرشيف" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1) عرض إحصائيات المشروع"
    Write-Host "2) إنشاء إصدار جديد"
    Write-Host "3) نشر سريع (commit + push + deploy)"
    Write-Host "4) فحص حالة Git"
    Write-Host "5) فتح GitHub في المتصفح"
    Write-Host "0) خروج"
    Write-Host ""
    
    $choice = Read-Host "اختر (0-5)"
    
    switch ($choice) {
        1 { Get-ProjectStats }
        2 { New-ProjectRelease }
        3 { Deploy-Quick }
        4 { Get-GitStatus }
        5 { 
            $url = git remote get-url origin
            $url = $url -replace "\.git$", ""
            Start-Process $url
            Write-Host "✅ تم فتح GitHub في المتصفح" -ForegroundColor Green
        }
        0 { exit }
        default { Write-Host "❌ اختيار غير صحيح" -ForegroundColor Red }
    }
    
    if ($choice -ne 0) {
        Write-Host ""
        Read-Host "اضغط Enter للمتابعة..."
    }
}

# نقطة البداية
param($Action, $Version, $Message)

if ($Action) {
    # تشغيل مباشر
    switch ($Action) {
        "stats" { Get-ProjectStats }
        "status" { Get-GitStatus }
        "release" { New-ProjectRelease -Version $Version -Message $Message }
        "deploy" { Deploy-Quick }
        default { 
            Write-Host "الاستخدام: .\quick-manager.ps1 [stats|status|release|deploy]"
            Write-Host "أو شغل بدون معاملات للقائمة التفاعلية"
        }
    }
}
else {
    # القائمة التفاعلية
    do {
        Show-Menu
    } while ($true)
}
