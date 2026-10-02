# START — Pet Universe v113

1. Rozpakuj ZIP. W środku jest cały folder `Pet Sim Universe`.
2. Otwórz ten folder w PowerShellu i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1 -UseLocalPrices
```

Ta komenda wysyła cały folder do `Zerqoon/Pet-Sim-test`, przebudowuje stronę i używa cen dołączonych do tej paczki. Zachowano wszystkie istniejące wpisy z przesłanego `prices (2).js` i dopisano nowe pety oraz Gummy Egg.

Użyj `-UseLocalPrices`, aby wysłać również nowe wpisy cenowe. Bez tego przełącznika skrypt zachowuje cały plik cen z GitHuba i nowe pozycje mogą nie mieć tam jeszcze wpisów.

3. Poczekaj na udane wdrożenie Cloudflare Pages. Ustawienia: root `Pet Sim Universe`, build `npm run build`, output `public`.
4. Wszystkie ceny edytuj w `public/data/prices.js`. Gummy Bear ma `O/C`; pozostałe nowe ceny mają `null`, dopóki nie wpiszesz swojej wyceny. Sunken Eel i Blobfish mają osobne ceny `normal`, `golden`, `diamond`.

Nie trzeba ponownie konfigurować Discorda. Zachowaj swoje sekrety i prywatny folder `.cloudflare`. Instrukcje monitora: `README-CLOUDFLARE.md`.

Lista nowości: `START-v113.md`.
