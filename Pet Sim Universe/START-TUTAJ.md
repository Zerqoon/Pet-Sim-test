# Pet Universe Values v85

ZIP zawiera gotowy folder **Pet Sim Universe**. W repozytorium umiesc ten folder z jego zawartoscia, zachowujac nazwe. Nie wgrywaj zawartosci public bezposrednio do glownego katalogu repozytorium.

## Edycja

- `public/data/prices.js` — cala lista cen; np. `"job-cat": 22500,` lub `"job-cat": "O/C",`.
- `public/data/catalog.js` — nazwy, procenty, opisy, warianty i sciezki grafik.
- `public/app.js` — zachowanie strony i kalkulator.
- `src/index.html` — zrodlo ukladu HTML.
- `public/*.css` — dotychczasowe style; `public/assets/` — grafiki.
- `scripts/` — walidacja, build i lokalny serwer.
- `public/bundle/` — wygenerowane pliki; nie edytuj ich recznie.
- `functions/api/` — API historii i snapshotow.

W prices.js pety z wariantami maja normal, golden i diamond. Null oznacza brak ustalonej ceny. Codes nie maja cen. Przy dodawaniu przedmiotu dodaj opis w catalog.js i cene w prices.js.

## Cloudflare Pages

Root directory: `Pet Sim Universe`
Build command: `npm run build`
Build output directory: `public`
Node.js: 22 lub nowszy.

Ceny sa osobnym modulem z no-store. Po zmianie prices.js na GitHubie poczekaj na udany deploy Cloudflare i odswiez strone (F5). Nie potrzebujesz lokalnego builda do zmiany ceny. Zmiany kodu, HTML i CSS wymagaja builda; Cloudflare moze wykonac go automatycznie.

## Lokalnie

Otworz PowerShell w folderze Pet Sim Universe i uruchom `npm run dev`. Wejdz na http://127.0.0.1:4173. Nie otwieraj index.html jako file://.

## Blad ze zdjecia

`curl 56 GnuTLS recv error`, `early EOF` oraz `Failed ... fetching repository` oznaczaja przerwane pobieranie repozytorium przez Cloudflare przed buildem. Ponow wdrozenie. Zmiana plikow projektu nie naprawia tego bledu transferu.
