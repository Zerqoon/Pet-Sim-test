# v127 verification

- 98 automated tests passed. GitHub and Discord HTTP were mocked; SQLite state and transactions were real.
- Public catalog validation and build passed: 32 pets, 14 charms, 4 eggs, 8 items, 11 codes; 76 price streams, including 67 numeric values.
- Exactly nine requested cards and their prices were removed. All metadata and values of the other 58 priced entries match v126. Golden Fish Hook, Universe Worm and Fishing Charm III remain.
- Only public/data/catalog.js, prices.js and price-updates.js changed in the public site. Other public/src files, artwork and private account files match v126 byte for byte.
- Removal tests cover every category, all variants, code-only date preservation, malformed/mixed batches, authorization, CSRF, stale versions, one commit and attributed audit delivery.
- Local cleanup preserves owner-edited values and owner-added cards, saves the original data files and makes no further changes when rerun.
- Release cleanup tests cover preserving unrelated data, a lost response after a successful commit, persistent failure with safe resumption, stale-head refresh and a completed update remaining completed.
- The existing image tests cover all remaining catalog, variant and source PNGs, spaced filenames, bounded fallback, authentication and oversized/non-PNG responses.
- Admin HTML identifiers, form fields and JavaScript selectors were checked. JavaScript syntax and stylesheet brace balance were checked.
- The complete ZIP passed archive integrity and source-file comparison checks.

Not performed: live authenticated GitHub/Cloudflare deployment, live Discord delivery, Windows PowerShell execution, or actual desktop/phone browser rendering. The owner-side updater checks live admin version, login, catalog and PNG delivery before applying the requested cleanup and uploading the project.
