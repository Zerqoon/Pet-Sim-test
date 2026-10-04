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
$secret = Read-Host "Wklej adres webhooka Discord z rozmowy" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousWebhook = $env:PET_UNIVERSE_WEBHOOK
$previousSite = $env:PET_UNIVERSE_SITE
Push-Location $PSScriptRoot
try {
    $env:PET_UNIVERSE_WEBHOOK = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PET_UNIVERSE_SITE = $SiteUrl
    & node scripts/setup-discord.mjs
    if ($LASTEXITCODE -ne 0) { throw "Konfiguracja nie zostala zakonczona. Sprawdz komunikat powyzej." }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
    $env:PET_UNIVERSE_WEBHOOK = $previousWebhook
    $env:PET_UNIVERSE_SITE = $previousSite
    Pop-Location
}
