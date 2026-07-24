param(
  [string]$Repository = 'CHENG-39/RECORD_DAILY_DATA',
  [string]$SigningRoot = 'D:\项目\diet-tracker-signing'
)

$ErrorActionPreference = 'Stop'
$propertiesPath = Join-Path $SigningRoot 'release-signing.properties'
if (-not (Test-Path -LiteralPath $propertiesPath)) {
  throw "Release signing properties not found: $propertiesPath"
}

$properties = @{}
foreach ($line in Get-Content -LiteralPath $propertiesPath -Encoding utf8) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
  $parts = $trimmed.Split('=', 2)
  if ($parts.Count -eq 2) { $properties[$parts[0].Trim()] = $parts[1] }
}

foreach ($key in 'storeFile', 'storePassword', 'keyAlias', 'keyPassword') {
  if (-not $properties.ContainsKey($key) -or -not $properties[$key]) {
    throw "Signing property is missing: $key"
  }
}

$keystorePath = $properties['storeFile']
if (-not [IO.Path]::IsPathRooted($keystorePath)) {
  $keystorePath = Join-Path $SigningRoot $keystorePath
}
if (-not (Test-Path -LiteralPath $keystorePath)) {
  throw "Release keystore not found: $keystorePath"
}

& gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated.' }

function Set-RepositorySecret([string]$Name, [string]$Value) {
  $Value | & gh secret set $Name --repo $Repository
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to set $Name. Log in with a GitHub account that can manage Actions secrets for $Repository."
  }
}

$keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))
Set-RepositorySecret 'ANDROID_KEYSTORE_BASE64' $keystoreBase64
Set-RepositorySecret 'ANDROID_KEYSTORE_PASSWORD' $properties['storePassword']
Set-RepositorySecret 'ANDROID_KEY_ALIAS' $properties['keyAlias']
Set-RepositorySecret 'ANDROID_KEY_PASSWORD' $properties['keyPassword']

Write-Output "Configured Android release secrets for $Repository."
