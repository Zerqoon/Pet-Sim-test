# START — Pet Universe v89

1. Otwórz folder `Pet Sim Universe` z ZIP-a w PowerShellu.
2. Wyślij projekt: `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1`.
3. Poczekaj na udany deploy Cloudflare: root `Pet Sim Universe`, build `npm run build`, output `public`.
4. Uruchom powiadomienia: `powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1`.
5. Wklej webhook z rozmowy i zaloguj się do Cloudflare. Monitor zapamięta początkowe ceny.
6. Potem zmieniaj ceny tylko w `public/data/prices.js`. Nowa cena po deployu i zwykłym odświeżeniu, embed na Discordzie po wykryciu przez monitor.

Adresu webhooka nie dodawaj do publicznych plików. Skrypt zapisuje go jako sekret serwerowy.
Pełna instrukcja: `README-CLOUDFLARE.md`.
