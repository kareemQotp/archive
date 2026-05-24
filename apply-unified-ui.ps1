# تطبيق النظام الموحد للواجهة على جميع صفحات HTML
# PowerShell Script for Archive System Unified UI Implementation

param(
    [string]$BackupPrefix = "ui_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

Write-Host "🎨 تطبيق النظام الموحد للواجهة على جميع الصفحات" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# تحديد مجلد العمل
$archiveRoot = "d:\Archive 2.1"
$publicDir = Join-Path $archiveRoot "public"

if (-not (Test-Path $publicDir)) {
    Write-Host "❌ مجلد public غير موجود: $publicDir" -ForegroundColor Red
    exit 1
}

Set-Location $archiveRoot

# إنشاء نسخة احتياطية
$backupDir = Join-Path $archiveRoot "backups\$BackupPrefix"
Write-Host "📦 إنشاء نسخة احتياطية: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# نسخ ملفات HTML الحالية للنسخة الاحتياطية
Get-ChildItem -Path $publicDir -Filter "*.html" | ForEach-Object {
    Copy-Item $_.FullName -Destination $backupDir
    Write-Host "  ✅ تم نسخ: $($_.Name)" -ForegroundColor Green
}

# قائمة ملفات HTML المراد تحديثها
$htmlFiles = @(
    "index.html",
    "login.html", 
    "register.html",
    "dashboard.html",
    "search.html",
    "upload.html",
    "profile.html",
    "scanner.html",
    "file-management-dashboard.html",
    "activity-logs.html",
    "users.html",
    "system-analytics.html",
    "archive-dashboard.html",
    "collection-dashboard.html",
    "legal-dashboard.html",
    "it-dashboard.html",
    "governance-dashboard.html",
    "securitization-dashboard.html",
    "administration-dashboard.html",
    "operations-dashboard.html",
    "notifications.html",
    "reports.html",
    "help.html",
    "settings.html",
    "file-viewer.html",
    "admin-panel.html",
    "bulk-upload.html",
    "file-tracking.html",
    "archive-management.html",
    "department-admin.html",
    "create-case.html",
    "case-files.html",
    "case-viewer.html",
    "legal-cases.html",
    "payroll.html",
    "employee-files.html",
    "hr-analytics.html",
    "budget.html",
    "financial-reports.html",
    "collection-reports.html",
    "it-requests.html",
    "system-monitoring.html",
    "backup-restore.html",
    "maintenance.html",
    "quick-search.html",
    "advanced-search.html",
    "file-preview.html"
)

# تطبيق التحديثات على كل ملف
$updatedCount = 0
$errorCount = 0

foreach ($fileName in $htmlFiles) {
    $filePath = Join-Path $publicDir $fileName
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  الملف غير موجود: $fileName" -ForegroundColor Yellow
        continue
    }
    
    try {
        Write-Host "🔧 معالجة: $fileName" -ForegroundColor Cyan
        
        # قراءة محتوى الملف
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # تطبيق التحديثات المطلوبة
        $originalContent = $content
        
        # 1. تحديث CSS المرجعي
        $content = $content -replace 'href="assets/css/sidebar\.css"', 'href="assets/css/unified-sidebar.css"'
        
        # 2. إضافة CSS الموحد إذا لم يكن موجود
        if ($content -notmatch 'unified-sidebar\.css') {
            $content = $content -replace '(\s*<link\s+rel="stylesheet"\s+href="assets/css/style\.css">)', "`$1`n    <link rel=""stylesheet"" href=""assets/css/unified-sidebar.css"">"
        }
        
        # 3. تحديث مرجع JavaScript
        $content = $content -replace '<script\s+src="assets/js/sidebar\.js"></script>', '<!-- Unified UI Template System -->
    <script src="assets/js/unified-ui-template.js"></script>'
        
        # 4. تحديث هيكل Sidebar إذا كان بسيط
        if ($content -match '<div class="sidebar"[^>]*>\s*<div class="sidebar-header">\s*<h5[^>]*>([^<]+)</h5>\s*<button[^>]*>\s*<i class="fas fa-times"></i>\s*</button>\s*</div>\s*<ul class="sidebar-nav"[^>]*>\s*<!--[^>]*-->\s*</ul>\s*</div>') {
            $sidebarTitle = $matches[1]
            $unifiedSidebar = @"
    <div class="sidebar" id="sidebar" aria-hidden="true">
        <div class="sidebar-header">
            <div class="d-flex align-items-center">
                <div class="logo">
                    <i class="fas fa-archive"></i>
                </div>
                <div>
                    <h5 class="mb-0">نظام الأرشيف</h5>
                    <small>$sidebarTitle</small>
                </div>
            </div>
            <button class="sidebar-close" id="sidebarClose" title="إغلاق القائمة" aria-label="إغلاق القائمة">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="user-info">
            <div class="d-flex align-items-center">
                <div class="user-avatar" id="userAvatar">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <div class="user-name" id="userName">مستخدم</div>
                    <div class="user-role" id="userRole">عام</div>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav" id="sidebarNav" role="navigation" aria-label="القائمة الرئيسية">
            <!-- Will be populated by UnifiedUITemplate -->
        </nav>
        <div class="sidebar-footer">
            <small>نظام الأرشيف الإلكتروني v2.1</small>
        </div>
    </div>
"@
            $content = $content -replace '<div class="sidebar"[^>]*>.*?</div>(?=\s*<div class="container"|\s*<main|\s*$)', $unifiedSidebar
        }
        
        # 5. إضافة تهيئة UnifiedUITemplate في JavaScript
        if ($content -match "document\.addEventListener\('DOMContentLoaded'") {
            $content = $content -replace "document\.addEventListener\('DOMContentLoaded',\s*async?\s*function\(\)\s*\{", @"
document.addEventListener('DOMContentLoaded', async function() {
            // Initialize Unified UI Template
            const unifiedUI = new UnifiedUITemplate();
            await unifiedUI.initialize();
"@
        }
        
        # 6. تحديث استدعاءات sidebar manager
        $content = $content -replace 'window\.sidebarManager\.updateSidebarNav\([^)]*\)', @"
const unifiedUI = window.unifiedUITemplate;
            if (unifiedUI) {
                unifiedUI.updateSidebar();
            }
"@
        
        # حفظ الملف إذا تم تعديله
        if ($content -ne $originalContent) {
            Set-Content $filePath -Value $content -Encoding UTF8
            Write-Host "  ✅ تم تحديث: $fileName" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host "  ℹ️  لا يحتاج تحديث: $fileName" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  ❌ خطأ في معالجة $fileName : $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "📊 تقرير التحديث:" -ForegroundColor Cyan
Write-Host "  - تم تحديث: $updatedCount ملف" -ForegroundColor Green
Write-Host "  - أخطاء: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host "  - نسخة احتياطية: $backupDir" -ForegroundColor Yellow

# إنشاء ملف تقرير
$reportPath = Join-Path $archiveRoot "UI_UPDATE_REPORT_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
$report = @"
# تقرير تطبيق النظام الموحد للواجهة

## معلومات التحديث
- **التاريخ**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **النسخة الاحتياطية**: $BackupPrefix
- **الملفات المحدثة**: $updatedCount
- **الأخطاء**: $errorCount

## الملفات المعالجة
$(foreach ($file in $htmlFiles) {
    $filePath = Join-Path $publicDir $file
    if (Test-Path $filePath) {
        "- ✅ $file"
    } else {
        "- ⚠️ $file (غير موجود)"
    }
})

## التحسينات المطبقة
1. **CSS الموحد**: تحديث المراجع لاستخدام unified-sidebar.css
2. **JavaScript الموحد**: استخدام unified-ui-template.js
3. **هيكل Sidebar محسّن**: قائمة جانبية موحدة مع معلومات المستخدم
4. **تهيئة تلقائية**: إضافة UnifiedUITemplate لكل صفحة
5. **إمكانية الوصول**: تحسين ARIA labels والملاحة

## الخطوات التالية
1. اختبار الصفحات المحدثة
2. التحقق من الاتساق البصري
3. اختبار إمكانية الوصول
4. نشر التحديثات

---
*تم إنشاء هذا التقرير تلقائياً بواسطة سكريبت تطبيق النظام الموحد*
"@

Set-Content $reportPath -Value $report -Encoding UTF8
Write-Host "📝 تم إنشاء تقرير التحديث: $reportPath" -ForegroundColor Cyan

if ($errorCount -eq 0) {
    Write-Host "🎉 تم تطبيق النظام الموحد بنجاح على جميع الصفحات!" -ForegroundColor Green
} else {
    Write-Host "⚠️  تم التحديث مع بعض الأخطاء. راجع التفاصيل أعلاه." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 للتحقق من النتائج:" -ForegroundColor Cyan
Write-Host "   firebase serve --only hosting" -ForegroundColor White
Write-Host ""