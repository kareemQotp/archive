# Update All Dashboards with Role-Based Routing
# يحدث جميع صفحات الداشبورد لإضافة نظام التوجيه الذكي

$dashboards = @(
    "legal-dashboard.html",
    "file-management-dashboard.html", 
    "collection-dashboard.html"
)

foreach ($dashboard in $dashboards) {
    $filePath = "public\$dashboard"
    
    if (Test-Path $filePath) {
        Write-Host "تحديث $dashboard..." -ForegroundColor Yellow
        
        # Read file content
        $content = Get-Content $filePath -Raw
        
        # Add role-based routing script after unified-auth.js
        $oldPattern = '    <!-- Notification System -->'
        $newPattern = @"
    <!-- Role-Based Routing System -->
    <script src="assets/js/role-based-routing.js"></script>
    
    <!-- Notification System -->
"@
        
        if ($content -match [regex]::Escape($oldPattern)) {
            $updatedContent = $content -replace [regex]::Escape($oldPattern), $newPattern
            Set-Content $filePath $updatedContent -Encoding UTF8
            Write-Host "تم تحديث $dashboard ✅" -ForegroundColor Green
        } else {
            Write-Host "لم يتم العثور على النمط في $dashboard ⚠️" -ForegroundColor Yellow
        }
    } else {
        Write-Host "الملف غير موجود: $dashboard ❌" -ForegroundColor Red
    }
}

Write-Host "انتهى تحديث جميع الداشبوردات" -ForegroundColor Cyan