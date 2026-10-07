# Public protection patch verification

- 130 automated tests passed, including eight new protection checks. Public validation and build passed.
- Ordinary right-click menus, image dragging/copying, inspect/console/source/save shortcuts are intercepted. Search/calculator input, redeem-code copying and normal app/navigation keys remain usable.
- The public change is limited to public/app.js, the image rule in public/redesign.css, a new protection module and regenerated public HTML/bundles. Admin, data, assets, accounts, scripts and webhooks match v128 byte for byte.
- ZIP integrity and final-source comparison passed. No live deployment or physical-browser/phone verification is claimed. Browser-owned commands can bypass page JavaScript.

## Base v128 verification

- 122 automated tests passed. External HTTP was mocked; SQLite state and transactions were real.
- Public validation and build passed: 32 pets, 14 charms, 4 eggs, 8 items and 11 codes. All public/src files, generated public bundles, asset bytes and private-setup files match the v127 source archive.
- The bundled prices, catalog and price timestamp were not edited for this admin release. The updater uses the latest GitHub catalog, prices and artwork when uploading.
- New tests cover numeric/zero/unpriced comparisons; scoped draft storage, corruption, expiry and immutable publish recovery; per-card conflicts; variant gallery choices; bounded and complete asset inventory; exact catalog and price checks for Website live; failed checks; legacy activity; separate Discord states; structured history; authenticated endpoints; missing config recovery without remote writes; retained existing configs and rejected corrupt or conflicting configs.
- Existing tests continue to cover public values, timestamps, monitor retries, authentication/CSRF, exact PNG paths and fallback, atomic publication, stale heads, attributed audit delivery and the v127 cleanup checkpoints.
- Admin JavaScript syntax, HTML nesting, identifiers, selector/form references, editor panels and CSS delimiters were checked.
- ZIP integrity, completeness and archived bytes were checked against the final source directory.

Not performed: live authenticated GitHub/Cloudflare deployment, live Discord delivery, Windows PowerShell execution, or visual desktop/phone browser rendering. The browser preview timed out; no visual QA is claimed. Setup/update scripts perform live version, login, catalog and PNG checks on the owner's computer.
