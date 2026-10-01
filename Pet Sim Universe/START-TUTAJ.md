# START — Pet Universe v110

1. Rozpakuj ZIP. W środku jest cały folder `Pet Sim Universe`.
2. Otwórz ten folder w PowerShellu i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Skrypt wysyła cały folder projektu do `Zerqoon/Pet-Sim-test`, przebudowuje pliki strony i domyślnie zachowuje aktualny `public/data/prices.js` z GitHuba. Jeśli chcesz świadomie wysłać także lokalne ceny, dodaj `-UseLocalPrices` do powyższej komendy.

3. Poczekaj na udane wdrożenie Cloudflare Pages. Ustawienia: root `Pet Sim Universe`, build `npm run build`, output `public`.
4. Nowy układ zobaczysz po zakończonym wdrożeniu i zwykłym odświeżeniu strony. Hashe plików CSS i JS zmieniają się przy przebudowie.

Aktualizacja wyglądu nie wymaga ponownej konfiguracji Discorda. Zachowaj swój prywatny folder `.cloudflare` oraz sekrety serwerowe. Konfiguracja monitora: `README-CLOUDFLARE.md`.

Szczegóły zmian i sprawdzenia: `START-v110.md`.
