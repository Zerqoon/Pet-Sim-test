param([string]$ProjectPath = $PSScriptRoot)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22 lub nowszy z npm." }
$helper = Join-Path $PSScriptRoot "scripts\repair-discord.mjs"
$configDirectory = Join-Path $ProjectPath ".cloudflare"
if (-not (Test-Path -LiteralPath $helper -PathType Leaf)) { throw "Rozpakuj caly ZIP. Brakuje scripts/repair-discord.mjs." }
& node $helper --config-directory $configDirectory
if ($LASTEXITCODE -ne 0) { throw "Naprawa nie zostala potwierdzona. Sprawdz komunikat powyzej." }
