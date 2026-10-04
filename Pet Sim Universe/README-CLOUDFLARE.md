# Pet Universe Values

Kompletny projekt z Twoim `prices (6).js`, grafikami, Value List,
Trade Calculator, W/L/FAIR, eksportem oferty do PNG oraz historią Cloudflare D1.
Aktualna instrukcja: `START-TUTAJ.md`. Zachowano Categories w Items,
Fishing / General, Moon Chest, wyrównane jajka, nagłówki i wszystkie 11 kodów.

## Cloudflare Pages

| Ustawienie | Wartość |
| --- | --- |
| Root directory | `Pet Sim Universe` |
| Build command | `npm run build` |
| Build output directory | `public` |
| D1 binding historii, jeśli używany | `VALUES_DB` |

`Upload-GitHub.ps1` domyślnie wgrywa ceny z paczki, wykonuje build przed
commitem i zachowuje pozostałe katalogi repozytorium. Sekrety i `.cloudflare`
są wyłączone z kopiowania. Jeśli lokalna konfiguracja monitora istnieje,
skrypt następnie czeka na nowe ceny na stronie, wdraża Workera i sprawdza Discorda.

## Ceny i czas

Jedynym edytowanym źródłem cen jest `public/data/prices.js`. Build porównuje
rzeczywiste wartości, zapisuje datę w `price-updates.js` i generuje
`public/data/price-feed.json`. Revision jest skrótem SHA-256 posortowanych
wartości po ich normalizacji. Data jest używana tylko dla pasującej revision.
Nie edytuj plików wygenerowanych ani `public/bundle`.

Przy lokalnej zmianie używany jest czas zapisania pliku, przy edycji na
GitHubie — czas commita zmieniającego ceny. Zachowany czas importu nie zmienia
się przy późniejszym uploadzie tej samej paczki. Build, komentarz, formatowanie
lub równoważne zapisy `30000`, `"30K"`, `"30k"` nie tworzą aktualizacji cen.
Powrót A → B → A jest uwzględniany w historii Git.

Duży panel pod Stop Animations pokazuje dokładną datę z sekundami w polskiej
strefie oraz bieżący licznik. Strona sprawdza nowe dane co minutę i po powrocie
do karty. Aktualizuje wspólne obiekty katalogu, ceny kart, dialogi i kalkulator
bez utraty wybranej oferty. Przy chwilowym błędzie zachowuje ostatnie sprawdzone dane.

Ta paczka zawiera czas otrzymania nowego pliku: `2026-10-04T12:17:41.048Z`,
czyli `04 Oct 2026, 14:17:41 CEST`. Oryginalny czas edycji na komputerze
nie jest dostępny w przesłanym pliku. Data nie jest czasem wizyty na stronie.

## Discord — uruchomienie albo naprawa

Pages i Worker monitora są osobnymi wdrożeniami. ZIP i sam commit strony
nie aktywują monitora na koncie Cloudflare.

Z istniejącym `.cloudflare/price-monitor.json`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1
```

Jeśli konfiguracja została w poprzednim folderze:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1 -ProjectPath "C:\Poprzedni-projekt\Pet Sim Universe"
```

Bez niej:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1
```

Setup pyta o aktualny webhook, sprawdza jego odpowiedź i wykorzystuje istniejącą
bazę `pet-universe-price-monitor` lub tworzy ją, jeśli jej brakuje.
Upgrade wdraża aktualny `workers/price-monitor.js`, zachowuje bazę,
zdalny `DISCORD_WEBHOOK_URL` i kolejkę; aktualizuje cron i klucz `MONITOR_KEY`.
Nie zawiera starego Workera zaszytego w PowerShellu.

Oba skrypty czekają na revision z paczki na stronie. Następnie chroniony
`POST /test` odczytuje ceny i wysyła `Pet Universe — test monitora` z
`wait=true`. Sukces jest zgłaszany tylko po odpowiedzi Discorda.
Po potwierdzonym teście oczekujące zmiany mogą być ponowione na następnym
odczycie, bez długiego opóźnienia pozostałego po uszkodzonym webhooku.
Nie trzeba fikcyjnie zmieniać ceny, aby sprawdzić webhook.
Nie wgrywaj `.cloudflare`, adresu webhooka ani plików z sekretami do GitHuba.
Tymczasowe pliki z sekretami są usuwane po wdrożeniu.

## Monitor i powiadomienia

Monitor sprawdza statyczny `/data/price-feed.json`. Może więc czytać ceny bez
Pages Functions i bez `VALUES_DB`. `/api/price-feed` pozostaje źródłem zapasowym
dla starszych wdrożeń. Żadne z tych źródeł nie zawiera sekretu webhooka.
Odczyty mają `no-store` i unikalny parametr odświeżenia.

D1 zapisuje zmianę i kolejkę atomowo. Udana wiadomość jest oznaczana jako
wysłana; nie powtarza się przy kolejnym odczycie. Błąd sieci lub Discorda
powoduje ponowienie; HTTP 429 opóźnia całą kolejkę. Jeden odczyt wysyła
maksymalnie 8 zmian, reszta pozostaje w D1. Blokada chroni równoczesne wywołania.

Każdy zmieniony wariant ma powiadomienie: nazwa, właściwa miniatura,
stara → nowa cena, różnica i czas. Godzina jest czasem aktualizacji zapisanym
z tymi cenami; starszy feed bez daty używa czasu wykrycia. O/C i No Price są
obsługiwane. Nowe przedmioty zaczynają historię bez udawanej zmiany ceny.

Statyczny feed przechowuje poprzednią opublikowaną wycenę. Jeśli monitor
uruchamiany jest pierwszy raz po tej aktualizacji, odtwarza z niej realne
zmiany. Istniejący stan D1 zawsze ma pierwszeństwo. Zwykły rebuild zachowuje
poprzedni snapshot. Ta paczka zawiera 18 zmian względem poprzedniej paczki.

Przy utracie połączenia już po przyjęciu wiadomości przez Discord pojedynczy
duplikat przy ponowieniu pozostaje możliwy, ponieważ D1 i Discord nie mają
wspólnej transakcji. Nowy cron może propagować się do 15 minut; test skryptu
działa od razu i nie czeka na pierwsze zaplanowane uruchomienie.

## Diagnostyka

`/health` pokazuje wersję monitora i obecność konfiguracji bez sekretów.
`POST /check` i `/test` wymagają klucza `MONITOR_KEY`. Wynik zawiera
`checked`, `changed`, `sent`, `pending`, `revision`, `priceUpdatedAt`,
`feedSource` i `webhookStatus`. Publiczna przeglądarka nie wywołuje monitora.

| Wynik | Co sprawdzić |
| --- | --- |
| Strona nadal ma inną revision | Udany build Pages, gałąź produkcyjną i `npm run build` |
| Price feed unavailable | Czy cały `public` został opublikowany, zwłaszcza `data/price-feed.json` |
| Discord test HTTP 404 | Aktualny adres webhooka; ustaw go przez Setup |
| Discord test HTTP 401/403 | Webhook i uprawnienia/kanał Discorda |
| Discord test HTTP 429 | Limit Discorda; spróbuj testu później, zmiany czekają w D1 |
| Brak konfiguracji | Prywatny `.cloudflare` z poprzedniego folderu lub Setup |
| pending > 0 | Sprawdź następny odczyt i logi Workera; kolejka jest zachowana |

W panelu Cloudflare sprawdzaj Worker `pet-universe-price-monitor`,
`MONITOR_DB`, sekret webhooka, cron i logi. Historia `VALUES_DB` strony
pozostaje osobną bazą.

## Lokalnie

Node.js 22.13 lub nowszy z npm. Strona nie potrzebuje instalacji bibliotek.

```powershell
npm run dev
# http://127.0.0.1:4173
npm test
```

Podgląd nie wysyła Discorda. Testy używają prawdziwego SQLite i symulowanego
HTTP. Sprawdzają daty, Git, statyczny feed, odświeżanie cen, odzyskanie zmian,
kolejkę, błędy, 429, autoryzację i poprawność składni wygenerowanego JS.
Nie wykonano w tym środowisku wdrożenia na Twoim koncie ani rzeczywistego
testu kanału Discorda; zrobi go Setup/Upgrade. Nie wykonano pełnego testu
wizualnego w przeglądarce.

| Co zmieniasz | Plik |
| --- | --- |
| Ceny | `public/data/prices.js` |
| Nazwy, rarity, grafiki | `public/data/catalog.js` |
| Działanie strony | `public/app.js` |
| Struktura strony | `src/index.html` |
| Data cen | `scripts/update-price-time.mjs` |
| Statyczny feed | `scripts/build-price-feed.mjs` |
| Porównanie i embedy | `server/pricing.js` |
| Monitor, cron i kolejka | `workers/price-monitor.js` |
| Naprawa istniejącego monitora | `scripts/repair-discord.mjs` |

Dokumentacja: [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Discord webhook](https://docs.discord.com/developers/resources/webhook).
