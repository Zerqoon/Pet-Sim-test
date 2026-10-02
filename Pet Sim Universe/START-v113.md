# Pet Universe v113 — Gummy Collection

Cały projekt na bazie v112. Układ strony, kalkulator, animacje i tło pozostają takie jak w v112.

## Nowe pozycje

| Pozycja | Rarity | Best Pet | Wartość |
| --- | --- | --- | --- |
| Gummy Bear | Exclusive | 100% | O/C |
| Gummy Gubby | Exclusive | 75% | Do ustalenia |
| Gummy Penguin | Exclusive | 65% | Do ustalenia |
| Gummy Capybara | Exclusive | 50% | Do ustalenia |
| Gummy Frog | Exclusive | 40% | Do ustalenia |
| Gummy Egg | Exclusive | — | Do ustalenia |
| Sunken Eel | Mythical | — | Normal / Golden / Diamond: do ustalenia |
| Blobfish | Mythical | — | Normal / Golden / Diamond: do ustalenia |

## Ceny i grafiki

Zachowano wszystkie istniejące wartości z `prices (2).js`, w tym Galaxy Egg 170 i 1M Lucky Block 10. Dopisano komplet nowych identyfikatorów w `public/data/prices.js`; `null` oznacza niewycenioną pozycję. Wpisz liczbę, tekst w formacie K/M lub `O/C` tam, gdzie chcesz zmienić cenę.

Wszystkie 12 przesłanych PNG zachowano bez zmian. Strona używa również bezstratnych WebP do szybszego ładowania. Warianty Mythical mają własne grafiki i ceny na liście, w szczegółach, w kalkulatorze oraz w feedzie monitora Discord.

## Wysyłanie

Postępuj zgodnie z `START-TUTAJ.md`; w tej aktualizacji użyj `-UseLocalPrices`, żeby wysłać dopisane ceny. Zachowano dotychczasową strukturę folderu i integrację Cloudflare.

## Sprawdzenie paczki

Build i walidacja danych przeszły. Wszystkie 13 testów monitora/API przeszło. Sprawdzono nowe grafiki, procenty, O/C, warianty na liście i w szczegółach, dodawanie do ofert, sortowanie O/C oraz nowe jajko przy szerokościach 320, 390, 1280 i 3440 px. Nie wykryto błędów JavaScript ani poziomego przewijania. Dodatkowy test potwierdził, że wpisanie cen wariantów aktualizuje listę i sumy kalkulatora; próbne wartości istniały tylko w teście i nie zostały wpisane do Twojego pliku.
