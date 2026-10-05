param([string]$SiteUrl = "https://petuniverse-values.pl", [string]$AdminDomain = "admin.petuniverse-values.pl", [switch]$WorkersOnly)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22.13 lub nowszy z npm." }
Write-Host "Najpierw uruchom Upload-GitHub.ps1 z tej paczki i poczekaj na udany deploy Pages." -ForegroundColor Cyan
Write-Host "Token GitHub: Fine-grained, repo Zerqoon/Pet-Sim-test, Contents: Read and write."
Write-Host "Panel jest dostosowany do Workers Free. Nie musisz kupowac zadnego planu." -ForegroundColor Green
Write-Host "Konta i nowy webhook sa juz przygotowane. Konfiguracja utworzy osobny adres panelu."
$secret = Read-Host "GitHub token (ukryty)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousToken = $env:PET_UNIVERSE_GITHUB_TOKEN
$previousSite = $env:PET_UNIVERSE_SITE
$previousDomain = $env:PET_UNIVERSE_ADMIN_DOMAIN
Push-Location $PSScriptRoot
try {
    $env:PET_UNIVERSE_GITHUB_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PET_UNIVERSE_SITE = $SiteUrl
    $env:PET_UNIVERSE_ADMIN_DOMAIN = if ($WorkersOnly) { "" } else { $AdminDomain }
    & node scripts/setup-admin.mjs
    if ($LASTEXITCODE -ne 0) { throw "Panel nie zostal poprawnie wdrozony. Sprawdz komunikat powyzej." }
} finally {
    $env:PET_UNIVERSE_GITHUB_TOKEN = $previousToken
    $env:PET_UNIVERSE_SITE = $previousSite
    $env:PET_UNIVERSE_ADMIN_DOMAIN = $previousDomain
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
    Pop-Location
}
