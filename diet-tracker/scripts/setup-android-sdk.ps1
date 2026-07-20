$ErrorActionPreference = 'Stop'

$projectFolder = ([string][char]0x9879) + ([string][char]0x76EE)
$environmentRoot = Join-Path 'D:\' "$projectFolder\android-build"
$sdkRoot = Join-Path $environmentRoot 'sdk'
$jdkRoot = Join-Path $environmentRoot 'jdk'
$gradleRoot = Join-Path $environmentRoot 'gradle-cache'
$jdk = Get-ChildItem -Path $jdkRoot -Directory | Select-Object -First 1
$sdkManager = Join-Path $sdkRoot 'cmdline-tools\latest\cmdline-tools\bin\sdkmanager.bat'

if (-not $jdk) { throw "JDK is missing under $jdkRoot" }
if (-not (Test-Path -LiteralPath $sdkManager)) { throw "Android sdkmanager is missing under $sdkRoot" }

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = $gradleRoot

& $sdkManager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK package installation failed' }

# Accept licenses non-interactively for the packages installed in the D: SDK root.
1..100 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$sdkRoot" '--licenses'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license acceptance failed' }
