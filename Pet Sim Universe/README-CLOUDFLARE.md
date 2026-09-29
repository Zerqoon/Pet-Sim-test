# Pet Universe Values v40

## Cloudflare Pages

Use these settings:

- Root directory: `Pet Sim Universe`
- Build command: `npm run build`
- Build output directory: `public`

## D1

Keep the D1 binding name exactly:

`VALUES_DB`

The existing history endpoints are kept:

- `/api/health`
- `/api/history`
- `/api/snapshot`

## v40 UI

- old Values layout restored
- one Home button on the right side of Values / Calculator headers
- one `Stat Pets` section while individual pet rarity badges remain
- trade calculator uses `+` slots instead of inline selects
- picker opens only after pressing `+`
- duplicate items increase quantity (`x1`, `x2`, `x3`...)
- tickets can be added separately to either side
- left side positive difference = W, negative difference = L
- existing D1 Value History stays intact
