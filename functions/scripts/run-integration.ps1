param()
# Simple PowerShell wrapper to skip integration tests if Java (for Firestore emulator) is missing.
(& java -version) 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Java not found. Skipping integration tests gracefully.'
  exit 0
}
Write-Host 'Java detected. Running Firestore emulator integration tests...'
firebase emulators:exec --only firestore "npx jest --runInBand test/integration"
exit $LASTEXITCODE
