# Pet Universe Values v85 — aktualne ceny z GitHuba

Cały projekt jest gotowy do wgrania. Zachowano układ v78, oba motywy,
grafiki, efekty szkła, wszystkie kategorie, warianty, animowanego Pop Cata,
okna szczegółów, kalkulator i funkcje Cloudflare D1.

Badge „1M Event” ma jasny niebieski gradient z czytelnym granatowym tekstem
na karcie i w szczegółach. Ruby Nebula Star ma 100% Best Pet oraz wartość O/C,
również w kalkulatorze. Pozostałe dane katalogu i backend zachowano.
Poprawiono też kontrast tekstu szczegółów w jasnym motywie i pozycję
mobilnych przycisków motywu oraz animacji, żeby nie zasłaniały kart.

## Zmiana cen bezpośrednio na GitHubie

Edytuj `Pet Sim Universe/public/data/prices.js`, zapisz commit na gałęzi
produkcyjnej i poczekaj na udane wdrożenie Cloudflare. Po zwykłym odświeżeniu
strony nowe ceny pojawią się na kartach, w szczegółach i w kalkulatorze.
Nie trzeba lokalnie przebudowywać projektu po zmianie samych cen.

Katalog jest teraz osobnym modułem, pobieranym przy otwarciu strony z regułą
`Cache-Control: no-store`. Plik JS z kodem strony nie zawiera kopii cen.
Ta sama paczka JS działa z nowym katalogiem, także gdy Cloudflare pomija build.
Kod, style i zoptymalizowane obrazy nadal korzystają z długiego cache.
Istniejąca otwarta karta pobierze nowe dane po jej odświeżeniu.

- Pety bez wariantów, charms, eggs i items: wartość przy identyfikatorze, np. `2500`, `'2.5K'`
  lub `'O/C'`.
- Pety z wariantami: `normal`, `golden`, `diamond`.
- Skrócony zapis RICH BEE jest
  obliczany z bieżącej ceny, więc wystarczy zmienić samą wartość.

## Uruchomienie lokalne

Potrzebny jest Node.js 22 lub nowszy. Nie trzeba instalować bibliotek.

```powershell
npm run dev
```

Otwórz `http://127.0.0.1:4173`.
Historia cen wymaga Cloudflare D1; lokalnie działa jej istniejący fallback.

## Cloudflare Pages / GitHub

Wgraj całą zawartość ZIP-a do katalogu projektu w repozytorium.

- Root directory: `Pet Sim Universe`, jeżeli tak nazywa się folder w repozytorium;
  dla plików w głównym katalogu repozytorium zostaw to pole puste.
- Build command: `npm run build`
- Build output directory: `public`
- D1 binding: `VALUES_DB` — tak samo jak dotychczas.

Folder `functions` musi pozostać w katalogu projektu, obok `public`.
Przy ręcznym wgrywaniu statycznej strony pliki w `public` są już zbudowane.
Istniejące endpointy `/api/health`, `/api/history` i `/api/snapshot`
oraz `schema.sql` pozostają w projekcie.

## Edycja cen i wyglądu

- Ceny: `public/data/prices.js`.
- Pety, opisy, procenty i grafiki: `public/data/catalog.js`.
- Kod działania: `public/app.js`.
- Struktura HTML: `src/index.html`.
- Wygląd: zachowane arkusze CSS w `public`, w dotychczasowej kolejności.
  Poprawki płynności są w `public/v82.css`.
  Poprawki kontrastu i mobilnych przycisków są w `public/v83.css`.

Nowe obrazki PNG można dodawać do `public/assets` i wskazywać w katalogu.
Jeśli zmienisz oryginalny PNG, build od razu użyje nowej grafiki i nowego
adresu pliku, zamiast starej kopii WebP.

Po zmianie kodu, CSS, HTML lub oryginalnych grafik uruchom `npm run build`.
Build waliduje dane i grafiki, a następnie tworzy jeden arkusz CSS i paczkę JS
z kodem oraz mapą obrazów. Katalog pozostaje osobnym plikiem źródłowym.
Nie edytuj plików w `public/bundle` ręcznie — powstają z plików źródłowych.
Do zmiany samych cen wystarcza edycja `public/data/prices.js` i wdrożenie.

Zmiana kodu tworzy nową nazwę pliku JS; zmiana wyglądu tworzy nową nazwę CSS.
Ceny mają stały adres `data/prices.js` i są pobierane bez przechowywania
w cache przeglądarki. Dołączone `_headers` nadal pozwala buforować kod i grafiki
długo, ale każe przeglądarce sprawdzać aktualny HTML. Po nowym deployu
wystarcza zwykłe odświeżenie; Ctrl+Shift+R nie jest wymagane.

## Co poprawiono

- 35 osobnych arkuszy strony zastąpiono jednym żądaniem, zachowując
  kolejność wszystkich reguł CSS; źródła nadal są w ZIP-ie.
- Grafiki mają bezstratne kopie WebP. Oryginalne PNG nadal są dostępne,
  a grafiki petów są wyświetlane w pełnej rozdzielczości źródłowej.
- Małe ikonki dostają dopasowane do rozmiaru i DPR wersje zamiast obrazów
  1254×1254. Obrazki nie są generowane ani przerabiane artystycznie.
- Wyszukiwanie i sortowanie ponownie wykorzystują istniejące karty,
  zachowując ich grafiki, zamiast przebudowywać całą listę.
- Ruch myszy korzysta z jednego listenera i jednej aktualizacji na klatkę,
  z zapamiętanymi wymiarami karty.
- Usunięto wymuszanie layoutu przez odczyty `offsetWidth` podczas animacji.
- Niewidoczna w końcowym wyglądzie animacja zmiennej obramowania została
  zastąpiona delikatnym światłem na osobnej obracanej warstwie.
- Ciągłe animacje poza ekranem są pauzowane; cała lista pozostaje w DOM.
  Nie ma wirtualizacji, `content-visibility`, obcinania kart ani usuwania
  efektów szkła. Pauza animacji i ograniczony ruch nadal działają.
- Zmiana liczby ticketów nie przebudowuje obu ofert kalkulatora.
- Zapisany motyw jest odczytywany przed pierwszym rysowaniem strony.

Przeglądarka synchronizuje animacje z odświeżaniem ekranu. Strona nie narzuca
limitu 60 FPS ani dodatkowej pętli 240 FPS. Wynik na konkretnym komputerze
zależy od przeglądarki, GPU, ustawień zasilania i odświeżania monitora.
