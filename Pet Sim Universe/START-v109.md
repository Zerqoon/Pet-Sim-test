# Pet Universe v109 — renowacja Value List

Cały projekt bazuje na v108. Ta wersja pokazuje proponowane odświeżenie siatki Pets, kart, filtrów, nawigacji i okna szczegółów.

- Na ekranach od 2500 px Exclusive ma maksymalnie osiem kart w rzędzie. Obecne 16 petów układa się w 8 × 2. Stat Pets ma maksymalnie pięć kart w rzędzie, czyli obecnie 5 × 2. Przy mniejszych szerokościach liczba kolumn maleje, a niepełne rzędy są wyśrodkowane.
- Panel kolekcji mieści karty bez ogromnego pustego końca. Po wyszukaniu jednego peta panel zwęża się, a filtry zachowują szerokość potrzebną do obsługi.
- Desktopowe karty mają uporządkowany obrazek, nazwę i cenę, stałą wysokość 300 px oraz cienkie animowane obramówki. Ciemne grafiki mają delikatną poświatę za obrazkiem. Pliki grafik nie zostały zmienione.
- Kategorie są bliżej logo, Stop Animations znajduje się bezpośrednio pod nimi, a aktywna kategoria ma fioletowo-niebieskie podświetlenie.
- Home ma stałe miejsce w rogu nagłówka. Wyszukiwanie, sortowanie i warianty tworzą równy, ograniczony szerokością pasek.
- O/C ma krótki blok Owner’s Choice. Nie pobiera historii liczbowej. Brak ceny jest osobnym stanem Not priced. Cena liczbowa nadal pokazuje historię i jej zmianę.
- Powtarzające się opisy źródła i notatki eventowe są ukrywane w szczegółach. Źródło wykorzystuje całą szerokość, a data historii pochodzi z rzeczywistych zapisów; bez zapisów widnieje No snapshots yet.

Wspólne tło, font Nunito, gradientowe napisy badge, katalog i ceny pochodzą z v108. Kompaktowe Items i lista Codes są nadal częścią projektu. Kalkulator i serwerowy monitor cen również pozostają w projekcie.

Nowe style: public/renovation.css. Szablon: src/index.html. Logika interfejsu: public/app.js. Po zmianach wykonaj npm run build.

Wysyłanie całego folderu: uruchom Upload-GitHub.ps1. Skrypt domyślnie zachowuje public/data/prices.js z GitHuba. Parametr -UseLocalPrices pozwala wysłać lokalne ceny.

Powrót do poprzedniego wyglądu: rozpakuj cały ZIP v108 i uruchom znajdujący się w nim Upload-GitHub.ps1. Domyślne zachowanie cen z GitHuba dotyczy obu wersji.

Układ i obsługa są sprawdzane w Chromium przy szerokościach od 320 do 3440 px. Historia w lokalnym sprawdzeniu korzysta z kontrolowanych odpowiedzi testowych; wdrożenie nadal używa własnego API Cloudflare.
