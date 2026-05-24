# Comprehensive fix for Activity Logger calls
$filePath = "public\page-permissions.html"
$content = Get-Content $filePath -Raw

# Replace multiline if statements with logActivity calls
$pattern = 'if \(localActivityLogger\) \{\s*logActivity\(([^,]+),\s*\{([^}]*)\}\);\s*\}'
$replacement = 'logActivity($1, {$2});'
$content = $content -replace $pattern, $replacement

# Remove page field from all logActivity calls
$content = $content -replace 'page:\s*[''"]page-permissions[''"],?\s*', ''

# Remove timestamp field from all logActivity calls  
$content = $content -replace 'timestamp:\s*new Date\(\)\.toISOString\(\),?\s*', ''

# Fix trailing commas in objects
$content = $content -replace ',\s*\}', ' }'

# Fix cases where only page and timestamp were in the object
$content = $content -replace 'logActivity\(([^,]+),\s*\{\s*\}\)', 'logActivity($1)'

Set-Content $filePath $content
Write-Host "Comprehensive Activity Logger fix applied!"
