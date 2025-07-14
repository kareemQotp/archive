# Archive System - PowerShell Version Manager
# Simple and Clean Version

# Colors
$Colors = @{
    Success = "Green"
    Error = "Red" 
    Warning = "Yellow"
    Info = "Cyan"
}

# Helper functions
function Write-Success($Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Success
}

function Write-Error($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Error
}

function Write-Warning($Message) {
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Warning
}

function Write-Info($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Info
}

# Show project statistics
function Show-ProjectStats {
    Write-Info "Archive System - Project Statistics"
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    
    # Git information
    Write-Host "Git Status:" -ForegroundColor Cyan
    try {
        $currentBranch = git branch --show-current 2>$null
        $commitCount = git rev-list --count HEAD 2>$null
        $lastCommit = git log -1 --format="%h - %s (%cr)" 2>$null
        
        Write-Host "  Current Branch: $currentBranch"
        Write-Host "  Total Commits: $commitCount"
        Write-Host "  Last Commit: $lastCommit"
        
        # Check for tags
        $tags = git tag --list 2>$null
        if ($tags) {
            Write-Host "  Total Releases: $($tags.Count)"
            $latestTag = git describe --tags --abbrev=0 2>$null
            if ($latestTag) {
                Write-Host "  Latest Release: $latestTag"
            }
        } else {
            Write-Host "  No releases yet"
        }
    }
    catch {
        Write-Warning "Could not retrieve Git information"
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
    
    if (Test-Path "functions/src") {
        $tsFiles = (Get-ChildItem -Path "functions/src" -Filter "*.ts" -Recurse).Count
        Write-Host "  TypeScript Files: $tsFiles"
    }
    
    if (Test-Path "docs") {
        $docFiles = (Get-ChildItem -Path "docs" -Filter "*.md" -Recurse).Count
        Write-Host "  Documentation Files: $docFiles"
    }
    
    Write-Host ""
    Write-Host "Repository:" -ForegroundColor Cyan
    try {
        $remote = git remote get-url origin 2>$null
        if ($remote) {
            Write-Host "  GitHub URL: $remote"
        } else {
            Write-Host "  No remote repository configured"
        }
    }
    catch {
        Write-Host "  No remote repository configured"
    }
    Write-Host "  Local Path: $PWD"
}

# Check requirements
function Test-Requirements {
    Write-Info "Checking system requirements..."
    
    $requirements = @(
        @{Name = "Git"; Command = "git --version"},
        @{Name = "Node.js"; Command = "node --version"},
        @{Name = "NPM"; Command = "npm --version"},
        @{Name = "Firebase CLI"; Command = "firebase --version"}
    )
    
    $allGood = $true
    
    foreach ($req in $requirements) {
        try {
            $null = Invoke-Expression $req.Command -ErrorAction Stop 2>$null
            Write-Success "$($req.Name) is available"
        }
        catch {
            Write-Error "$($req.Name) is not installed"
            $allGood = $false
        }
    }
    
    if ($allGood) {
        Write-Success "All requirements are satisfied"
    } else {
        Write-Error "Please install missing requirements"
    }
    
    return $allGood
}

# Check Git status
function Test-GitStatus {
    Write-Info "Checking Git status..."
    
    try {
        $status = git status --porcelain 2>$null
        if ($status) {
            Write-Warning "Uncommitted changes found:"
            git status --short
            
            $response = Read-Host "Do you want to commit changes? (y/n)"
            if ($response -eq 'y' -or $response -eq 'Y') {
                $commitMessage = Read-Host "Enter commit message"
                git add .
                git commit -m $commitMessage
                Write-Success "Changes committed successfully"
            } else {
                Write-Warning "Changes not committed"
            }
        } else {
            Write-Success "All changes are committed"
        }
    }
    catch {
        Write-Error "Error checking Git status"
    }
}

# Create new release
function New-Release {
    Write-Info "Creating new release..."
    
    # Get last tag
    try {
        $lastTag = git describe --tags --abbrev=0 2>$null
        if (!$lastTag) { $lastTag = "v0.0.0" }
    }
    catch {
        $lastTag = "v0.0.0"
    }
    
    Write-Host "Last release: $lastTag"
    
    # Parse version
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
    
    Write-Host ""
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
        4 { $newTag = Read-Host "Enter version number (e.g. v1.2.3)" }
        default {
            Write-Error "Invalid choice"
            return
        }
    }
    
    $releaseMessage = Read-Host "Enter release description"
    
    # Create tag
    try {
        git tag -a $newTag -m $releaseMessage
        Write-Success "Release created: $newTag"
        
        $pushTag = Read-Host "Push release to GitHub? (y/n)"
        if ($pushTag -eq 'y' -or $pushTag -eq 'Y') {
            git push origin $newTag
            git push origin --tags
            Write-Success "Release pushed to GitHub"
        }
    }
    catch {
        Write-Error "Failed to create release"
    }
}

# Deploy to Firebase
function Deploy-Firebase {
    param($Environment = "prod")
    
    Write-Info "Deploying to Firebase - Environment: $Environment"
    
    # Set project
    switch ($Environment.ToLower()) {
        "dev" { 
            try { firebase use development } catch { Write-Warning "Development project not found" }
        }
        "prod" { 
            try { firebase use production } catch { firebase use default }
        }
        default { firebase use default }
    }
    
    Write-Host ""
    Write-Host "Select deployment type:"
    Write-Host "1) Full deployment"
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
                Write-Error "Invalid choice"
                return
            }
        }
        Write-Success "Deployment successful"
    }
    catch {
        Write-Error "Deployment failed"
    }
}

# Push to GitHub
function Push-ToGitHub {
    Write-Info "Pushing to GitHub..."
    
    try {
        $currentBranch = git branch --show-current
        git push origin $currentBranch
        Write-Success "Successfully pushed to GitHub"
    }
    catch {
        Write-Error "Failed to push to GitHub"
    }
}

# Quick deployment
function Start-QuickDeploy {
    Write-Info "Starting quick deployment process..."
    
    Test-GitStatus
    
    $env = Read-Host "Enter environment for deployment (dev/prod)"
    Deploy-Firebase $env
    
    Push-ToGitHub
    
    Write-Success "Quick deployment completed!"
    Show-ProjectStats
}

# Create backup
function New-Backup {
    Write-Info "Creating project backup..."
    
    # Create backup directory
    $backupDir = "backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "archive_backup_$timestamp"
    $backupFile = "$backupDir\$backupName.zip"
    
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
        Write-Info "Created backup directory: $backupDir"
    }
    
    # Files and folders to exclude from backup
    $excludePatterns = @(
        ".git",
        "node_modules", 
        "functions\node_modules",
        "functions\lib",
        ".firebase",
        "backups",
        "*.log",
        "*.tmp",
        ".DS_Store",
        "Thumbs.db",
        "archive-tech-firebase-adminsdk.json"
    )
    
    Write-Info "Collecting files for backup..."
    
    try {
        # Get all files excluding patterns
        $filesToBackup = Get-ChildItem -Recurse -File | Where-Object {
            $file = $_
            $shouldInclude = $true
            
            foreach ($pattern in $excludePatterns) {
                if ($file.FullName -like "*$pattern*" -or $file.Name -like $pattern) {
                    $shouldInclude = $false
                    break
                }
            }
            return $shouldInclude
        }
        
        if ($filesToBackup -and $filesToBackup.Count -gt 0) {
            Write-Info "Found $($filesToBackup.Count) files to backup"
            
            # Create the backup
            Compress-Archive -Path $filesToBackup.FullName -DestinationPath $backupFile -Force
            
            # Get backup file size
            $backupFileInfo = Get-Item $backupFile
            $sizeInMB = [math]::Round($backupFileInfo.Length / 1MB, 2)
            
            Write-Success "Backup created successfully!"
            Write-Host "  File: $backupFile" -ForegroundColor White
            Write-Host "  Size: $sizeInMB MB" -ForegroundColor White
            Write-Host "  Files: $($filesToBackup.Count)" -ForegroundColor White
            
            # Show backup contents summary
            Write-Host ""
            Write-Host "Backup Contents Summary:" -ForegroundColor Cyan
            
            $fileTypes = @{}
            foreach ($file in $filesToBackup) {
                $ext = $file.Extension.ToLower()
                if ($ext -eq "") { $ext = "no extension" }
                if ($fileTypes.ContainsKey($ext)) {
                    $fileTypes[$ext]++
                } else {
                    $fileTypes[$ext] = 1
                }
            }
            
            $fileTypes.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
                Write-Host "  $($_.Key): $($_.Value) files" -ForegroundColor White
            }
            
        } else {
            Write-Warning "No files found to backup"
        }
    }
    catch {
        Write-Error "Failed to create backup: $($_.Exception.Message)"
    }
}

# List existing backups
function Show-Backups {
    Write-Info "Existing backups..."
    
    $backupDir = "backups"
    
    if (!(Test-Path $backupDir)) {
        Write-Warning "No backup directory found"
        return
    }
    
    $backups = Get-ChildItem -Path $backupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Warning "No backups found"
        return
    }
    
    Write-Host ""
    Write-Host "Available Backups:" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $sizeInMB = [math]::Round($backup.Length / 1MB, 2)
        $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        
        Write-Host "$($i + 1)) $($backup.Name)" -ForegroundColor White
        Write-Host "    Size: $sizeInMB MB" -ForegroundColor Gray
        Write-Host "    Date: $date" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Option to delete old backups
    if ($backups.Count -gt 5) {
        Write-Warning "You have $($backups.Count) backups. Consider cleaning old ones."
        $cleanup = Read-Host "Do you want to delete backups older than 30 days? (y/n)"
        
        if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
            $cutoffDate = (Get-Date).AddDays(-30)
            $oldBackups = $backups | Where-Object { $_.LastWriteTime -lt $cutoffDate }
            
            if ($oldBackups.Count -gt 0) {
                foreach ($oldBackup in $oldBackups) {
                    Remove-Item $oldBackup.FullName -Force
                    Write-Info "Deleted old backup: $($oldBackup.Name)"
                }
                Write-Success "Cleaned up $($oldBackups.Count) old backups"
            } else {
                Write-Info "No backups older than 30 days found"
            }
        }
    }
}

# Restore from backup
function Restore-FromBackup {
    Write-Info "Restore from backup..."
    
    $backupDir = "backups"
    
    if (!(Test-Path $backupDir)) {
        Write-Error "No backup directory found"
        return
    }
    
    $backups = Get-ChildItem -Path $backupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Error "No backups found"
        return
    }
    
    Write-Host ""
    Write-Host "Available Backups for Restore:" -ForegroundColor Cyan
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "$($i + 1)) $($backup.Name) - $date"
    }
    
    Write-Host "0) Cancel"
    
    $choice = Read-Host "Choose backup to restore (0-$($backups.Count))"
    
    if ($choice -eq "0" -or $choice -eq "") {
        Write-Info "Restore cancelled"
        return
    }
    
    $selectedIndex = [int]$choice - 1
    if ($selectedIndex -lt 0 -or $selectedIndex -ge $backups.Count) {
        Write-Error "Invalid choice"
        return
    }
    
    $selectedBackup = $backups[$selectedIndex]
    
    Write-Warning "This will overwrite current files with backup content!"
    $confirm = Read-Host "Are you sure you want to restore from '$($selectedBackup.Name)'? (y/n)"
    
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Info "Restore cancelled"
        return
    }
    
    try {
        # Create restore directory
        $restoreDir = "restore_temp_$((Get-Date).Ticks)"
        
        # Extract backup
        Expand-Archive -Path $selectedBackup.FullName -DestinationPath $restoreDir -Force
        
        Write-Success "Backup extracted to temporary directory"
        Write-Warning "Manual restore required - check '$restoreDir' directory"
        Write-Info "Copy needed files manually to avoid overwriting important changes"
        
    }
    catch {
        Write-Error "Failed to restore backup: $($_.Exception.Message)"
    }
}

# Main menu
function Show-MainMenu {
    Clear-Host
    Write-Host "Archive System - Version Manager" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1) Show Project Statistics"
    Write-Host "2) Check Requirements" 
    Write-Host "3) Check Git Status"
    Write-Host "4) Create New Release"
    Write-Host "5) Deploy to Firebase"
    Write-Host "6) Push to GitHub"
    Write-Host "7) Quick Deploy Process"
    Write-Host "8) Create Backup"
    Write-Host "9) Show Existing Backups"
    Write-Host "A) Restore from Backup"
    Write-Host "0) Exit"
    Write-Host ""
    
    $choice = Read-Host "Choose (0-9, A)"
    
    switch ($choice) {
        1 { Show-ProjectStats }
        2 { Test-Requirements }
        3 { Test-GitStatus }
        4 { New-Release }
        5 { 
            $env = Read-Host "Enter environment (dev/prod)"
            Deploy-Firebase $env
        }
        6 { Push-ToGitHub }
        7 { Start-QuickDeploy }
        8 { New-Backup }
        9 { Show-Backups }
        "A" { Restore-FromBackup }
        "a" { Restore-FromBackup }
        0 { 
            Write-Success "Goodbye!"
            exit 
        }
        default { Write-Error "Invalid choice" }
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
        "stats" { Show-ProjectStats }
        "check" { Test-Requirements }
        "status" { Test-GitStatus }
        "release" { New-Release }
        "deploy" { Deploy-Firebase $Environment }
        "push" { Push-ToGitHub }
        "quick" { Start-QuickDeploy }
        "backup" { New-Backup }
        "backups" { Show-Backups }
        "restore" { Restore-FromBackup }
        default {
            Write-Host "Archive System - Version Manager"
            Write-Host "==============================="
            Write-Host ""
            Write-Host "Usage: .\clean-manager.ps1 [command] [environment]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  stats    - Show project statistics"
            Write-Host "  check    - Check requirements"
            Write-Host "  status   - Check Git status"
            Write-Host "  release  - Create new release"
            Write-Host "  deploy   - Deploy to Firebase"
            Write-Host "  push     - Push to GitHub"
            Write-Host "  quick    - Quick deployment process"
            Write-Host "  backup   - Create project backup"
            Write-Host "  backups  - Show existing backups"
            Write-Host "  restore  - Restore from backup"
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
