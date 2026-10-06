# Pet Universe Admin v127

A separate English admin workspace for Zerqoon and Pioterek. The public website keeps its existing layout. This release adds catalog removal and a redesigned card manager with category counts, search, rarity filtering, sorting, change summaries and a structured card editor.

## Requested cleanup

The bundled catalog and sole editable price file already exclude these entries:

| Category | Removed cards |
| --- | --- |
| Pets | Exquisite Peacock, Imp, Shadow Dominus — including Golden and Diamond prices |
| Charms | Fishing Charm I, Fishing Charm II |
| Items | Squeaky, Ball, Fish Hook, Worm |

Golden Fish Hook, Universe Worm and Fishing Charm III remain. The packaged catalog contains 32 pets, 14 charms, 4 eggs, 8 items and 11 codes. Every other value from v126 is preserved exactly. Original artwork files remain available for existing references and later reuse.

## Update an existing installation

Extract the ZIP into a separate folder. Open PowerShell in its Pet Sim Universe folder and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1
```

The default existing project is C:\Users\zerqo\Desktop\Pet Sim Universe. To use a different existing project:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1 -ProjectPath "C:\YourFolder\Pet Sim Universe"
```

The updater:

1. Copies the new project code into the existing installation while retaining its local prices, artwork, Cloudflare configuration and private credentials.
2. Removes the nine requested entries from the existing local catalog/prices while retaining all other local values and added cards. Original data files are backed up in .cloudflare/v127-local-data-backup.
3. Deploys admin v127 and verifies login, GitHub catalog access and a PNG response.
4. Removes only the requested entries from the latest GitHub catalog through the authenticated admin API. Other cards, including cards added after the ZIP was created, and their current prices are retained.
5. Uploads the whole project with the latest remote catalog, prices and artwork. The existing price monitor is checked by the existing upload workflow.

The cleanup uses the current GitHub head, one atomic publication, the normal server validation and an audit attributed to Zerqoon. It saves its pending operation locally for recovery. Interrupted requests retry the same identifier; rerunning a completed update keeps the cleanup completed. Keep your existing .cloudflare folder between updates. No paid-only Workers settings are added.

To update only the panel and requested cleanup after copying admin/scripts into the existing project, run Upgrade-Admin.ps1. The default admin domain remains https://admin.petuniverse-values.pl and the workers.dev fallback stays available. The deployed GitHub token, users and database are retained. New installations use ADMIN-START.md.

## Managing cards

Click a card to open its editor. Edit details, values or PNGs, then **Save to review**. **Add card** sits below the collection; new cards can belong to Pets, Charms, Eggs, Items or Codes. Items support General and Fishing. Search, rarity filters and catalog/name/pending sorting help manage larger collections.

To remove a card, open it and select **Delete card**, then **Queue removal**. A pet removal includes its Normal, Golden and Diamond values. The card stays on the public website until publication and appears in red in the admin review. **Undo removal** restores editing before publication. Removing an unpublished new card from review simply discards that draft.

Review supports up to 20 additions, edits or removals and six prepared PNGs per publication. **Publish changes** applies the whole batch in one GitHub commit. A changed repository version blocks a stale save; refresh and review again. If a connection interrupts publication, retry the same publication to recover its result.

There is still one editable price source: public/data/prices.js. ???, Null and other accepted missing-price values become Not Price. Zero remains priced and O/C remains O/C. price-updates.js is generated timestamp metadata. Metadata-only and equivalent-price changes keep the existing price date. Removing priced cards records the resulting catalog/price revision; remaining values are preserved.

## Artwork and notifications

Image paths retain their exact case and filename, including spaces. Normal artwork can come from image or variantImages.normal. The panel first loads an image from the public website, then falls back to an authenticated PNG from the matching GitHub commit if necessary. Failed images keep a clear placeholder. New uploads are prepared to 512 pixels and 128 KB; original repository PNGs can be read up to 8 MB.

The separate audit webhook sends **GitHub updated**, the signed-in editor, added/updated/removed card names and a commit link. The existing value webhook reports actual price changes after the website deployment. Publication history reports delivery or pending retries. Both webhook configurations and login credentials remain private.

## Verification

98 automated tests pass and the public build passes. Tests cover removals in every category, complete variant-price cleanup, undoable review, stale versions, atomic writes, authenticated image access, retries, both editor identities and recovery of interrupted release cleanup. Main page code, styling, original artwork and private account files match v126; the public data changes are limited to the catalog, prices and generated timestamp.

GitHub/Discord HTTP is mocked in tests. Live Cloudflare/GitHub deployment and desktop/phone browser rendering were not performed here. The setup/update scripts perform live login, catalog and image checks on the owner's computer.
