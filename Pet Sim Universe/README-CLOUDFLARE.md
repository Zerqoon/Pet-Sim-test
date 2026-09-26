# Pet Universe Values v35 — Cloudflare Pages + D1

Ta wersja jest gotowa pod repo GitHub, w którym projekt znajduje się w folderze `Pet Sim Universe`.

## Cloudflare Pages — Build configuration

Ustaw dokładnie:

- Framework preset: `None`
- Root directory: `Pet Sim Universe`
- Build command: `npm run build`
- Build output directory: `public`

`npm run build` nie przebudowuje frontendu — sprawdza składnię i dane w `catalog.js`, żeby literówka nie rozwaliła Functions bez czytelnego komunikatu.

## D1

1. Cloudflare → Storage & Databases → D1 SQL Database → Create database.
2. Nazwa może być np. `pet-universe-values`.
3. Pages → `pet-sim-test` → Settings → Bindings → Add → D1 database.
4. Variable name MUSI być dokładnie: `VALUES_DB`.
5. Wybierz utworzoną bazę i zapisz.
6. Zrób nowy deploy.

Tabela `value_history` tworzy się automatycznie. Plik `schema.sql` jest dołączony tylko jako kopia schematu / opcja ręcznego utworzenia.

## Jak działa historia wartości

- `public/data/catalog.js` jest źródłem aktualnej wartości.
- Po wejściu na stronę frontend automatycznie robi `POST /api/snapshot`.
- Snapshot API zapisuje punkt do D1 tylko wtedy, gdy wartość zmieniła się względem ostatniego zapisu.
- Po kliknięciu itemu `GET /api/history` pobiera historię dla wybranego zakresu i wariantu.
- `null` nie jest traktowany jako `0`. Item bez ceny pokazuje `—` / `Value not set`.
- Warianty `normal`, `golden`, `diamond` mają osobne historie.

Przykład:

1. `Void Owl` ma `value: 500` → deploy → wejście na stronę → D1 zapisuje 500.
2. Zmieniasz na `value: 650` → deploy → wejście na stronę → D1 zapisuje 650.
3. Modal pokaże linię 500 → 650 oraz około `+30%`.

## Szybka diagnostyka

Po deployu otwórz:

`https://TWOJA-DOMENA.pages.dev/api/health`

Prawidłowa odpowiedź powinna zawierać:

```json
{
  "ok": true,
  "database": "connected",
  "binding": "VALUES_DB"
}
```

Snapshot możesz też uruchomić ręcznie z konsoli przeglądarki:

```js
fetch('/api/snapshot', { method: 'POST' }).then(r => r.json()).then(console.log)
```

## Kolory rarity v35

W `public/v35.css` są użyte dokładnie przekazane sekwencje:

- Exclusive: `#930fff #feddff #930fff #de22ff #9823ff #edc2ff #930fff`
- Mythical: `#ff00ae #ff0097 #ff7dd2 #ff0f3b #ffcfb9 #ff8e0c #ffce78 #fafbdd #f6fcb7 #fff582`
- Secret: `#ffffff #c1c1c1 #747474 #b1b1b1 #ffffff #6f6f6f #f1f1f1 #a7a7a7`

Palety są używane na kartach, badge'ach, obramowaniu modala i linii wykresu.
