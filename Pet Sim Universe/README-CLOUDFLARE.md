# Pet Universe Values — Cloudflare setup

Projekt jest przygotowany pod **Cloudflare Pages + GitHub + D1**.

## 1. Wrzuć całe repozytorium na GitHub

Nie wrzucaj tylko folderu `public`. W repo muszą zostać również:

- `public/` — strona,
- `functions/` — API historii wartości.

## 2. Podepnij repo do Cloudflare Pages

W Cloudflare wybierz **Workers & Pages → Create → Pages → Connect to Git** i wybierz repozytorium.

Ustawienia buildu:

- Framework preset: `None`
- Build command: **puste**
- Build output directory: `public`

## 3. Utwórz bazę D1

W Cloudflare utwórz bazę D1, np.:

`pet-universe-values`

Nie musisz ręcznie tworzyć tabeli — API tworzy `value_history` i indeks przy pierwszym użyciu.

## 4. Podepnij D1 do Pages

W projekcie Pages przejdź do **Settings → Bindings → Add → D1 database**.

Najważniejsze: nazwa bindingu musi być dokładnie:

`VALUES_DB`

Wybierz utworzoną bazę D1 i zrób nowy deploy.

## 5. Jak działa historia

- przy wejściu na stronę frontend wywołuje `/api/snapshot`,
- aktualne wartości z `public/data/catalog.js` zapisują się do D1,
- niezmieniona wartość nie jest zapisywana częściej niż raz na 30 minut,
- zmiana wartości jest zapisywana od razu przy następnym snapshotcie,
- po kliknięciu itemu/peta `/api/history` pobiera historię dla wybranego zakresu,
- wykres ma zakresy `1H`, `6H`, `24H`, `7D`, `30D`, `ALL`,
- modal pokazuje `Current`, `% Change`, zmianę liczbową, `High` i `Low`.

Jeżeli D1 nie jest jeszcze podpięte, strona nadal działa. Wykres pokaże aktualny punkt i informację `D1 not connected`, zamiast wymyślać sztuczną historię.

## Zmiana value

Wartości nadal edytujesz w:

`public/data/catalog.js`

Po pushu GitHub → Cloudflare robi nowy deploy. Następne wejście na stronę zapisze nową wartość i wykres pokaże wzrost/spadek względem wcześniejszych snapshotów.
