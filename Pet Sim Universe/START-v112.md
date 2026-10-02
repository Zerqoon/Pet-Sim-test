# Pet Universe v112 — 1M Lucky Block

Wydanie na bazie pełnego projektu v111 z kalkulatorem, wariantami Pets i sortowaniem O/C → ceny malejąco.

## Dodany przedmiot

- Kategoria: Items.
- Nazwa: 1M Lucky Block.
- Rarity: Legendary.
- Tag: 1M EVENT, w tym samym niebieskim stylu co inne przedmioty z wydarzenia.
- Grafika: przesłany PNG z przezroczystością, zachowany bez zmian w `public/assets/items/1m-lucky-block.png`. Do ładowania strony służy również bezstratny WebP.
- Przedmiot jest dostępny na liście Items, w szczegółach i w kalkulatorze.

## Twoje ceny

`public/data/prices.js` jest identyczny z przesłanym `prices (1).js`. Zachowano wszystkie liczby, teksty, O/C i wpisy ???. Obsługa niewycenionych danych akceptuje teraz także ???, dzięki czemu walidacja i feed cen nie odrzucają tych wpisów.

W przesłanym pliku nie ma ceny Lucky Blocka, dlatego widnieje Not priced. Aby ją ustawić, dopisz w sekcji `items` pliku `public/data/prices.js` klucz:

```js
"1m-lucky-block": null,
```

Zamiast `null` wpisz swoją cenę jako liczbę lub tekst, np. w używanym przez Ciebie formacie K. Aktualizowanie cen działa tak jak dla innych przedmiotów.

## Wysłanie na GitHub

Komenda z `START-TUTAJ.md` zawiera `-UseLocalPrices`, aby wysłać ceny z Twojego załącznika. Pełny projekt znajduje się w folderze `Pet Sim Universe`. Root Cloudflare: `Pet Sim Universe`; build: `npm run build`; output: `public`.

Podglądy nowego przedmiotu są w folderze `preview`.

## Sprawdzenie

Build i walidacja katalogu przechodzą poprawnie: 26 Pets, 13 Charms, 3 Eggs, 7 Items i 6 Codes. Wszystkie 13 istniejących testów monitora cen przechodzi. Feed cen akceptuje cały przesłany zestaw, w tym ???.

W Chromium sprawdzono szerokości 320, 390, 1280 i 3440 px: grafikę i tag na karcie Items, szczegóły przedmiotu, obecność w kalkulatorze, wyszukiwanie oraz dodanie do oferty. Przeglądarka wyświetla ceny z załącznika. Nowy przedmiot jest na końcu sortowania cen, dopóki nie ma wyceny. Nie było błędów JavaScript ani poziomego przewijania; badge oraz cena mieszczą się na karcie.

Porównanie plików potwierdziło, że ceny i oryginalny PNG są identyczne z załącznikami. Układ, fonty i logika aplikacji z v111 pozostają zachowane.
