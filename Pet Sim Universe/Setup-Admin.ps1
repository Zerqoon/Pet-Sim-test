param([string]$SiteUrl = "https://petuniverse-values.pl")
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22.13 lub nowszy z npm." }
Write-Host "Najpierw uruchom Upload-GitHub.ps1 z tej paczki i poczekaj na udany deploy Pages." -ForegroundColor Cyan
Write-Host "Token GitHub: Fine-grained, repo Zerqoon/Pet-Sim-test, Contents: Read and write."
Write-Host "Panel wymaga Workers Paid (wiekszy limit CPU dla logowania i sprawdzania PNG). Skrypt nie wlacza platnosci."
Write-Host "Konta i nowy webhook sa juz przygotowane. Konfiguracja utworzy osobny adres panelu."
$secret = Read-Host "GitHub token (ukryty)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousToken = $env:PET_UNIVERSE_GITHUB_TOKEN
$previousSite = $env:PET_UNIVERSE_SITE
Push-Location $PSScriptRoot
try {
    $env:PET_UNIVERSE_GITHUB_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PET_UNIVERSE_SITE = $SiteUrl
    & node scripts/setup-admin.mjs
    if ($LASTEXITCODE -ne 0) { throw "Panel nie zostal poprawnie wdrozony. Sprawdz komunikat powyzej." }
} finally {
    $env:PET_UNIVERSE_GITHUB_TOKEN = $previousToken
    $env:PET_UNIVERSE_SITE = $previousSite
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
    Pop-Location
}
