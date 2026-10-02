# START — Pet Universe v112

1. Rozpakuj ZIP. W środku jest cały folder `Pet Sim Universe`.
2. Otwórz ten folder w PowerShellu i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1 -UseLocalPrices
```

Ta komenda wysyła cały folder projektu do `Zerqoon/Pet-Sim-test`, przebudowuje stronę i używa Twojego `public/data/prices.js` dołączonego do tej paczki. Plik jest identyczny z przesłanym `prices (1).js`. Jeśli zamiast niego chcesz zachować nowsze ceny z GitHuba, pomiń `-UseLocalPrices`.

3. Poczekaj na udane wdrożenie Cloudflare Pages. Ustawienia: root `Pet Sim Universe`, build `npm run build`, output `public`.
4. Nowy układ zobaczysz po zakończonym wdrożeniu i zwykłym odświeżeniu strony. Hashe plików CSS i JS zmieniają się przy przebudowie.

Aktualizacja wyglądu nie wymaga ponownej konfiguracji Discorda. Zachowaj swój prywatny folder `.cloudflare` oraz sekrety serwerowe. Konfiguracja monitora: `README-CLOUDFLARE.md`.

Szczegóły zmian i sprawdzenia: `START-v112.md`.
