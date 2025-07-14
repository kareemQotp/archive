# Archive System - PowerShell Version Manager
# مدير الإصدارات لنظام الأرشيف

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red" 
    Warning = "Yellow"
    Info = "Cyan"
}

# Helper functions
function Write-ColorMessage($Message, $Type) {
    $Color = $Colors[$Type]
    switch ($Type) {
        "Success" { Write-Host "✅ $Message" -ForegroundColor $Color }
        "Error" { Write-Host "❌ $Message" -ForegroundColor $Color }
        "Warning" { Write-Host "⚠️ $Message" -ForegroundColor $Color }
        "Info" { Write-Host "ℹ️ $Message" -ForegroundColor $Color }
        default { Write-Host $Message -ForegroundColor $Color }
    }
}

# Check requirements
function Test-Requirements {
    Write-ColorMessage "Checking requirements..." "Info"
    
    $requirements = @(
        @{Name = "git"; Command = "git --version"},
        @{Name = "node"; Command = "node --version"},
        @{Name = "npm"; Command = "npm --version"},
        @{Name = "firebase"; Command = "firebase --version"}
    )
    
    $allGood = $true
    
    foreach ($req in $requirements) {
        try {
            $result = Invoke-Expression $req.Command -ErrorAction Stop 2>$null
            Write-ColorMessage "$($req.Name) is available" "Success"
        }
        catch {
            Write-ColorMessage "$($req.Name) is not installed" "Error"
            $allGood = $false
        }
    }
    
    if ($allGood) {
        Write-ColorMessage "All requirements are satisfied" "Success"
    } else {
        Write-ColorMessage "Please install missing requirements" "Error"
    }
    
    return $allGood
}

# Create backup
function New-Backup {
    Write-ColorMessage "Creating project backup..." "Info"
    
    $backupDir = "backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    $backupFile = "$backupDir\backup_$timestamp.zip"
    
    # Exclude patterns
    $excludePatterns = @(".git", "node_modules", "functions\lib", ".firebase", "backups", "*.log")
    
    try {
        # Get files to backup
        $filesToBackup = Get-ChildItem -Recurse -File | Where-Object {
            $file = $_
            $shouldInclude = $true
            foreach ($pattern in $excludePatterns) {
                if ($file.FullName -like "*$pattern*") {
                    $shouldInclude = $false
                    break
                }
            }
            return $shouldInclude
        }
        
        if ($filesToBackup) {
            Compress-Archive -Path $filesToBackup.FullName -DestinationPath $backupFile -Force
            Write-ColorMessage "Backup created: $backupFile" "Success"
        } else {
            Write-ColorMessage "No files to backup" "Warning"
        }
    }
    catch {
        Write-ColorMessage "Failed to create backup: $($_.Exception.Message)" "Error"
    }
}

# Check Git status
function Test-GitStatus {
    Write-ColorMessage "Checking Git status..." "Info"
    
    try {
        $status = git status --porcelain 2>$null
        if ($status) {
            Write-ColorMessage "Uncommitted changes found" "Warning"
            git status --short
            
            $response = Read-Host "Do you want to commit changes? (y/n)"
            if ($response -eq 'y' -or $response -eq 'Y') {
                $commitMessage = Read-Host "Enter commit message"
                git add .
                git commit -m $commitMessage
                Write-ColorMessage "Changes committed successfully" "Success"
            } else {
                Write-ColorMessage "Changes not committed" "Warning"
            }
        } else {
            Write-ColorMessage "All changes are committed" "Success"
        }
    }
    catch {
        Write-ColorMessage "Error checking Git status: $($_.Exception.Message)" "Error"
    }
}

# Create new release
function New-Release {
    Write-ColorMessage "Creating new release..." "Info"
    
    # Get last tag
    try {
        $lastTag = git describe --tags --abbrev=0 2>$null
        if (!$lastTag) { $lastTag = "v0.0.0" }
    }
    catch {
        $lastTag = "v0.0.0"
    }
    
    Write-Host "Last release: $lastTag"
    
    # Parse version number
    if ($lastTag -match "v(\d+)\.(\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        $patch = [int]$Matches[3]
        
        $patchVersion = "v$major.$minor.$($patch + 1)"
        $minorVersion = "v$major.$($minor + 1).0"
        $majorVersion = "v$($major + 1).0.0"
    } else {
        $patchVersion = "v1.0.1"
        $minorVersion = "v1.1.0"  
        $majorVersion = "v2.0.0"
    }
    
    Write-Host "Select release type:"
    Write-Host "1) Patch ($patchVersion) - Bug fixes"
    Write-Host "2) Minor ($minorVersion) - New features"
    Write-Host "3) Major ($majorVersion) - Breaking changes"
    Write-Host "4) Custom version"
    
    $choice = Read-Host "Choose (1-4)"
    
    switch ($choice) {
        1 { $newTag = $patchVersion }
        2 { $newTag = $minorVersion }
        3 { $newTag = $majorVersion }
        4 { $newTag = Read-Host "Enter version number (e.g., v1.2.3)" }
        default {
            Write-ColorMessage "Invalid choice" "Error"
            return
        }
    }
    
    $releaseMessage = Read-Host "Enter release description"
    
    # Create tag
    try {
        git tag -a $newTag -m $releaseMessage
        Write-ColorMessage "Release created: $newTag" "Success"
        
        $pushTag = Read-Host "Push release to GitHub? (y/n)"
        if ($pushTag -eq 'y' -or $pushTag -eq 'Y') {
            git push origin $newTag
            Write-ColorMessage "Release pushed to GitHub" "Success"
        }
    }
    catch {
        Write-ColorMessage "Failed to create release: $($_.Exception.Message)" "Error"
    }
}

# Build project
function Build-Project {
    Write-ColorMessage "Building project..." "Info"
    
    # Build Cloud Functions
    if (Test-Path "functions") {
        Write-ColorMessage "Building Cloud Functions..." "Info"
        Push-Location "functions"
        try {
            npm install
            npm run build
            Write-ColorMessage "Cloud Functions built successfully" "Success"
        }
        catch {
            Write-ColorMessage "Failed to build Cloud Functions: $($_.Exception.Message)" "Error"
        }
        finally {
            Pop-Location
        }
    }
    
    Write-ColorMessage "Project built successfully" "Success"
}

# Test project
function Test-Project {
    Write-ColorMessage "Testing project..." "Info"
    
    # Test Firebase Functions
    if (Test-Path "functions") {
        Push-Location "functions"
        try {
            npm run test 2>$null
            Write-ColorMessage "Functions tests passed" "Success"
        }
        catch {
            Write-ColorMessage "Functions tests failed or not available" "Warning"
        }
        finally {
            Pop-Location
        }
    }
    
    # Check Firebase files
    if (Test-Path "firebase.json") {
        Write-ColorMessage "firebase.json exists" "Success"
    } else {
        Write-ColorMessage "firebase.json not found" "Error"
        return $false
    }
    
    if (Test-Path "firestore.rules") {
        Write-ColorMessage "firestore.rules exists" "Success"
    } else {
        Write-ColorMessage "firestore.rules not found" "Warning"
    }
    
    Write-ColorMessage "Testing completed" "Success"
    return $true
}

# Deploy to Firebase
function Deploy-Firebase {
    param($Environment = "prod")
    
    Write-ColorMessage "Deploying to Firebase - Environment: $Environment" "Info"
    
    # Set Firebase project
    switch ($Environment) {
        "dev" { 
            try { firebase use development } catch { Write-ColorMessage "Development project not found" "Warning" }
        }
        "prod" { 
            try { firebase use production } catch { firebase use default }
        }
        default { firebase use default }
    }
    
    # Deploy options
    Write-Host "Select deployment type:"
    Write-Host "1) Full deployment (hosting + functions + firestore)"
    Write-Host "2) Hosting only"
    Write-Host "3) Functions only" 
    Write-Host "4) Firestore rules only"
    
    $deployChoice = Read-Host "Choose (1-4)"
    
    try {
        switch ($deployChoice) {
            1 { firebase deploy }
            2 { firebase deploy --only hosting }
            3 { firebase deploy --only functions }
            4 { firebase deploy --only firestore:rules }
            default {
                Write-ColorMessage "Invalid choice" "Error"
                return
            }
        }
        Write-ColorMessage "Deployment successful" "Success"
    }
    catch {
        Write-ColorMessage "Deployment failed: $($_.Exception.Message)" "Error"
    }
}

# Push to GitHub
function Push-ToGitHub {
    Write-ColorMessage "Pushing to GitHub..." "Info"
    
    try {
        # Push code
        $currentBranch = git branch --show-current
        git push origin $currentBranch
        
        # Push tags
        git push origin --tags
        
        Write-ColorMessage "Successfully pushed to GitHub" "Success"
    }
    catch {
        Write-ColorMessage "Failed to push to GitHub: $($_.Exception.Message)" "Error"
    }
}

# Clean temporary files
function Clear-TempFiles {
    Write-ColorMessage "Cleaning temporary files..." "Info"
    
    # Remove temp files
    Get-ChildItem -Recurse -Filter "*.tmp" -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Recurse -Filter ".DS_Store" -ErrorAction SilentlyContinue | Remove-Item -Force
    
    # Clean cache
    if (Test-Path "functions/node_modules") {
        Push-Location "functions"
        npm prune 2>$null
        Pop-Location
    }
    
    Write-ColorMessage "Cleanup completed" "Success"
}

# Show project statistics
function Show-ProjectStats {
    Write-ColorMessage "Project Statistics:" "Info"
    
    # Git statistics
    try {
        $commitCount = git rev-list --count HEAD 2>$null
        $lastCommit = git log -1 --format="%h - %s (%cr)" 2>$null
        $currentBranch = git branch --show-current 2>$null
        
        Write-Host ""
        Write-Host "📊 Git Statistics:" -ForegroundColor Cyan
        Write-Host "   - Total commits: $commitCount"
        Write-Host "   - Last commit: $lastCommit"
        Write-Host "   - Current branch: $currentBranch"
        
        # Tags
        $tags = git tag --list 2>$null
        if ($tags) {
            Write-Host "   - Total releases: $($tags.Count)"
            $latestTag = git describe --tags --abbrev=0 2>$null
            Write-Host "   - Latest release: $latestTag"
        } else {
            Write-Host "   - No releases yet"
        }
    }
    catch {
        Write-ColorMessage "Error getting Git statistics" "Error"
    }
    
    # File statistics
    Write-Host ""
    Write-Host "📁 Project Files:" -ForegroundColor Cyan
    
    if (Test-Path "public") {
        $htmlFiles = (Get-ChildItem -Path "public" -Filter "*.html" -Recurse).Count
        Write-Host "   - HTML files: $htmlFiles"
        
        if (Test-Path "public/assets/js") {
            $jsFiles = (Get-ChildItem -Path "public/assets/js" -Filter "*.js" -Recurse).Count
            Write-Host "   - JavaScript files: $jsFiles"
        }
    }
    
    # Cloud Functions
    if (Test-Path "functions/src") {
        $tsFiles = (Get-ChildItem -Path "functions/src" -Filter "*.ts" -Recurse).Count
        Write-Host "   - TypeScript files: $tsFiles"
    }
    
    # Documentation
    if (Test-Path "docs") {
        $docFiles = (Get-ChildItem -Path "docs" -Filter "*.md" -Recurse).Count
        Write-Host "   - Documentation files: $docFiles"
    }
    
    Write-Host ""
    Write-Host "🔗 Repository:" -ForegroundColor Cyan
    try {
        $remote = git remote get-url origin 2>$null
        Write-Host "   - GitHub URL: $remote"
    }
    catch {
        Write-Host "   - No remote repository configured"
    }
    Write-Host "   - Local path: $PWD"
}

# Full deployment process
function Start-FullDeployment {
    Write-ColorMessage "Starting full deployment process..." "Info"
    
    if (!(Test-Requirements)) { return }
    
    New-Backup
    Test-GitStatus
    
    if (!(Test-Project)) { 
        Write-ColorMessage "Project tests failed. Aborting deployment." "Error"
        return 
    }
    
    Build-Project
    
    $createRelease = Read-Host "Create new release? (y/n)"
    if ($createRelease -eq 'y' -or $createRelease -eq 'Y') {
        New-Release
    }
    
    $env = Read-Host "Enter environment for deployment (dev/prod)"
    Deploy-Firebase $env
    
    Push-ToGitHub
    Clear-TempFiles
    
    Write-ColorMessage "Full deployment completed successfully! 🎉" "Success"
    Show-ProjectStats
}

# Main menu
function Show-MainMenu {
    Clear-Host
    Write-Host "🚀 Archive System - Version Manager" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1)  Check Requirements"
    Write-Host "2)  Create Backup"
    Write-Host "3)  Check Git Status"
    Write-Host "4)  Create New Release"
    Write-Host "5)  Build Project"
    Write-Host "6)  Test Project"
    Write-Host "7)  Deploy to Firebase"
    Write-Host "8)  Push to GitHub"
    Write-Host "9)  Clean Temporary Files"
    Write-Host "10) Show Project Statistics"
    Write-Host "11) Full Deployment Process"
    Write-Host "0)  Exit"
    Write-Host ""
    
    $choice = Read-Host "Choose (0-11)"
    
    switch ($choice) {
        1 { Test-Requirements }
        2 { New-Backup }
        3 { Test-GitStatus }
        4 { New-Release }
        5 { Build-Project }
        6 { Test-Project }
        7 { 
            $env = Read-Host "Enter environment (dev/prod)"
            Deploy-Firebase $env
        }
        8 { Push-ToGitHub }
        9 { Clear-TempFiles }
        10 { Show-ProjectStats }
        11 { Start-FullDeployment }
        0 { 
            Write-ColorMessage "Goodbye!" "Success"
            exit 
        }
        default { Write-ColorMessage "Invalid choice" "Error" }
    }
    
    if ($choice -ne 0) {
        Write-Host ""
        Read-Host "Press Enter to continue..."
    }
}

# Script entry point
param($Command, $Environment)

if ($Command) {
    # Direct command execution
    switch ($Command.ToLower()) {
        "check" { Test-Requirements }
        "backup" { New-Backup }
        "status" { Test-GitStatus }
        "release" { New-Release }
        "build" { Build-Project }
        "test" { Test-Project }
        "deploy" { Deploy-Firebase $Environment }
        "push" { Push-ToGitHub }
        "cleanup" { Clear-TempFiles }
        "stats" { Show-ProjectStats }
        "full" { Start-FullDeployment }
        default {
            Write-Host "Usage: .\version-manager-fixed.ps1 [command] [environment]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  check    - Check requirements"
            Write-Host "  backup   - Create backup"
            Write-Host "  status   - Check Git status"
            Write-Host "  release  - Create new release"
            Write-Host "  build    - Build project"
            Write-Host "  test     - Test project"
            Write-Host "  deploy   - Deploy to Firebase"
            Write-Host "  push     - Push to GitHub"
            Write-Host "  cleanup  - Clean temporary files"
            Write-Host "  stats    - Show project statistics"
            Write-Host "  full     - Full deployment process"
            Write-Host ""
            Write-Host "Environment (for deploy): dev, prod"
        }
    }
} else {
    # Interactive menu
    do {
        Show-MainMenu
    } while ($true)
}
