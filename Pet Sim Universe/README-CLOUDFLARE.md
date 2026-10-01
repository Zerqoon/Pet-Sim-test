# Pet Universe Values v89

Cały projekt z oryginalnymi grafikami, Value List, Trade Calculator,
W/L/FAIR, zapisem oferty do PNG oraz historią Cloudflare D1.
Ceny w paczce pobrano z gałęzi main Twojego GitHuba 1 października 2026.

## Zmiany

- Wszystkie rarity badge mają ten sam krój, wysokość i pełne kolorowe tło.
  Exclusive jest fioletowy, Mythical ciepły różowo-złoty, Secret srebrny.
  Napisy mają ciemny kolor i mocny kontrast. Dotyczy to kart, szczegółów
  oraz wyboru przedmiotów w kalkulatorze.
- Telefon: czytelniejsze karty, wyrównane filtry i warianty, większe przyciski,
  dopasowane dialogi bez dwóch wewnętrznych pasków przewijania.
- Mniej animacji pracuje poza ekranem. Podczas przewijania na telefonie
  dekoracje chwilowo pauzują, a po zatrzymaniu wracają. Szkło, grafiki,
  efekty i oba motywy pozostają w projekcie.
- Osobny monitor Cloudflare wysyła zmiany cen na Discord: nazwa, wariant,
  obrazek, np. **30K → 25K**, różnica i godzina w strefie Europe/Warsaw.
  Działa bez otwierania strony przez użytkownika.

## 1. Wgranie całego projektu

Rozpakuj ZIP. Otwórz PowerShell w folderze `Pet Sim Universe`, w którym
widać `package.json`, `public`, `functions`, `scripts` i oba pliki `.ps1`.
Potrzebny jest Git for Windows oraz Node.js 22 lub nowszy z npm.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Skrypt sprawdza dane i wykonuje build, klonuje repozytorium
`Zerqoon/Pet-Sim-test`, podmienia folder `Pet Sim Universe` i wysyła commit
na `main`. Pozostałe katalogi repozytorium pozostają na miejscu.
Pliki prywatnej konfiguracji i sekrety są wyłączone z kopiowania.
Logowanie do GitHuba, jeśli jest potrzebne, obsługuje Git.

Cloudflare Pages powinno mieć:

| Ustawienie | Wartość |
| --- | --- |
| Root directory | `Pet Sim Universe` |
| Build command | `npm run build` |
| Build output directory | `public` |
| D1 binding istniejącej historii | `VALUES_DB` |

Po udanym wdrożeniu wystarczy zwykłe odświeżenie strony.
Endpoint `/api/price-feed` musi zwracać JSON z `version: 1` i listą cen.
Ta funkcja działa także bez bazy historii `VALUES_DB`.

## 2. Jednorazowe uruchomienie Discorda

Sam ZIP nie aktywuje usługi na Twoim koncie Cloudflare. Po wdrożeniu strony,
w tym samym folderze uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1
```

Wklej adres webhooka podany w rozmowie. Pole nie pokazuje wpisywanego
sekretu; po wklejeniu naciśnij Enter. Skrypt otworzy logowanie Cloudflare.
Jeżeli masz kilka kont, wybierz konto dla tej strony.

Skrypt automatycznie:

1. Sprawdza ceny z wdrożonej strony.
2. Pobiera oficjalny Wrangler przez `npx`.
3. Tworzy lub wykorzystuje bazę `pet-universe-price-monitor`.
4. Wdraża Worker o tej samej nazwie z bindingiem `MONITOR_DB` i cronem co minutę.
5. Zapisuje webhook jako sekret `DISCORD_WEBHOOK_URL` i klucz administracyjny
   jako sekret `MONITOR_KEY`; sekretów nie ma w kodzie przeglądarki ani GitHubie.
6. Próbuje od razu zapamiętać bieżące ceny. Przy pierwszym odczycie nie
   wysyła całej listy jako rzekomych zmian.

Nowy cron Cloudflare może potrzebować do 15 minut na aktywację.
Potem sprawdza ceny co minutę. Nie trzeba uruchamiać skryptu po każdej cenie.
Powiadomienie pojawia się po udanym wdrożeniu, gdy monitor zobaczy nową cenę.
Godzina w embedzie oznacza moment wykrycia opublikowanej zmiany;
nie jest godziną zapisania commita na GitHubie.

Worker ma osobną bazę monitora. Istniejąca baza `VALUES_DB` i historia strony
nie są resetowane. Prywatny plik z identyfikatorem bazy powstaje w
`.cloudflare/price-monitor.json`; nie wgrywaj go ręcznie do repozytorium.
Tymczasowy plik z webhookiem jest usuwany po konfiguracji.

## 3. Późniejsze zmiany cen

Edytuj tylko `Pet Sim Universe/public/data/prices.js` na GitHubie.
Zapisz commit i poczekaj na udane wdrożenie Cloudflare.

```js
// Zwykły pet:
"job-cat": 250,
// Warianty:
"imp": { "normal": 5, "golden": 25, "diamond": 115 },
// Dozwolone są też "30K", "O/C", null lub "No Price".
```

`30000`, `"30K"` i `"30k"` oznaczają tę samą wartość i nie wywołują
fałszywego powiadomienia. Zmiany O/C lub No Price również są obsługiwane.
Każdy zmieniony wariant dostaje własne powiadomienie i właściwą grafikę.
Nowy przedmiot zapamiętywany jest jako punkt początkowy, bez alertu o zmianie.

Cena jest wspólna dla listy, szczegółów, kalkulatora i monitora.
JS przeglądarki importuje `prices.js`, a funkcja serwerowa importuje ten sam
plik przy wdrożeniu. Monitor odczytuje działający endpoint, bez osobnej kopii cen.
Dane mają `no-store`; kod i WebP nadal używają cache z hashowanymi nazwami.
Nie edytuj ręcznie wygenerowanych plików `public/bundle`.

## Powiadomienia i diagnostyka

Baza D1 zapisuje zmianę ceny i kolejkę w jednej transakcji. Blokada chroni
przed równoczesnymi odczytami. Udane wiadomości nie są wysyłane ponownie
przy odświeżaniu strony. Błędy sieci, Discorda i limity 429 powodują ponowienie.
Duża aktualizacja jest wysyłana po maksymalnie 8 wiadomości na jeden odczyt;
pozostałe zmiany czekają w kolejce. Kolejka nie znika po restarcie Workera.

Przy zerwanym połączeniu już po przyjęciu wiadomości przez Discord możliwy
jest pojedynczy duplikat przy ponowieniu — Discord nie daje transakcji razem z D1.

Jeśli nic nie przychodzi, sprawdź w Workers & Pages Worker
`pet-universe-price-monitor`: cron, logi, binding `MONITOR_DB` i sekret
`DISCORD_WEBHOOK_URL`. Statystyki udanego odczytu pokazują `changed`, `sent`
i `pending`. `/health` potwierdza obecność konfiguracji bez ujawniania sekretów.
`POST /check` jest chroniony przez `MONITOR_KEY` i nie jest wywoływany z przeglądarki.

Jeśli po wdrożeniu strony zmienia się cena, ale endpoint ma stare dane,
sprawdź gałąź produkcyjną i to, czy `functions` oraz `server` trafiły do folderu
projektu obok `public`. Sprawdź też pomyślny status wdrożenia, a nie sam commit.

## Lokalnie i pliki źródłowe

```powershell
npm run dev
# http://127.0.0.1:4173
npm test
```

Podgląd lokalny obsługuje API cen i fallback historii bez D1; nie uruchamia
monitora Cloudflare ani Discorda. `npm test` sprawdza
monitor z prawdziwym SQLite i symulowanym HTTP — nie wysyła wiadomości na Discord.
Testy wymagają Node.js 22.13 lub nowszego. Strona nie wymaga instalowania bibliotek.

| Co zmieniasz | Plik |
| --- | --- |
| Wszystkie ceny | `public/data/prices.js` |
| Nazwy, rarity, grafiki, procenty | `public/data/catalog.js` |
| Działanie strony | `public/app.js` |
| Struktura strony | `src/index.html` |
| Badge i poprawki telefonu v89 | `public/v89.css` |
| JSON cen dla monitora | `functions/api/price-feed.js` |
| Porównanie cen i embedy | `server/pricing.js` |
| Cron, D1 i kolejka Discorda | `workers/price-monitor.js` |

Po zmianie kodu, HTML lub CSS użyj `npm run build`.
Zachowano usunięcie Exist i linków udostępniania kart/ofert.
W/L/FAIR nadal liczy różnicę z perspektywy My Offer, a O/C i ceny nieznane
mają widoczną informację i nie są doliczane do sumy liczbowej.

## Sprawdzenie tej paczki

Build, kompletność grafik i testy monitora są uruchamiane przed spakowaniem.
Nie wykonano w tym środowisku pełnego testu w przeglądarce ani wdrożenia
na Twoim koncie Cloudflare. Nie wysłano próbnej, sztucznej zmiany ceny.

Dokumentacja użytej integracji: [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Discord webhook](https://docs.discord.com/developers/resources/webhook).
