# Pet Universe v106

- Nowy mobilny układ Value List: krótka nawigacja Pets / Charms / Eggs / Items / Codes, kompaktowy nagłówek i Stop Animations pod kategoriami.
- Wyszukiwanie obok sortowania; warianty w oddzielnym, pełnym rzędzie. Pole wyszukiwania ma font 16 px, aby iPhone nie powiększał widoku podczas wpisywania.
- Dwie równe kolumny kart w szerokościach 360–599 CSS px. Karty petów mają wysokość 254 px; innych itemów 222 px. Poniżej 360 px: jedna kolumna. Od 600 do 900 px: trzy kolumny.
- Mniej pustej przestrzeni, czytelniejsze nazwy i ceny, delikatne tło oraz cienkie obramówki. Animacje poza widokiem i podczas mobilnego przewijania są wstrzymywane.
- Gradientowe napisy rarity są rysowane jako tekst SVG z lokalnym Nunito Black. Usuwa to zależność od przezroczystego tekstu i background-clip na badge, które na przesłanym zrzucie znikały.
- Exclusive pozostaje rarity. 1M Event oraz Best Pet pozostają dodatkowymi badge.
- Kompaktowy modal szczegółów i zachowane widoki pozostałych kategorii. Strona nadal po angielsku.
- Upload-GitHub.ps1 domyślnie zachowuje najnowsze ceny z repozytorium, żeby aktualizacja wyglądu nie cofała zmian w prices.js. Opcja -UseLocalPrices pozwala wysłać lokalne ceny.

Główny plik nowego układu: `public/phone.css`, ładowany po starszych stylach. Rarity: `rarityLetterMarkup()` w `public/app.js`. Po zmianach uruchom `npm run build`; wynik jest w `public`.

Weryfikacja obejmuje renderowanie i działanie interfejsu w Chromium z emulowanymi szerokościami telefonu oraz widokami desktopowymi. Nie jest to test na fizycznym iPhonie ani w Safari. Dane historii wymagają skonfigurowanego backendu Cloudflare.
