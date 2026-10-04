# Pet Universe Values — nowe ceny, data i Discord

Cała paczka zawiera dokładnie Twój przesłany `prices (6).js` jako
`public/data/prices.js`. Nic nie trzeba ręcznie przepisywać.

## Wgranie projektu

Rozpakuj ZIP. Otwórz PowerShell w folderze `Pet Sim Universe` i uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Skrypt wysyła cały projekt do `Zerqoon/Pet-Sim-test`, przebudowuje stronę
i domyślnie używa cen z tej paczki. `-UseRemotePrices` to opcjonalny, jawny
wybór cen z GitHuba. Cloudflare Pages: root `Pet Sim Universe`, build
`npm run build`, output `public`. Poczekaj na udane wdrożenie.

## Naprawa Discorda

Jeśli zachowałeś swój prywatny folder `.cloudflare` w tym folderze,
`Upload-GitHub.ps1` automatycznie wdroży nowy monitor i wykona test Discorda.
Możesz też uruchomić go osobno:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1
```

Jeśli konfiguracja została w poprzednim projekcie, podaj jego folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1 -ProjectPath "C:\Twoj-poprzedni-folder\Pet Sim Universe"
```

Bez zapisanej konfiguracji uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1
```

Setup poprosi o aktualny adres webhooka i logowanie Cloudflare. Wykorzystuje
istniejącą bazę monitora o tej samej nazwie. Upgrade zachowuje istniejącą bazę
oraz zdalny sekret webhooka. Wdraża kod z NOWEJ paczki, czeka na jej ceny na
stronie i sprawdza odpowiedź Discorda. Po sukcesie na kanale pojawi się
`Pet Universe — test monitora`. Błąd konfiguracji, webhooka lub wdrożenia
przerywa skrypt z opisem przyczyny.

Sam upload strony nie aktualizuje osobnego Workera. Dlatego przy tej
naprawie potrzebne jest również wykonanie Setup/Upgrade lub automatycznego
testu z Upload. Następne ceny monitor sprawdza co minutę, bez otwierania strony.

## Data aktualizacji cen

Duży panel `VALUES UPDATED` pozostaje pod `Stop Animations`. Pokazuje czas
`… ago` i dokładną datę do sekund w strefie `Europe/Warsaw`. Ta paczka zapisuje
moment otrzymania Twojego nowego pliku: **04 Oct 2026, 14:17:41 CEST**.
Nie jest to deklaracja, kiedy pierwotnie edytowałeś go na swoim komputerze.

Data jest związana z konkretnymi wartościami. Po zmianie cen build zapisuje
czas commita, a przy lokalnej edycji — zapisania pliku. Build bez zmiany cen,
rozpakowanie ZIP-a, otwieranie strony i równoważne zapisy `30000` / `"30K"`
nie zerują licznika. Nieaktualna data dla innych cen nie jest wyświetlana.
Strona pobiera świeże ceny i datę co minutę oraz po powrocie do karty.
Licznik odświeża się co sekundę; nie zaokrągla godzin w górę.
Otwarte oferty w kalkulatorze pozostają zachowane przy aktualizacji.

Edytuj wyłącznie `public/data/prices.js`. Zostaw build `npm run build` na
Cloudflare. Bez buildu nie powstanie nowy zapis daty ani statyczny feed monitora.

## Zachowane funkcje

Zachowano wszystkie grafiki, 35 petów, 16 charms, 4 jajka i 12 Items,
Fishing / General przy wyszukiwarce, Moon Chest, wyrównane jajka,
wyśrodkowane nagłówki i układ Codes. Kody to wyłącznie:
DroverQ, Russo, DarkRose, AG64, Cupcake, E11opoppet, Olopomidoro,
Ostrichh, 1mvisits, Update3, Smidl155.

Szczegóły: `README-CLOUDFLARE.md`. Starsze `START-v*.md` opisują poprzednie wersje.
