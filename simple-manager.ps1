# Archive System - Simple Version Manager

# Get project information
function Get-ProjectInfo {
    Write-Host "Archive System - Project Information" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    
    # Git information
    Write-Host "Git Status:" -ForegroundColor Cyan
    $currentBranch = git branch --show-current
    $commitCount = git rev-list --count HEAD
    $lastCommit = git log -1 --format="%h - %s (%cr)"
    
    Write-Host "  Current Branch: $currentBranch"
    Write-Host "  Total Commits: $commitCount" 
    Write-Host "  Last Commit: $lastCommit"
    
    # Check for tags
    $tags = git tag --list
    if ($tags) {
        Write-Host "  Total Releases: $($tags.Count)"
        $latestTag = git describe --tags --abbrev=0 2>$null
        if ($latestTag) {
            Write-Host "  Latest Release: $latestTag"
        }
    } else {
        Write-Host "  No releases yet"
    }
    
    Write-Host ""
    Write-Host "Project Files:" -ForegroundColor Cyan
    
    # Count files
    if (Test-Path "public") {
        $htmlFiles = (Get-ChildItem -Path "public" -Filter "*.html" -Recurse).Count
        Write-Host "  HTML Files: $htmlFiles"
        
        if (Test-Path "public/assets/js") {
            $jsFiles = (Get-ChildItem -Path "public/assets/js" -Filter "*.js" -Recurse).Count
            Write-Host "  JavaScript Files: $jsFiles"
        }
    }
    
    if (Test-Path "functions") {
        if (Test-Path "functions/src") {
            $tsFiles = (Get-ChildItem -Path "functions/src" -Filter "*.ts" -Recurse).Count
            Write-Host "  TypeScript Files: $tsFiles"
        }
    }
    
    if (Test-Path "docs") {
        $docFiles = (Get-ChildItem -Path "docs" -Filter "*.md" -Recurse).Count
        Write-Host "  Documentation Files: $docFiles"
    }
    
    Write-Host ""
    Write-Host "Repository:" -ForegroundColor Cyan
    $remote = git remote get-url origin 2>$null
    if ($remote) {
        Write-Host "  GitHub URL: $remote"
    }
    Write-Host "  Local Path: $PWD"
}

# Main execution
param($Command)

if ($Command -eq "stats" -or $Command -eq "info") {
    Get-ProjectInfo
} else {
    Write-Host "Archive System Version Manager" -ForegroundColor Green
    Write-Host "============================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\simple-manager.ps1 stats  - Show project statistics"
    Write-Host "  .\simple-manager.ps1 info   - Show project information"
    Write-Host ""
    Write-Host "For full version management, use the interactive menu:"
    Write-Host "  .\simple-manager.ps1"
    Write-Host ""
    
    if (-not $Command) {
        $choice = Read-Host "Show project info now? (y/n)"
        if ($choice -eq 'y' -or $choice -eq 'Y') {
            Get-ProjectInfo
        }
    }
}
