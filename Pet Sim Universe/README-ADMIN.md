# Pet Universe Admin v128

A separate English workspace for Zerqoon and Pioterek. The public website, current packaged catalog, prices, artwork and account credentials are retained from v127.

## Update your existing project

Extract this ZIP into a separate folder, open its **Pet Sim Universe** folder and double-click **Start-Update.cmd**. It updates the existing project at `C:\Users\zerqo\Desktop\Pet Sim Universe`.

PowerShell alternative:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1
```

For a different existing location:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1 -ProjectPath "C:\YourFolder\Pet Sim Universe"
```

The updater copies application code while retaining existing data, artwork, private credentials and Cloudflare configuration. If local admin configuration is missing, it discovers the existing Worker, D1 database and installed secret names and reconstructs the local files. Recovery does not create another Worker or replace its GitHub token, users or secrets. An invalid local configuration stops recovery without overwriting the file.

The admin is deployed on Workers Free. The updater verifies the actual version, login, catalog and PNG delivery. It then uploads the full project using the latest GitHub catalog, prices and artwork through `-UseRemotePrices`. Cards and values added after this ZIP was prepared are retained. Completed v127 cleanup remains completed; its checkpoint names intentionally remain v127.

Panel: https://admin.petuniverse-values.pl. The existing workers.dev fallback remains enabled. Keep the existing private-setup and .cloudflare folders. For a first installation, use ADMIN-START.md.

## The new workspace

- A shorter centered heading and compact counters leave more room for cards. The catalog uses up to six columns and a wider desktop layout.
- Categories, search, filters, sorting and Add card stay together in a sticky toolbar.
- Click a card to edit it. Existing cards open on Values; new cards and codes open on Details. The separate Artwork tab has custom English upload buttons, PNG drop areas and a searchable gallery of repository assets.
- The editor includes a live card preview and Normal / Golden / Diamond previews. Value inputs show old → new values and percentage changes where applicable. Invalid prices block saving.
- A fixed Review / Publish bar appears for pending changes. Review lists additions, edits, removals and value differences. Each change can be edited or discarded before publishing.
- Saved review changes are retained on this device for up to seven days and are scoped to the signed-in editor. Refresh or sign out and return to restore them. Unsaved form typing must first be saved to review. If browser storage is unavailable, the panel says so.
- Remote changes to the same card are detected when refreshing or restoring a draft. Review and save the affected card again to acknowledge the current version. Expired staged PNGs must be uploaded again.
- An interrupted publication retains its exact request ID and contents. Confirm publish checks that same operation before further editing; it does not blindly publish a second commit.
- History starts with five compact entries. Expand an entry for changes, editor, time and commit link; Show more loads the next five of the last thirty entries.
- The latest publication has independent GitHub, Website and Discord states. Website live requires matching catalog and price content on the public site. Failed checks remain unconfirmed; old publications without a saved fingerprint are not reported as verified live. Checks repeat every thirty seconds for up to ten minutes and can be repeated manually.

The phone layout uses three cards when space allows, two below 350 px, a full-screen editor and controls above the bottom safe area. Desktop previews sit beside the editor; phone previews use a compact row above its tabs.

## Cards, artwork and prices

Add card supports Pets, Charms, Eggs, Items and Codes. Items support General and Fishing. Delete → Queue removal stages a removal; Undo cancels it before publication. A pet removal includes all its variant values. The original v127 removals remain applied to the bundled catalog: Exquisite Peacock, Imp, Shadow Dominus, Fishing Charm I, Fishing Charm II, Squeaky, Ball, Fish Hook and Worm. Golden Fish Hook, Universe Worm and Fishing Charm III remain.

Publish supports up to twenty changes and six prepared PNG uploads in one atomic GitHub commit. Larger batches of existing asset selections use a single repository-tree lookup to avoid one request per image. A missing or incomplete asset library blocks publication before the commit.

There is one editable price source: **public/data/prices.js**. ???, Null and accepted missing-price inputs display as Not Price. Zero remains a price and O/C remains O/C. **price-updates.js** contains generated revision and timestamp metadata only. Equivalent values and metadata-only edits retain the price date. The admin copy of price-core.js contains normalization logic, not prices, and is synchronized from the public module before deployment.

The image loader preserves case, spaces and Unicode in PNG paths. It loads public artwork first, then tries an authenticated image from the matching GitHub commit. New PNGs are prepared to at most 512 px and 128 KB. Repository PNGs can be read up to 8 MB. Uploaded artwork is staged privately for 24 hours; the UI conservatively asks for reupload after 23 hours.

The separate admin audit webhook names the editor and changed cards with a commit link. The value webhook reports actual value changes after public deployment. Discord delivery follows the persisted retry queue; the panel reports delivered only after Discord confirms receipt. Test Discord checks the admin audit webhook.

## Verification

122 automated tests and the public validation/build passed. GitHub, Cloudflare discovery and Discord HTTP were simulated; SQLite state and transactions were real. Tests cover draft recovery and conflicts, price deltas, gallery selection, bounded asset checks, publication content verification, authentication, atomic saves, retries and configuration recovery. Public site files, all artwork and private account files were compared byte-for-byte with v127.

Live deployment, live Discord delivery, Windows PowerShell execution and visual desktop/phone rendering were not performed in this environment. The browser preview timed out. Owner-side scripts verify the live deployment when run on your computer.
