param([string]$AdminDomain = "admin.petuniverse-values.pl", [switch]$WorkersOnly)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22.13 lub nowszy z npm." }
$previousDomain = $env:PET_UNIVERSE_ADMIN_DOMAIN
Push-Location $PSScriptRoot
try {
    $env:PET_UNIVERSE_ADMIN_DOMAIN = if ($WorkersOnly) { "" } else { $AdminDomain }
    & node scripts/upgrade-admin.mjs
    if ($LASTEXITCODE -ne 0) { throw "Aktualizacja admina nie przeszla weryfikacji. Sprawdz komunikat powyzej. Domena musi byc aktywna na tym samym koncie Cloudflare." }
} finally {
    $env:PET_UNIVERSE_ADMIN_DOMAIN = $previousDomain
    Pop-Location
}
