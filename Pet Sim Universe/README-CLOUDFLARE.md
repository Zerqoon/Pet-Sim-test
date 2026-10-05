# Pet Universe Values v123

A complete English value list and trade calculator with a responsive desktop
layout, three-column mobile collections, item details, code copying and local
PNG trade export. Includes the exact user-supplied `prices (9).js`, all original
artwork and a ready-built `public/` directory.

For the existing owner's upload workflow, see `START-TUTAJ.md`.

## Centered Home

The v121 Home layout is retained unchanged in v123. The sidebar is hidden on Home, which fills the available page width; it returns in Values and Calculator. The title, update badge and exactly two buttons,
**Values** and **Calculator**, are centered. Collection shortcuts, community
links and tool descriptions have been removed from this view. Credits remain
as quiet, static text. The existing navigation and other page layouts are retained.

The background uses the existing sky-world, category-pets and Gummy Egg artwork
with static CSS darkening layers. Source images are unchanged; the build uses
their optimized WebP variants. Phone layouts stack the two main buttons.
Keyboard focus still moves to the new section heading when entering from Home.

The exact prices, timestamp metadata, catalog and main-site assets from v121
are retained. The monitor now reads the deployed catalog and sends short English alerts. This menu change does not reset the value-update timestamp.

## Catalog editing

v123 includes a separate authenticated Cloudflare Worker admin site for Zerqoon and Pioterek. It publishes catalog, price and PNG updates in a single GitHub commit. Main page files are not writable through the panel. See **ADMIN-START.md** for installation, hosting requirements and usage.

After uploading the main project and waiting for Pages, run **Setup-Admin.ps1**. Provide a repository-scoped GitHub token and authenticate to Cloudflare. The new webhook and both accounts are already prepared privately. The panel is designed for Workers Free, with no paid CPU overrides. Browser-prepared PNGs are staged in separate requests; generated random login secrets use a keyed native verifier. Existing passwords are retained. Passwords are in **private-setup/LOGIN.private.txt**, excluded from GitHub uploads.

## Development

Node.js 22.13+; no npm dependencies are needed to build or run the website.

```text
npm run dev
npm run build
npm test
```

The local server listens at `http://127.0.0.1:4173`. Serve the project over HTTP;
opening `index.html` as a local file does not support the price loader.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory in the existing Git repository | `Pet Sim Universe` |
| Build command | `npm run build` |
| Output directory | `public` |
| Optional price-history D1 binding | `VALUES_DB` |

Prices work without Pages Functions. The optional history API returns a clear
unavailable state when no history database is bound.

## One editable price source

Edit **`public/data/prices.js` only**. The frontend, history snapshots and Discord
monitor read this file directly. `catalog.js` contains names, rarity, artwork
and sources; it does not contain a second set of editable prices.

The price loader validates a complete snapshot before changing shared catalog
objects. It accepts object data, comments and trailing commas without executing
JavaScript. Duplicate IDs, missing variants, unknown items, invalid numbers,
malformed encoding and oversized responses are rejected. A temporary failure
keeps the last verified snapshot and marks saved values visibly.

Missing prices (`???`, null, blank, No Price, N/A and equivalent accepted forms)
use the label **Not Price**. Zero is a real numeric price. O/C remains **O/C**.
Incomplete trade offers never produce a WIN/FAIR/LOSS rating based only on their
known subtotal. Screen totals and PNG exports share this rule. Quantity, ticket,
numeric overflow and image export errors have explicit handling.

The supplied file has 91 price streams: 79 numeric and 12 unpriced. Its normalized
revision is `9ac225962cf2024488b16b87f6891d378ac92051b1d9a8e8bb39f620178c61da`.
The imported timestamp, `2026-10-05T08:33:51.958Z`, is the received attachment time;
the author's original edit time is unavailable.

## Update timestamps

Builds generate `public/data/price-updates.js`, containing only a timestamp,
its source and a hash of normalized prices. Do not edit it. Unrelated builds,
page visits, equivalent price spellings and archive extraction do not reset
the timestamp. Git price commits and local price saves supply future update dates.

Only metadata matching the current revision is used. When metadata is missing
or stale, the monitor's public status can supply the first detected date for
those exact prices, labeled **CHANGE DETECTED**. A later authoring timestamp
has priority. The UI shows both relative age and an exact Europe/Warsaw date.
Values refresh every 30 seconds and when returning to the browser tab.

## Discord deployment and delivery

The site release is v123; the compatible monitor protocol remains v116.
Pages and the monitor are deployed separately. The included PowerShell tools
reuse the existing private configuration and database; the ZIP itself does
not change a Cloudflare account.

| Action from the project directory | Command |
| --- | --- |
| Upload the entire project with its supplied prices | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1` |
| Repair the configured monitor | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1` |
| Initial setup or a new webhook | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1` |

The upload validates and builds before committing, excludes private files and
reuses the local monitor configuration if present. Upgrade waits for the
published prices and checks the deployed monitor identity and authorization
before sending its test. Success requires a Discord acknowledgement.

D1 holds the price baseline, update timestamps, delivery queue and lease.
Snapshot and queue changes are atomic. Messages group up to eight embeds
within Discord's size budget; temporary failures retry using server rate-limit
headers. Permanent 401/403/404 failures pause sending until successful repair.
New price events remain queued. An ambiguous network failure after Discord
accepts a message can cause a single retry duplicate; delivery is not claimed
to be exactly-once across two separate services.

Cron reads values once per minute even when the website is closed. A first,
empty database seeds a baseline; a retained database compares actual changes.
`/auth`, `/check` and `/test` require the configured monitor key. `/health` and
public `/status` expose no secrets. Preserve the owner's private `.cloudflare`
configuration when replacing project files.

## Source map

| Purpose | File |
| --- | --- |
| All editable prices | `public/data/prices.js` |
| Catalog metadata and drop artwork | `public/data/catalog.js` |
| Shared price semantics | `public/data/price-core.js` |
| Validated file loader and saved-value cache | `public/data/value-loader.js`, `public/data/price-cache.js` |
| Trade arithmetic and image export | `public/data/trade-math.js`, `public/data/trade-export.js` |
| Responsive visual styles | `public/redesign.css` |
| Page structure and interactions | `src/index.html`, `public/app.js` |
| Build and price timestamp generation | `scripts/build.mjs`, `scripts/update-price-time.mjs` |
| Discord monitor and delivery | `workers/price-monitor.js`, `workers/discord-delivery.js` |

The build uses one stylesheet source, generates content-hashed bundles and
retains direct price-file loading so a prices-only publication can still work.
Old cascading styles and outdated version guides have been removed.

Automated tests exercise real SQLite, Git timestamp histories, safe data parsing,
cache validation, price transitions, complete history snapshots, delivery retries,
Discord rate limits, authorization, deployment checks and trade arithmetic.
HTTP responses are simulated; tests do not send Discord messages. All 70 tests and the main-site build passed for v123. New tests exercise admin logins, sessions, CSRF and origin checks, rate limits, PNG checksums, separate image staging, Free configuration migration, deployment login checks, stale GitHub heads, publish locks, idempotent saves, recovery after post-commit storage failures and notification retry. Main pages, existing prices, their timestamp and main-site assets were compared byte-for-byte against v122. No visual browser or physical-phone QA was performed; a browser capable of local preview was unavailable. Live GitHub/Cloudflare/Discord setup requires authentication on the owner's computer and is verified by Setup-Admin.ps1.
