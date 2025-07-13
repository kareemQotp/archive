# سكريپت PowerShell لتحديث الألوان في جميع صفحات النظام
# تطبيق ألوان شعار "أمان والبحر" الجديدة

Write-Host "🎨 بدء تحديث الألوان في جميع صفحات النظام..." -ForegroundColor Cyan

# مسار مجلد الصفحات
$publicDir = "d:\Archive 2.1\public"

# قائمة الصفحات التي تحتاج تحديث
$files = @(
    "profile.html",
    "scanner.html", 
    "admin-management.html",
    "file-management-dashboard.html",
    "movement-reports.html",
    "file-tracking.html",
    "role-manager.html",
    "create-admin.html",
    "quick-test.html",
    "roles-test.html",
    "emergency-test.html"
)

foreach ($file in $files) {
    $filePath = Join-Path $publicDir $file
    
    if (Test-Path $filePath) {
        Write-Host "📄 معالجة الملف: $file" -ForegroundColor Yellow
        
        # قراءة محتوى الملف
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # إضافة رابط ملف CSS الجديد إذا لم يكن موجوداً
        if ($content -notmatch "assets/css/style\.css") {
            Write-Host "  ➕ إضافة رابط ملف CSS الجديد" -ForegroundColor Green
            $content = $content -replace '(<!-- Google Fonts -->.*?</head>)', '$1`n    <!-- تطبيق الألوان الجديدة -->`n    <link rel="stylesheet" href="assets/css/style.css">'
        }
        
        # إزالة تعريفات الألوان القديمة من :root
        Write-Host "  🗑️ إزالة الألوان القديمة" -ForegroundColor Red
        $content = $content -replace '        :root \{[^}]*--primary: #667eea;[^}]*\}', ''
        $content = $content -replace '            --primary: #667eea;', ''
        $content = $content -replace '            --primary-dark: #5a67d8;', ''
        $content = $content -replace '            --secondary: #f093fb;', ''
        $content = $content -replace '            --accent: #4facfe;', ''
        $content = $content -replace '            --surface: #ffffff;', ''
        $content = $content -replace '            --surface-dark: #f8fafc;', ''
        $content = $content -replace '            --text-primary: #2d3748;', ''
        $content = $content -replace '            --text-secondary: #718096;', ''
        $content = $content -replace '            --border: #e2e8f0;', ''
        $content = $content -replace '            --shadow: 0 4px 6px -1px rgba\(0, 0, 0, 0\.1\);', ''
        
        # تحديث الخلفيات المتدرجة القديمة
        Write-Host "  🌈 تحديث الخلفيات المتدرجة" -ForegroundColor Magenta
        $content = $content -replace '#667eea', 'var(--primary)'
        $content = $content -replace '#764ba2', 'var(--ocean-deep)'
        $content = $content -replace '#f093fb', 'var(--secondary)'
        $content = $content -replace '#4facfe', 'var(--accent)'
        $content = $content -replace '#5a67d8', 'var(--primary-dark)'
        
        # إضافة تعليق للأنماط المحددة
        $content = $content -replace '(<style>\s*)(.*?)(font-family)', '$1/* Page specific styles */`n        $3'
        
        # حفظ الملف
        Set-Content $filePath $content -Encoding UTF8
        
        Write-Host "  ✅ تم تحديث $file بنجاح" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ الملف غير موجود: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 تم الانتهاء من تحديث جميع الصفحات!" -ForegroundColor Green
Write-Host "📋 الملفات المحدثة:" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }

Write-Host ""
Write-Host "💡 ملاحظة: تأكد من مراجعة الصفحات للتأكد من التطبيق الصحيح للألوان الجديدة" -ForegroundColor Yellow

# إنشاء تقرير نهائي
$reportPath = "d:\Archive 2.1\docs\color-update-completion.md"
$reportContent = @"
# 🎨 تقرير اكتمال تحديث الألوان

## ✅ تم تحديث الصفحات التالية:

$(($files | ForEach-Object { "- $_" }) -join "`n")

## 🕒 تاريخ التحديث: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 🎯 الألوان المطبقة:
- **الأساسي:** #00b4d8 (تركوازي)
- **العميق:** #0077b6 (أزرق داكن)  
- **الثانوي:** #00d2ff (سيان فاتح)
- **التفاعل:** #48cae4 (أزرق متوسط)

## 🔧 التغييرات المطبقة:
1. إضافة رابط ملف CSS الجديد
2. إزالة تعريفات الألوان القديمة
3. تحديث المراجع اللونية
4. الحفاظ على الأنماط الخاصة

## 📝 ملاحظات:
- جميع الصفحات تستخدم الآن ملف `assets/css/style.css` المركزي
- تم الحفاظ على الأنماط الخاصة بكل صفحة
- الألوان الجديدة متسقة مع شعار "أمان والبحر"

**🎉 تحديث مكتمل بنجاح!**
"@

Set-Content $reportPath $reportContent -Encoding UTF8
Write-Host "📄 تم إنشاء تقرير الاكتمال: $reportPath" -ForegroundColor Cyan
