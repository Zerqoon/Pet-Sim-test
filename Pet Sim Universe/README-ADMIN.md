# Pet Universe Admin v125

The public website, its assets, prices and saved price timestamp are unchanged. The admin now uses a full card grid: select a card, edit it in a modal, save to review, then publish. Add card is below the grid. New entries can be assigned to Pets, Charms, Eggs, Items or Codes; Items also support General/Fishing. These are the existing website categories, not a system for inventing new public tabs.

## Update your existing installation

Merge this project into your existing project directory. Keep your existing `.cloudflare` directory and login/secret files in `private-setup`. Include the new `private-setup/admin-webhooks.private.json` from this release. Never upload private-setup to GitHub.

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Admin.ps1
```

The updater keeps the deployed GitHub token and account credentials. It installs only the separate GitHub audit webhook and redeploys the admin, retaining the existing database. It verifies login, catalog access and logout before reporting success.

The default address is https://admin.petuniverse-values.pl. Cloudflare must already manage the active petuniverse-values.pl zone in the same account as your Worker. The script configures a Custom Domain for the admin hostname only; it does not replace the public website. Cloudflare manages the domain record and HTTPS certificate. Initial DNS/certificate activation may take time. The workers.dev address remains available. No paid Workers settings are configured.

To keep only workers.dev instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Admin.ps1 -WorkersOnly
```

For an entirely new installation, run Setup-Admin.ps1. It asks for the GitHub token; the update command does not.

## Notifications

- GitHub audit: a separate webhook sends **GitHub updated**, the signed-in username (Zerqoon or Pioterek), changed entries, commit link and exact time. These notices describe commits saved through the panel. Direct manual commits made outside the panel are not attributed by this admin service.
- Prices: the existing price monitor keeps its separate value webhook. Alerts describe actual prices after the website deploys. Uploading artwork or editing descriptions does not generate a false price alert.
- Test Discord in Recent updates tests the GitHub audit channel. Use Upgrade-Discord.ps1 to check the existing price monitor.

Both webhook URLs remain private; they are not included in admin browser files or the public website. Queued admin audit messages retry through the existing database/cron.

## Verification

74 automated tests pass, including distinct webhook destinations, both editor identities, credential protection, atomic GitHub commits, retries, artwork validation and custom-domain configuration. The main website build passes. Main src/public files and login passwords match the prior release byte for byte. HTML identifiers, form structure and JS selectors were checked. A local browser executable was unavailable, so actual desktop/phone rendering and live Cloudflare deployment must be checked after installation; neither is claimed as verified here.
