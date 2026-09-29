# Pet Universe Values v82 — płynność z wyglądem v78

Cały projekt jest gotowy do wgrania. Zachowano układ v78, oba motywy,
grafiki, efekty szkła, wszystkie kategorie, warianty, animowanego Pop Cata,
okna szczegółów, kalkulator i funkcje Cloudflare D1. Dane katalogu i backend
są takie same jak w załączonym projekcie.

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

- Ceny, pety, opisy i warianty: `public/data/catalog.js`.
- Kod działania: `public/app.js`.
- Struktura HTML: `src/index.html`.
- Wygląd: zachowane arkusze CSS w `public`, w dotychczasowej kolejności.
  Poprawki płynności są w `public/v82.css`.

Nowe obrazki PNG można dodawać do `public/assets` i wskazywać w katalogu.
Jeśli zmienisz oryginalny PNG, build od razu użyje nowej grafiki i nowego
adresu pliku, zamiast starej kopii WebP.

Po edycji uruchom `npm run build`. Build waliduje dane i grafiki, a następnie
tworzy jeden arkusz CSS i jeden moduł JS. Nie edytuj plików w `public/bundle`
ręcznie — powstają z powyższych plików źródłowych.

Każda zmiana cen lub kodu tworzy nową nazwę pliku JS; zmiana wyglądu tworzy
nową nazwę CSS. Dołączone `_headers` pozwala buforować te pliki długo, ale
każe przeglądarce sprawdzać aktualny HTML. Po nowym deployu przeglądarka
pobiera nową wersję bez konieczności Ctrl+Shift+R.

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
