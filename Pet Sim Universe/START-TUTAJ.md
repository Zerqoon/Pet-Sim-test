# START — Pet Universe: Categories i aktualne ceny

1. Rozpakuj ZIP. W środku jest cały folder `Pet Sim Universe`.
2. Otwórz ten folder w PowerShellu i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Ta komenda wysyła cały folder do `Zerqoon/Pet-Sim-test`, przebudowuje stronę i używa cen dołączonych do tej paczki. Plik `public/data/prices.js` jest dokładną kopią przesłanego `prices (4).js`, z Twoimi cenami petów, jajek, charms i Items.

Skrypt domyślnie korzysta z cen z tej paczki. Opcjonalne `-UseLocalPrices` nadal działa. Tylko jawne `-UseRemotePrices` zachowuje ceny aktualnie zapisane na GitHubie.

3. Poczekaj na udane wdrożenie Cloudflare Pages. Ustawienia: root `Pet Sim Universe`, build `npm run build`, output `public`.
4. Późniejsze ceny edytuj w `public/data/prices.js`. Wszystkie 35 petów, 16 charms, 4 jajka i 12 Items mają wpisy. Warianty petów mają osobne ceny `normal`, `golden`, `diamond`.

Tytuły Pet Values, Charm Values, Egg Values, Item Values i Codes są wyśrodkowane nad filtrami. Nagłówek Trade Calculator jest również wyśrodkowany. W Items przyciski All Items / General / Fishing są w nagłówku przy wyszukiwarce, pod etykietą Categories. Mają większe napisy, jednakową wysokość i wyraźnie zaznaczoną aktywną kategorię. Pet Variant pojawia się w Pet Values. Jajka mają równy układ czterech kart na komputerze i dwóch kolumn na mniejszych ekranach; przy szerokości poniżej 360 px jest jedna kolumna. Zachowano pięć itemów Fishing oraz poprawioną grafikę Moon Chest.

Nie trzeba ponownie konfigurować Discorda. Zachowaj swoje sekrety i prywatny folder `.cloudflare`. Instrukcje monitora: `README-CLOUDFLARE.md`.

Poprzednie pliki `START-v*.md` opisują starsze wersje projektu.

## Data aktualizacji cen

Pod tytułem Pet Values, Charm Values, Egg Values i Item Values jest teraz
`Prices updated … ago` oraz dokładna data i godzina w strefie `Europe/Warsaw`.
To wspólna data ostatniej aktualizacji wszystkich cen; Codes jej nie pokazuje.

Nadal edytuj tylko `public/data/prices.js`. `npm run build` automatycznie
zapisuje czas commita zmieniającego ten plik; przy lokalnej zmianie cen używa
czasu zapisania pliku. Odświeżanie strony i build bez zmiany wartości nie
zerują daty. Równoważne zapisy, np. `30000` i `"30K"`, również jej nie zerują.
W Cloudflare zostaw build command `npm run build` — bez wykonania buildu
ceny mogą się zmienić, ale zapisany czas nie będzie zaktualizowany.

ZIP pobrany z GitHuba nie zawiera historii commitów, więc przed pierwszym
buildem w repozytorium lub faktyczną zmianą cen może być widoczne
`Price update time unavailable`. Projekt nie przypisuje cenom daty samego
rozpakowania ZIP-a. Skrypt `Upload-GitHub.ps1` wykonuje build w repozytorium.
