param(
  [int]$WaitSeconds = 45
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $projectRoot
$packageName = 'com.recorddailydata.diettracker'
$sdkRoot = 'D:\项目\android-build\sdk'
$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
$baselineApk = 'D:\项目\output\diet-tracker-v1.1.1-release.apk'
$upgradeApk = Join-Path $projectRoot 'releases\diet-tracker-v1.1.4.apk'
$artifactRoot = Join-Path $repositoryRoot 'test-artifacts'

if (-not (Test-Path -LiteralPath $adb)) { throw "ADB is missing: $adb" }
if (-not (Test-Path -LiteralPath $upgradeApk)) { throw "Upgrade APK is missing: $upgradeApk" }

New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $artifactRoot "android-upgrade-$runId.log"
$uiPath = Join-Path $artifactRoot "android-upgrade-$runId.xml"
$screenshotPath = Join-Path $artifactRoot "android-upgrade-$runId.png"

function Write-TestLog([string]$message) {
  $line = "$(Get-Date -Format 's') $message"
  $line | Tee-Object -FilePath $logPath -Append
}

function Get-Device {
  & $adb start-server | Out-Null
  for ($elapsed = 0; $elapsed -le $WaitSeconds; $elapsed += 3) {
    $devices = & $adb devices
    $match = $devices | Where-Object { $_ -match '^(\S+)\s+device$' } | Select-Object -First 1
    if ($match) { return ($match -split '\s+')[0] }
    if ($elapsed -lt $WaitSeconds) { Start-Sleep -Seconds 3 }
  }
  throw 'No authorized Android device found. Enable USB debugging and allow this computer on the phone.'
}

function Get-VersionCode([string]$serial) {
  $versionLine = & $adb -s $serial shell dumpsys package $packageName 2>$null | Select-String -Pattern 'versionCode='
  if (-not $versionLine) { return $null }
  $match = [regex]::Match($versionLine[0].Line, 'versionCode=(\d+)')
  return if ($match.Success) { [int]$match.Groups[1].Value } else { $null }
}

function Install-Apk([string]$serial, [string]$apk, [string]$label) {
  Write-TestLog "Installing $label: $apk"
  $result = & $adb -s $serial install -r $apk 2>&1
  $result | Tee-Object -FilePath $logPath -Append
  if ($LASTEXITCODE -ne 0 -or -not ($result -match 'Success')) { throw "$label installation failed." }
}

$serial = Get-Device
Write-TestLog "Device: $serial"
(& $adb -s $serial shell getprop ro.product.manufacturer) | ForEach-Object { Write-TestLog "Manufacturer: $_" }
(& $adb -s $serial shell getprop ro.product.model) | ForEach-Object { Write-TestLog "Model: $_" }
(& $adb -s $serial shell getprop ro.build.version.release) | ForEach-Object { Write-TestLog "Android: $_" }

$existingVersion = Get-VersionCode $serial
if ($null -eq $existingVersion) {
  if (-not (Test-Path -LiteralPath $baselineApk)) { throw "Baseline APK is missing: $baselineApk" }
  Install-Apk $serial $baselineApk 'baseline v1.1.1'
  $existingVersion = Get-VersionCode $serial
  Write-TestLog "Baseline installed with versionCode=$existingVersion"
} else {
  Write-TestLog "Existing app detected with versionCode=$existingVersion; preserving its data."
}

if ($existingVersion -lt 6) {
  Install-Apk $serial $upgradeApk 'upgrade v1.1.4'
} else {
  Write-TestLog 'Installed version is already v1.1.4 or newer; skipped downgrade.'
}

$installedVersion = Get-VersionCode $serial
Write-TestLog "Installed versionCode=$installedVersion"
if ($installedVersion -lt 6) { throw 'Upgrade verification failed: versionCode is below 6.' }

& $adb -s $serial shell logcat -c
& $adb -s $serial shell am force-stop $packageName
& $adb -s $serial shell monkey -p $packageName 1 | Tee-Object -FilePath $logPath -Append
Start-Sleep -Seconds 8

$pid = & $adb -s $serial shell pidof $packageName
Write-TestLog "App process: $pid"
if (-not $pid) { throw 'Launch verification failed: app process is not running.' }

& $adb -s $serial exec-out screencap -p | Set-Content -Path $screenshotPath -AsByteStream
& $adb -s $serial shell uiautomator dump /sdcard/diet-tracker-ui.xml | Tee-Object -FilePath $logPath -Append
& $adb -s $serial pull /sdcard/diet-tracker-ui.xml $uiPath | Tee-Object -FilePath $logPath -Append

$appLogs = & $adb -s $serial logcat -d -v time
$crashes = $appLogs | Select-String -Pattern 'FATAL EXCEPTION|ANR in com\.recorddailydata\.diettracker|Process: com\.recorddailydata\.diettracker'
if ($crashes) {
  Write-TestLog 'Crash or ANR marker found:'
  $crashes | ForEach-Object { Write-TestLog $_.Line }
  throw 'Runtime log verification failed.'
}

Write-TestLog 'PASS: baseline/update/launch/log checks completed without crash or ANR markers.'
Write-Output "PASS. Artifacts: $logPath, $screenshotPath, $uiPath"
