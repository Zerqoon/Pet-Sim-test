# Pet Universe Values — jeden plik cen i poprawiony Discord

Cały projekt zawiera dokładnie przesłany `prices (8).js` pod nazwą
`public/data/prices.js`. To jedyny plik, w którym zmieniasz ceny.
Strona i monitor czytają go bezpośrednio. Kopia cen i dodatkowy feed zostały usunięte.

## Wgranie do Twojego projektu

Skopiuj zawartość folderu `Pet Sim Universe` z ZIP-a do swojego folderu:
`C:\Users\zerqo\Desktop\Pet Sim Universe`. Zastąp pliki projektu,
a prywatny folder `.cloudflare` z poprzedniego setupu zachowaj.

Otwórz PowerShell i uruchom:

```powershell
Set-Location "C:\Users\zerqo\Desktop\Pet Sim Universe"
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Skrypt wgrywa cały projekt do `Zerqoon/Pet-Sim-test`, wykonuje build i używa
cen z tej paczki. Jeśli zachowałeś `.cloudflare/price-monitor.json`, następnie
czeka na opublikowane ceny, naprawia Workera i wysyła wiadomość testową na Discord.
Wszystko wykonujesz jednym poleceniem z folderu projektu, a nie z `System32`.

Cloudflare Pages: root `Pet Sim Universe`, build `npm run build`, output `public`.

## Co poprawiono w błędzie 401

Setup usuwa stary klucz z jawnych zmiennych, zapisuje nowy klucz jako sekret,
sprawdza obecność sekretu webhooka i czeka na potwierdzenie nowej wersji Workera.
Dopiero po poprawnej autoryzacji wykonuje test Discorda. Zachowuje istniejącą
bazę D1, zapisane ceny i kolejkę powiadomień.

Naprawę możesz też uruchomić osobno:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1
```

Jeżeli konfigurację zostawiłeś w innym folderze, wskaż go przez
`-ProjectPath "C:\Twoj-poprzedni-folder\Pet Sim Universe"`.
Bez zapisanej konfiguracji albo aby ustawić inny webhook uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1
```

Po sukcesie kanał dostanie `Pet Universe — test monitora`. Skrypt zgłasza sukces
po potwierdzeniu Discorda. Rzeczywiste zmiany cen mają miniaturę, starą i nową cenę
oraz czas aktualizacji. Cron sprawdza je co minutę, również gdy strona jest zamknięta.
Przy pierwszym uruchomieniu pustej bazy zapisuje ceny początkowe; przy naprawie
istniejącej bazy porównuje je z jej zachowanym stanem.

## Kolejne zmiany cen

Edytujesz tylko `public/data/prices.js`, zapisujesz go i uruchamiasz
`Upload-GitHub.ps1` albo zapisujesz zmianę na GitHubie z włączonym buildem Pages.
Nie zmieniasz żadnego drugiego pliku cen ani konfiguracji webhooka.

Build automatycznie zapisuje samą datę i identyfikator wartości w
`price-updates.js`. Ten plik nie zawiera cen i nie wymaga ręcznej edycji.
Panel `VALUES UPDATED` pod `Stop Animations` pokazuje dokładną datę do sekund
w strefie `Europe/Warsaw` oraz aktualizowany licznik `… ago`.
Strona odczytuje ceny co 30 sekund i po powrocie do karty. Kalkulator zachowuje ofertę.

Data jest powiązana z SHA-256 wartości. Build zapisuje czas zmiany pliku lub
commita; ponowny build, wizyty i równoważne zapisy cen nie zerują licznika.
W tej paczce jest **25 zmienionych wycen** z `prices (8).js`. Znacznik
**04 Oct 2026, 15:55:37 CEST** to czas otrzymania załącznika; plik nie udostępnia
oryginalnej godziny edycji na Twoim komputerze.

Gdy publikacja pominie wygenerowaną metrykę, monitor zapisuje w D1 pierwszy
czas wykrycia zmiany. Panel pokazuje wtedy **CHANGE DETECTED**. Ten czas pozostaje
stały po odświeżeniu. To czas wykrycia, a nie odtworzona godzina edycji.
Późniejsza poprawna metryka tej samej wersji ma pierwszeństwo.

## Co zabezpieczono w v116

- Jeden wspólny parser dla builda, strony, historii i monitora. Nie wykonuje
  kodu z `prices.js`; odrzuca powtórzone ID, brakujące warianty, nieznane itemy,
  niepoprawne liczby, zbyt duże odpowiedzi i uszkodzone dane.
- Błędny build przerywa upload. Poprawne metryki są zapisywane atomowo.
- Strona zachowuje ostatni pełny, zweryfikowany zestaw cen podczas awarii.
  Przeglądarka może odzyskać swoją zapisaną kopię; panel oznacza ją SAVED VALUES.
  Ta pamięć nie jest drugim plikiem do edytowania.
- Ułamki `0,4` i `22,5K` są obsługiwane; `30,000` nadal oznacza trzydzieści tysięcy.
- Discord otrzymuje do 8 osobnych embedów w jednej wiadomości. 25 zmian mieści
  się w 4 wiadomościach podczas jednego sprawdzenia, o ile Discord je przyjmuje.
- Kolejka przetrwa awarię. Monitor przestrzega rzeczywistego `retry_after` i
  nagłówków limitu. Błędy 401/403/404 zatrzymują próby do skutecznej naprawy.
  Udany test naprawy od razu podejmuje kolejkę, zamiast czekać na kolejny cron.
- Historia zapisuje wszystkie 76 liczbowych wycen jednym insertem i pomija
  niezmienione ceny. Cały monitor mieści się w limicie zapytań D1 sprawdzonym testami.

Build oraz **44 testy automatyczne** przeszły. Testy używają prawdziwego SQLite,
a odpowiedzi Discorda są symulowane. Test na Twoim kanale wykonuje Upload lub
Upgrade i potwierdza sukces dopiero po odpowiedzi Discorda.

## Zachowane elementy

Wszystkie grafiki, 35 petów, 16 charms, 4 jajka i 12 Items; Fishing / General
przy wyszukiwarce, Moon Chest, wyrównane jajka, wyśrodkowane nagłówki i układ Codes.
Kody: DroverQ, Russo, DarkRose, AG64, Cupcake, E11opoppet, Olopomidoro,
Ostrichh, 1mvisits, Update3, Smidl155.

Szczegóły konfiguracji i diagnostyki: `README-CLOUDFLARE.md`.
