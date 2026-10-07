# Public website protection patch

The public website blocks ordinary right-click menus, image dragging, clipboard actions containing artwork, F12, common inspect/console shortcuts, View Source and Save Page shortcuts. Images also disable the standard iOS touch callout where supported.

Search/calculator fields, normal text copying, Copy Code and Save Trade Image remain available. The layout, admin panel, prices, catalog, accounts, artwork and webhooks are unchanged.

This discourages casual copying. Browser controls, downloaded public source/assets and screenshots cannot be made inaccessible by website JavaScript. Editing a page in DevTools changes that visitor's local view; it does not modify the hosted project or admin data.

Use the existing update/upload workflow. Public data should continue to be retained from the current repository with UseRemotePrices. The included protection tests exercise shortcut blocking and preserved input/code-copy behavior; they do not claim to control browser-owned menus or physically test every device.
