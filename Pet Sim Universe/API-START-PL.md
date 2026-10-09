# API Pet Universe — strona z przesłanego ZIP-a

Do Twojej strony dodano API odczytu wartości. Karty, grafiki, katalog, ceny,
timestamp oraz kod panelu admina zachowano z przesłanej paczki.
Ta paczka nie wprowadza wyglądu v130. Na Home dodano osobny licznik aktywnych
odwiedzających; instrukcja podłączenia bazy: **LIVE-COUNTER-START-PL.md**.
Cena ma jedno edytowalne źródło:
`public/data/prices.js`. JSON API jest generowany automatycznie.

## Wdrożenie strony

1. Rozpakuj paczkę do osobnego folderu i otwórz znajdujący się w niej
   **Pet Sim Universe**.
2. Otwórz PowerShell w tym folderze i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1 -UseRemotePrices
```

Skrypt korzysta z dotychczasowego repozytorium i zachowuje aktualne ceny, katalog
oraz grafiki z GitHuba. Poczekaj na ukończenie wdrożenia Cloudflare Pages.
Ustawienia Pages pozostają: root `Pet Sim Universe`, build `npm run build`,
output `public`. Prywatna konfiguracja pozostaje na Twoim komputerze.

Otwórz następnie:

```text
https://petuniverse-values.pl/api/v1/values.json
```

Prawidłowa odpowiedź to JSON z `ok: true` i `apiVersion: 1`.
Ten adres działa również przy wyłączonych Pages Functions. Aktualizuje się
podczas każdego builda, także po publikacji cen lub nowej karty przez admina.

## Adresy API

| Adres | Wynik |
| --- | --- |
| `/api/v1/values` | Aktualnie opublikowany katalog i wszystkie warianty cen |
| `/api/v1/values?category=pets` | Tylko pety; kategorie: pets, charms, eggs, items |
| `/api/v1/values?q=gummy` | Warianty kart pasujących do wyszukiwania |
| `/api/v1/value?name=Gummy%20Bear` | Jedna dokładnie dopasowana karta, domyślnie Normal |
| `/api/v1/value?id=sunken-eel&variant=golden&category=pets` | Konkretny wariant i jego grafika |
| `/api/v1/search?q=gummy&category=pets` | Do 25 dopasowań do podpowiedzi nazw |
| `/api/v1/values.json` | Automatycznie wygenerowany statyczny katalog dla bota |

Adresy bez `.json` korzystają z Pages Functions i czytają aktualne opublikowane
pliki danych przy żądaniu. Nie wymagają bazy D1 ani dodatkowego sekretu. API jest
publiczne i obsługuje GET, HEAD oraz OPTIONS. Odczyt nie zapisuje cen ani historii.
Reguła `_routes.json` omija statyczny JSON przy wywoływaniu Functions.

Wyszukiwanie jednej karty przyjmuje dokładną nazwę lub ID. Wielkość liter i
interpunkcja nazwy nie mają znaczenia. W razie kilku pasujących nazw API zwraca
409 i wymaga wyboru kategorii/ID. Skrócona nazwa zwraca 404 z podpowiedziami.
Brak wariantu daje 422; nieprawidłowe dane żądania 400; chwilowo niedostępne lub
niespójne opublikowane źródła 503. Żądania zapisu dostają 405.

## Dane ceny

Każdy element ma `id`, `name`, `category`, `rarity`, `variant`, `image`, `value`,
`display`, `priceStatus`, dane źródła i opcjonalny badge eventu. W katalogu image
jest ścieżką od korzenia strony. Odpowiedź pojedynczej karty podaje pełny URL.

| Stan | value | display | priceStatus |
| --- | --- | --- | --- |
| Cena 16.5K | 16500 | 16.5K | priced |
| Cena zero | 0 | 0 | priced |
| Owner choice | null | O/C | owner_choice |
| Brak ceny | null | Not Price | unpriced |

`updatedAt` oznacza czas aktualizacji całej listy wartości, a nie czas wykonania
zapytania ani wymyśloną datę zmiany konkretnego peta. Jeśli nie ma metadanych
zgodnych z rewizją cen, jest `null`. `revision` identyfikuje znormalizowane ceny.
Nowe i usunięte karty są odczytywane z katalogu.

## Bot Discord

W drugiej paczce jest Twój istniejący bot z dodaną publiczną komendą:

```text
/value name:Gummy Bear
/value name:Sunken Eel variant:Golden
/value name:1M Lucky Block category:Items
```

Bot domyślnie korzysta z `https://petuniverse-values.pl`. Przy innej domenie ustaw
`VALUE_SITE_URL` w Railway Variables albo lokalnym `.env`. Wpisz adres główny,
bez ścieżki API. Instrukcja bota: **VALUE-START-PL.md** w jego paczce.

Zmiany są widoczne po ukończeniu wdrożenia Cloudflare. Komenda pobiera aktualny
katalog przed pokazaniem ceny. Podpowiedzi nazw używają pamięci podręcznej 30 s.
Gdy Functions nie są dostępne, bot korzysta ze statycznego JSON-a z ostatniego
udanego builda. Błąd API nie jest zastępowany nieoznaczoną starą ceną.

## Kontrola

Testy obejmują 146 dotychczasowych scenariuszy oraz nowe scenariusze licznika,
w tym współdzielenie ID między kartami i wygasanie sesji. Pięć testów ze starej
paczki miało nieaktualne założenia o cenie 18K i wybranej grafice; dopasowano ich
dane testowe do aktualnego katalogu, zachowując kod strony i admina.
`npm run build` generuje stronę i gotowy JSON. Lokalnie: `npm run dev`.
Sprawdzono też połączenie rzeczywistego lokalnego HTTP API z modułami Twojego bota.
Testy nie publikują strony ani nie wysyłają wiadomości na Discord.

Dokumentacja dostawców: [Cloudflare Pages routing](https://developers.cloudflare.com/pages/functions/routing/)
i [Discord slash-command autocomplete](https://discordjs.guide/legacy/slash-commands/autocomplete).
