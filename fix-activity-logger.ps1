# Fix Activity Logger calls in page-permissions.html
$filePath = "public\page-permissions.html"
$content = Get-Content $filePath -Raw

# Remove all conditional checks and just call logActivity directly
$content = $content -replace 'if \(localActivityLogger\) \{\s*logActivity\(([^)]+)\);\s*\}', 'logActivity($1);'

# Remove page and timestamp parameters
$content = $content -replace ',\s*page:\s*[''"]page-permissions[''"],?', ''
$content = $content -replace ',\s*timestamp:\s*new Date\(\)\.toISOString\(\),?', ''

# Fix any remaining syntax issues with trailing commas
$content = $content -replace ',\s*\}', ' }'

# Save the fixed content
Set-Content $filePath $content

Write-Host "Activity Logger calls fixed successfully!"
