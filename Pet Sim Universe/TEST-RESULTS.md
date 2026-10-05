# v123 verification

- 70 automated tests passed. GitHub and Discord HTTP were mocked; SQLite state and transactions were real.
- Main-site build and catalog validation passed.
- An isolated publication test added a pet with Normal, Golden and Diamond PNGs, Not Price inputs and a zero value. Its complete catalog validation and production build passed.
- Every main-site public/ and src/ file is byte-for-byte identical to v122, including prices.js and price-updates.js.
- Both random account passwords match their server hashes.
- Admin static selectors and form fields were checked against the HTML.
- The webhook secret occurs only in the excluded private setup configuration, not public code.
- ZIP integrity was checked after packaging.

Not performed: browser/physical-phone rendering, authenticated GitHub or Cloudflare deployment, live Discord delivery. The deployment script performs the live checks on the owner's computer. No live deployment is claimed by this package. The admin configuration has no paid-only CPU limits. Account migration retains the existing generated passwords. Tests also cover individual PNG staging, upload expiry/ownership, Free setup readiness and authenticated post-deploy verification.

- Local profiling measured approximately 3.0 ms CPU for the current catalog decode/edit pipeline and 0.18 ms for the login verifier; these are local measurements, not guarantees of Cloudflare execution time.
- Free publishes are capped at 20 edits and six separately staged PNGs to keep GitHub subrequests bounded.
