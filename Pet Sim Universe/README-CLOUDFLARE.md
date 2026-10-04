# Pet Universe Values

Kompletny projekt z `prices (7).js`, wszystkimi grafikami, Value List,
Trade Calculator, eksportem oferty do PNG i historią Cloudflare D1.
Instrukcja wgrania do Twojego folderu: `START-TUTAJ.md`.

## Cloudflare Pages

| Ustawienie | Wartość |
| --- | --- |
| Root directory | `Pet Sim Universe` |
| Build command | `npm run build` |
| Build output directory | `public` |
| Binding historii, jeśli używany | `VALUES_DB` |

`Upload-GitHub.ps1` używa cen z paczki, wykonuje build przed commitem i zachowuje
pozostałe katalogi repozytorium. Prywatna konfiguracja i sekrety są wyłączone
z kopiowania. Przy istniejącym `.cloudflare/price-monitor.json` upload następnie
czeka na publikację cen, aktualizuje Workera i wykonuje test Discorda.

## Jedno źródło cen

Edytujesz wyłącznie `public/data/prices.js`. Strona oraz Worker pobierają
`/data/prices.js` z `no-store`, unikalnym parametrem odświeżenia i bez używania
Pages Functions. Nie istnieje dodatkowy plik z kopią cen ani zapasowy endpoint cen.
Parser odczytuje obiekty, komentarze i końcowe przecinki; nie wykonuje pobranego JS.
Pełny zestaw kategorii i wariantów jest sprawdzany przed zastosowaniem wartości.
Nazwy i obrazy pochodzą z katalogu; wyceny pochodzą z `prices.js`.

Build zapisuje w `price-updates.js` tylko datę, źródło daty i SHA-256
znormalizowanych wartości. To automatyczna metryka, bez cen i bez ręcznej edycji.
Data obowiązuje tylko dla tych samych wartości. Przy lokalnej zmianie odpowiada
zapisaniu pliku, przy edycji w Git — commitowi zmieniającemu ceny.
Build bez zmian, rozpakowanie, wizyty, komentarze i równoważne zapisy
`30000` / `"30K"` nie resetują licznika. Historia Git uwzględnia także A → B → A.

Nowy załącznik ma te same wartości co poprzedni, dlatego zachowuje poprzednio
zapisany czas `2026-10-04T12:17:41.048Z` / `04 Oct 2026, 14:17:41 CEST`.
Przesłany plik nie udostępnia oryginalnego czasu edycji na Twoim komputerze.

Panel pod Stop Animations pokazuje polską datę do sekund i bieżący licznik.
Strona pobiera dane co minutę oraz po powrocie do karty. Aktualizuje karty,
dialogi i kalkulator bez utraty oferty. Niepasująca albo brakująca metryka nie
blokuje nowych cen ani nie przypisuje im starej daty.

## Discord — instalacja i naprawa

Pages i Worker wymagają osobnych wdrożeń. Sam ZIP nie zmienia konta Cloudflare.
W tej wersji Upload automatycznie uruchamia naprawę przy zachowanej konfiguracji.

| Sytuacja | Polecenie w folderze projektu |
| --- | --- |
| Wgrywasz cały projekt z zachowaną konfiguracją | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1` |
| Tylko naprawa istniejącego Workera | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1` |
| Konfiguracja została w innym folderze | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1 -ProjectPath "C:\Poprzedni-projekt\Pet Sim Universe"` |
| Pierwszy setup albo zmiana webhooka | `powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1` |

Naprawa zachowuje istniejącą bazę `MONITOR_DB`, zapisane ceny, kolejkę i sekret
webhooka. Setup wykorzystuje istniejącą bazę `pet-universe-price-monitor`
albo tworzy ją, jeżeli nie istnieje.

Poprawka HTTP 401 usuwa stare jawne `MONITOR_KEY` / `DISCORD_WEBHOOK_URL`
z konfiguracji. Rzeczywisty stary webhook zostaje przeniesiony do sekretów.
Kod jest wdrażany z `--keep-vars=false`, a klucz zapisywany przez `wrangler secret bulk`.
Następnie `secret list` potwierdza oba sekrety, a chroniony `GET /auth` sprawdza
nowy klucz i identyfikator dokładnie tego wdrożenia. Odpowiedź poprzedniej wersji
lub przejściowy 401 powodują oczekiwanie, zamiast przedwczesnego testu.

Dopiero potem `POST /test` odczytuje ceny i wysyła wiadomość z `wait=true`.
Sukces wymaga potwierdzenia Discorda. Udany test zwalnia stare opóźnienie
ponawiania kolejki po uszkodzonym webhooku. Tymczasowy plik sekretów jest usuwany.
Konfiguracji `.cloudflare` ani adresu webhooka nie publikuj w repozytorium.

## Powiadomienia i kolejka

Zmiany porównywane są z poprzednio zapisanymi cenami D1. Zapis nowych cen i
kolejki odbywa się w jednej transakcji. Udane wiadomości nie są powtarzane
przy następnym odczycie. Błąd sieci lub Discorda powoduje ponowienie;
HTTP 429 opóźnia całą kolejkę. Jedno sprawdzenie wysyła maksymalnie 8 zmian.
Blokada zapobiega równoczesnemu przetwarzaniu przez cron i test.

Każdy zmieniony wariant otrzymuje nazwę, właściwą miniaturę, starą → nową cenę,
różnicę i czas. Brak metryki daty oznacza czas wykrycia zmiany. O/C i No Price
są obsługiwane. Nowe przedmioty i pierwszy start pustej bazy zapisują stan
początkowy. Nie potrzeba drugiego pliku cen do przechowywania historii.

Utrata połączenia po przyjęciu wiadomości przez Discord może spowodować
pojedynczy duplikat przy ponowieniu. D1 i Discord nie mają wspólnej transakcji.
Nowy cron może propagować się do 15 minut; test po wdrożeniu działa bez czekania
na pierwszy cron. Monitor sprawdza dane co minutę bez otwartej strony.

## Diagnostyka

`/health` pokazuje wersję i obecność konfiguracji bez sekretów. `/auth`
wymaga klucza i nie wysyła wiadomości. `POST /check` / `/test` również wymagają
klucza `MONITOR_KEY`. Wynik zawiera `checked`, `changed`, `sent`, `pending`,
`revision`, `priceUpdatedAt`, `feedSource` i `webhookStatus`.

| Błąd | Rozwiązanie |
| --- | --- |
| Strona nadal ma inne ceny | Sprawdź udany build Pages, gałąź produkcyjną i `npm run build` |
| `prices.js: HTTP ...` / Invalid PRICES data | Opublikuj cały `public`, sprawdź format `public/data/prices.js` |
| Catalog changed | Wgraj cały projekt i zaktualizuj Worker po dodaniu przedmiotów |
| 401 przy `/auth` | Uruchom Upgrade z nowej paczki; czyści stary klucz i sprawdza nowe wdrożenie |
| Discord test HTTP 404 | Ustaw aktualny webhook przez Setup |
| Discord test HTTP 401/403 | Sprawdź webhook i uprawnienia kanału Discorda |
| Discord test HTTP 429 | Limit Discorda; ponów test później, kolejka jest zachowana |
| Brak konfiguracji | Zachowaj prywatny `.cloudflare` albo uruchom Setup |
| `pending > 0` | Kolejne odczyty opróżniają kolejkę; sprawdź logi Workera |

## Lokalnie i testy

Node.js 22.13 lub nowszy z npm; strona nie wymaga dodatkowych bibliotek.
`npm run dev` uruchamia podgląd pod `http://127.0.0.1:4173`. `npm test` sprawdza
rzeczywisty SQLite, daty i historię Git, jeden plik cen, warianty, kolejkę,
ponawianie, 429, autoryzację, wdrożenie sekretów i składnię wygenerowanego JS.
HTTP w testach jest symulowany; testy nie wysyłają wiadomości na kanał.

W tej paczce przeszedł build oraz 34 testy. Wdrożenie na Twoim koncie i
rzeczywiste potwierdzenie Discorda wykonuje Upload/Upgrade/Setup.

| Element | Plik |
| --- | --- |
| Wszystkie ceny | `public/data/prices.js` |
| Nazwy, rarity i grafiki | `public/data/catalog.js` |
| Odczyt jednego pliku | `public/data/value-loader.js` |
| Data zapisywana przez build | `scripts/update-price-time.mjs` |
| Działanie strony | `public/app.js` |
| Struktura strony | `src/index.html` |
| Monitor i kolejka | `workers/price-monitor.js` |
| Naprawa i kontrola wdrożenia | `scripts/repair-discord.mjs`, `scripts/discord-deploy.mjs` |

Dokumentacja: [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
[Discord webhook](https://docs.discord.com/developers/resources/webhook).
