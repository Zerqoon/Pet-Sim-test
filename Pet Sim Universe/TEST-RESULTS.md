# v122 verification

- 64 automated tests passed. GitHub and Discord HTTP were mocked; SQLite state and transactions were real.
- Main-site build and catalog validation passed.
- An isolated publication test added a pet with Normal, Golden and Diamond PNGs, Not Price inputs and a zero value. Its complete catalog validation and production build passed.
- Every main-site public/ and src/ file is byte-for-byte identical to v121, including prices.js and price-updates.js.
- Both random account passwords match their server hashes.
- Admin static selectors and form fields were checked against the HTML.
- The webhook secret occurs only in the excluded private setup configuration, not public code.
- ZIP integrity was checked after packaging.

Not performed: browser/physical-phone rendering, authenticated GitHub or Cloudflare deployment, live Discord delivery. The deployment script performs the live checks on the owner's computer. No live deployment is claimed by this package. Admin requires Workers Paid for its configured CPU budget.
