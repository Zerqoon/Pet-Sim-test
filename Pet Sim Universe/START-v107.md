# Pet Universe v107 — nasze tło i szkło na telefonie

W tej wersji Value List ponownie korzysta z tego samego obrazu tła, filtra, warstw kolorów i koloru bazowego co Home. Usunięto przyciemnienie dodane w v106. Dotyczy to wszystkich kategorii; motyw strony pozostaje wspólny.

Mobilne panele mają teraz szklane gradienty oparte na kolorach głównej strony: nagłówek marki, nawigacja, filtry i kolekcja. Karty mają delikatną poświatę rarity, wewnętrzną szklaną warstwę za obrazkiem i wyraźniejsze ceny. Zostały cienkie obramówki, pogrubione gradientowe napisy badge i kompaktowe dwie kolumny.

Na telefonie powróciła lekka warstwa gwiazdek. Stop Animations nadal zatrzymuje animacje; efekty poza ekranem i podczas mobilnego przewijania są wstrzymywane. Rozmycie jest ograniczone do nagłówka filtrów; każda karta korzysta ze statycznie malowanej warstwy szkła.

Wygląd mobilny jest w `public/phone.css`. Wspólne tło pochodzi z dotychczasowych stylów i assetów projektu. Rarity, ceny i logika kalkulatora pozostają w swoich dotychczasowych plikach. Po zmianach uruchom `npm run build`.

Cały projekt jest w folderze `Pet Sim Universe`. Wysyłanie: uruchom `Upload-GitHub.ps1` z tego folderu. Skrypt zachowuje aktualny `public/data/prices.js` z GitHuba, chyba że podasz `-UseLocalPrices`.

Sprawdzenie obejmuje zgodność ustawień tła Home i Value List, szerokości 320–900 px oraz desktop, brak poziomego przewijania, badge i obsługę interfejsu. Podglądy wykonano w Chromium; nie jest to test na fizycznym iPhonie ani w Safari.
