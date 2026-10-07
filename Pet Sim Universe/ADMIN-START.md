# Separate admin panel — v128

Main website pages, artwork, layout and existing values are unchanged. The new admin is a separate Cloudflare Worker with its own address and login page. It does not require enabling Pages Functions.

For an existing installation, follow README-ADMIN.md and run Upgrade-Admin.ps1. This release adds reviewed card removal and a redesigned admin workspace, retaining the existing image fixes. Update-Project.ps1 updates an existing installation and removes the nine requested entries from the latest GitHub data while preserving all other cards, prices and accounts.

## Workers Free — no paid plan

This version is designed for **Cloudflare Workers Free**. There are no paid-only CPU or subrequest overrides. You do not need to upgrade or enter payment details. Cloudflare Free quotas still apply; this package cannot remove provider limits.

If your v122 install stopped with error 100328, extract this version over the existing local project, keeping the existing .cloudflare and private-setup folders. Then run **Setup-Admin.ps1** again. The same random login passwords are retained. The existing D1 database and Discord monitor configuration are reused. You do not need to rerun Upload-GitHub just to repair the separate panel.

## First installation (Windows)

1. Extract the entire project. Keep the private-setup folder on your computer.
2. Run PowerShell in this project folder: `powershell -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1`. Wait for the Pages deployment to succeed.
3. Create a fine-grained GitHub token for **Zerqoon/Pet-Sim-test**, permission **Contents: Read and write**. Your branch must allow this token to commit directly. The panel cannot bypass branch protection.
4. Run `powershell -ExecutionPolicy Bypass -File .\Setup-Admin.ps1`. Enter that token in the hidden prompt and sign in to Cloudflare when asked. The supplied new webhook and both accounts are already included in the private setup files.
5. Open the admin address printed at the end. It is also saved in private-setup/ADMIN-ADDRESS.private.txt. Passwords are in **private-setup/LOGIN.private.txt**.

The script checks GitHub access, reuses existing monitor configuration or configures the monitor on a new installation, creates or reuses the admin database, publishes the separate editor and installs secrets. It then waits for the Free version, verifies an actual admin login and authenticated catalog read, and closes the temporary setup session. If a step fails, it stops and reports it. Running it again reuses the databases and accounts. This ZIP alone does not deploy anything: Cloudflare login and the GitHub token are needed once on your computer.

## Editing

- Sign in as Zerqoon or Pioterek. Both accounts may edit the catalog.
- Select Pets, Charms, Eggs, Items or Codes. Click a card, edit details and values, then **Add to review**. New entries use **Add card** below the grid.
- For a new pet, Golden & Diamond enables all three price/artwork fields. Existing variant support stays as defined in the catalog. Upload a normal PNG and optionally golden/diamond artwork, or enter an existing image path. Choose PNG artwork up to 16 MB and 8192 pixels per side. The browser prepares a transparent PNG at up to 512 pixels and 128 KB, scaling down further if needed. Each image is checked and staged separately. The final publish attaches the staged blobs in one commit. Wait for the artwork-ready message before adding an entry to review.
- Use numeric values, 25K, O/C, Not Price, ??? or Null. Unknown values are saved as null and displayed as Not Price. Zero is a real price.
- Open an existing card and choose **Delete card**, then **Queue removal** to remove it and its prices. **Undo removal** in review restores it before publication.
- Review up to 20 additions, edits or removals and six prepared artwork uploads per publish, then **Publish changes**. One commit updates catalog.js, prices.js, any uploaded PNGs and generated timestamp metadata. Main page files are never written by the panel.
- A changed GitHub version blocks a stale save. **Refresh** discards pending changes, loads the latest version and lets you review again. Drafts remain only in this browser tab until publishing or refreshing; avoid closing it with unfinished work.
- A network interruption can happen after a successful GitHub save. Retry the same publish first: its operation identifier lets the server recover the previous result instead of creating a second commit.

There is still exactly one editable price file: **public/data/prices.js**. price-updates.js is generated timestamp metadata, not another price source. Equivalent values such as 25000 and 25K do not reset the update date. Metadata and image-only edits also do not reset it.

## Discord and timing

The admin sends a short English **GitHub updated** message after the GitHub commit, naming the editor, changed cards and commit link. The panel reports that the public website is awaiting deployment. The price monitor sends value alerts only after deployed prices are readable: **Job Cat — 30K → 25K — Down 5K (16.67%)**. Golden/Diamond appears in the title only when needed to identify the changed pet. No Variant, Rarity or repeated old/new fields.

GitHub save → Cloudflare build → published website → next monitor check. The monitor checks every minute; a build adds its own time. A newly configured cron can take up to 15 minutes to activate. There is no promise of instant alerts before deployment. Discord errors and rate limits retain notifications in a persistent retry queue. Recent activity reports whether an admin notification was delivered or is waiting. **Test Discord** checks delivery, with automatic retry if Discord rejects the first attempt.

The monitor reads the published catalog dynamically. New pets need no separate monitor redeployment after adding them through the panel. Existing history and retry data are retained.

## Later project uploads

Upload-GitHub.ps1 detects an existing admin installation and preserves remote catalog.js, prices.js, price-updates.js and all artwork by default. This prevents a stale ZIP from undoing panel changes. Use **-UseLocalPrices** only when you intentionally want local prices, catalog and artwork to overwrite the remote data. **-UseRemotePrices** explicitly preserves the remote data even before an admin installation.

## Private configuration

Do not manually upload the private-setup or .cloudflare folders to GitHub or Pages. The included upload script excludes them, and .gitignore ignores them. Keep this ZIP and the login file private. Login verifiers, the independent server key, the GitHub token and webhook live in Cloudflare Worker secrets; they are never embedded in frontend JavaScript. The temporary token deployment file is removed after use.

Both login passwords are machine-generated 24-character base64url secrets (144 bits of entropy). Free-mode verification uses native HMAC-SHA-256 with unique salts and an independent 256-bit server secret; this is deliberately for generated secrets, not human-chosen passwords. Do not replace them with a memorable or repeated password. The local reset script generates new random secrets. Artwork decoding and sizing run in the browser, while each small prepared PNG is checked by the server. Staged artwork expires after 24 hours if not published.

Sessions use secure HttpOnly cookies, expire after eight hours and are revoked on logout. Server APIs enforce session authentication, request origin and CSRF tokens. Failed logins are rate limited. Edits use a server publish lock plus a non-forced GitHub update, and all successful saves have an audit entry. Catalog source is parsed as literals without eval or dynamic execution; PNG checks include chunk checksums. These controls reduce common failures; they cannot prevent Cloudflare/GitHub/Discord outages.

To replace passwords, run `node scripts/reset-admin-passwords.mjs` locally, then rerun Setup-Admin.ps1. This rewrites the private login/hash files and revokes existing sessions at the next login validation. Keep the token restricted to this repository and update its Cloudflare secret when it expires.

## Checks

All 98 tests passed. Run `npm test` and `npm run build` with Node.js 22.13 or newer. Tests use mocked GitHub/Discord HTTP and real SQLite for auth, sessions, locks, audits and retry state. They do not send messages to your Discord channel. Live login, catalog and PNG loading are confirmed by the setup/update scripts on your authenticated machine.

For an existing installation, extract this ZIP separately and run Start-Update.cmd. The v128 editor uses Values / Details / Artwork tabs, a live preview, a searchable asset gallery, saved review drafts, a fixed publication bar and content-verified website status. Full instructions: README-ADMIN.md.
