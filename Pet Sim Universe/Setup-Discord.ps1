param([string]$SiteUrl = "https://petuniverse-values.pl")
$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Zainstaluj Node.js 22 lub nowszy, potem otworz ponownie PowerShell."
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "Brakuje npx. Zainstaluj Node.js razem z npm."
}

Write-Host "Najpierw wgraj z tej paczki na GitHub i poczekaj na udany deploy Cloudflare." -ForegroundColor Cyan
Write-Host "Adres webhooka zostanie zapisany jako sekret Cloudflare, poza GitHubem."
$privateConfig = Join-Path $PSScriptRoot "private-setup\admin-secrets.private.json"
$secret = $null
$pointer = [IntPtr]::Zero
if (-not (Test-Path -LiteralPath $privateConfig)) {
    $secret = Read-Host "Wklej adres webhooka Discord" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
}
$previousWebhook = $env:PET_UNIVERSE_WEBHOOK
$previousSite = $env:PET_UNIVERSE_SITE
Push-Location $PSScriptRoot
try {
    if ($pointer -ne [IntPtr]::Zero) {
        $env:PET_UNIVERSE_WEBHOOK = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } else { $env:PET_UNIVERSE_WEBHOOK = $null }
    $env:PET_UNIVERSE_SITE = $SiteUrl
    & node scripts/setup-discord.mjs
    if ($LASTEXITCODE -ne 0) { throw "Konfiguracja nie zostala zakonczona. Sprawdz komunikat powyzej." }
}
finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($null -ne $secret) { $secret.Dispose() }
    $env:PET_UNIVERSE_WEBHOOK = $previousWebhook
    $env:PET_UNIVERSE_SITE = $previousSite
    Pop-Location
}
