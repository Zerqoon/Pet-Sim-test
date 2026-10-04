# Pet Universe Values — jeden plik cen i poprawiony Discord

Cały projekt zawiera dokładnie przesłany `prices (7).js` pod nazwą
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
Strona odczytuje ceny co minutę i po powrocie do karty. Kalkulator zachowuje ofertę.

Data odpowiada faktycznej zmianie wartości: czasowi zapisu pliku albo commita.
Ponowny build, wizyta, rozpakowanie, komentarz czy ponowne przesłanie tych samych
cen nie zerują licznika. `prices (7).js` ma te same wartości co poprzedni załącznik,
więc zachowana data to **04 Oct 2026, 14:17:41 CEST**. Nieaktualna data z innej
wersji cen nie jest pokazywana.

## Zachowane elementy

Wszystkie grafiki, 35 petów, 16 charms, 4 jajka i 12 Items; Fishing / General
przy wyszukiwarce, Moon Chest, wyrównane jajka, wyśrodkowane nagłówki i układ Codes.
Kody: DroverQ, Russo, DarkRose, AG64, Cupcake, E11opoppet, Olopomidoro,
Ostrichh, 1mvisits, Update3, Smidl155.

Szczegóły konfiguracji i diagnostyki: `README-CLOUDFLARE.md`.
