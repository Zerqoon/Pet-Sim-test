param(
    [string]$Source = $PSScriptRoot,
    [string]$RepoUrl = "https://github.com/Zerqoon/Pet-Sim-test.git",
    [string]$Branch = "main"
)
$ErrorActionPreference = "Stop"
function Run-Git {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw "Git zakonczyl sie bledem. Wysylanie przerwane." }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Zainstaluj Git for Windows i otworz ponownie PowerShell." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22 lub nowszy i otworz ponownie PowerShell." }
foreach ($file in @("package.json", "public\data\prices.js", "public\data\catalog.js", "public\v89.css", "functions\api\price-feed.js", "workers\price-monitor.js", "scripts\build.mjs")) {
    if (-not (Test-Path -LiteralPath (Join-Path $Source $file) -PathType Leaf)) { throw "Brakuje $file. Rozpakuj caly ZIP v89 do jednego folderu." }
}
Push-Location $Source
try {
    & node scripts/validate.mjs
    if ($LASTEXITCODE -ne 0) { throw "Bledne dane projektu. Nic nie wyslano." }
    & node scripts/build.mjs
    if ($LASTEXITCODE -ne 0) { throw "Build nie powiodl sie. Nic nie wyslano." }
} finally { Pop-Location }
$work = Join-Path $env:TEMP ("Pet-Universe-Upload-" + [guid]::NewGuid().ToString("N"))
Run-Git clone --single-branch --branch $Branch $RepoUrl $work
Push-Location $work
try {
    $destination = Join-Path $work "Pet Sim Universe"
    & robocopy $Source $destination /MIR /XD .git node_modules .wrangler .cloudflare /XF .env .env.* .dev.vars .dev.vars.* *.private.* discord-secrets*.json /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw "Kopiowanie nie powiodlo sie. Nic nie wyslano." }
    Run-Git add -A -- "Pet Sim Universe"
    & git diff --cached --quiet
    $diffResult = $LASTEXITCODE
    if ($diffResult -eq 0) {
        Write-Host "GitHub ma juz identyczne pliki." -ForegroundColor Green
    } elseif ($diffResult -eq 1) {
        Run-Git diff --cached --stat
        Run-Git commit -m "Update Pet Universe v89: badges, mobile, Discord price monitor"
        Run-Git push origin $Branch
        Write-Host "GOTOWE - projekt wyslany. Poczekaj na udane wdrozenie Cloudflare." -ForegroundColor Green
        Write-Host "Potem uruchom Setup-Discord.ps1 z rozpakowanego folderu."
    } else { throw "Nie udalo sie sprawdzic zmian." }
} finally { Pop-Location }
