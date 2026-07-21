$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectFolder = ([string][char]0x9879) + ([string][char]0x76EE)
$environmentRoot = Join-Path 'D:\' "$projectFolder\android-build"
$signingRoot = Join-Path 'D:\' "$projectFolder\diet-tracker-signing"
$sdkRoot = Join-Path $environmentRoot 'sdk'
$jdkRoot = Join-Path $environmentRoot 'jdk'
$gradleRoot = Join-Path $environmentRoot 'gradle-cache'
$signingProperties = Join-Path $signingRoot 'release-signing.properties'
$jdk = Get-ChildItem -Path $jdkRoot -Directory | Select-Object -First 1

if (-not $jdk) { throw "JDK is missing under $jdkRoot. Run the D: environment setup first." }
if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36'))) { throw "Android SDK platform 36 is missing under $sdkRoot. Run npm run android:sdk first." }
if (-not (Test-Path -LiteralPath $signingProperties)) { throw "Release signing configuration is missing under $signingRoot." }

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = $gradleRoot
$env:DIET_TRACKER_SIGNING_PROPERTIES = $signingProperties

Push-Location $projectRoot
try {
  npm run cap:sync
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
  Push-Location (Join-Path $projectRoot 'android')
  try {
    & '.\gradlew.bat' 'assembleRelease'
    if ($LASTEXITCODE -ne 0) { throw 'Android release APK build failed' }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
