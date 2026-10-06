param(
    [string]$ProjectPath = "C:\Users\zerqo\Desktop\Pet Sim Universe",
    [string]$AdminDomain = "admin.petuniverse-values.pl"
)
$ErrorActionPreference = "Stop"
$source = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$destination = [IO.Path]::GetFullPath($ProjectPath).TrimEnd([IO.Path]::DirectorySeparatorChar)
if (-not (Test-Path -LiteralPath (Join-Path $destination ".cloudflare\admin.json") -PathType Leaf)) {
    throw "Nie znaleziono konfiguracji obecnego panelu w $destination. Uruchom ponownie z -ProjectPath i wskaz swoj istniejacy folder Pet Sim Universe."
}
if (-not [string]::Equals($source, $destination, [StringComparison]::OrdinalIgnoreCase)) {
    & robocopy $source $destination /E /XD .git node_modules .wrangler .cloudflare private-setup (Join-Path $source "public\data") (Join-Path $source "public\assets") /XF *.private.* .env .env.* .dev.vars .dev.vars.* /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw "Nie skopiowano poprawnie plikow. Wdrozenie przerwane." }
}
Push-Location $destination
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22.13 lub nowszy z npm." }
    & node scripts/prune-local-release.mjs
    if ($LASTEXITCODE -ne 0) { throw "Nie potwierdzono lokalnego usuniecia kart. Pozostale ceny nie zostaly zastapione paczka ZIP." }
    & powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Admin.ps1 -AdminDomain $AdminDomain
    if ($LASTEXITCODE -ne 0) { throw "Aktualizacja panelu lub usuniecie wskazanych kart nie zostaly potwierdzone. Sprawdz komunikat powyzej." }
    & powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1 -UseRemotePrices
    if ($LASTEXITCODE -ne 0) { throw "Panel jest zaktualizowany, ale nie potwierdzono calego uploadu. Sprawdz komunikat powyzej." }
    Write-Host "GOTOWE: panel i caly projekt zaktualizowane. Zachowano pozostale ceny, karty, grafiki i konta." -ForegroundColor Green
} finally { Pop-Location }
