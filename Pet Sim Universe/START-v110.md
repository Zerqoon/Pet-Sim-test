# Pet Universe v110 — karty bez wspólnego panelu

Cały projekt bazuje na v109. Pets, Charms, Eggs i Items mają przezroczysty kontener kolekcji: usunięte są jego tło, widoczna ramka, cień i rozmycie. Karty leżą bezpośrednio na oryginalnym tle strony, z dotychczasowymi równymi odstępami.

Tła samych kart, badge, cienkie animowane obramówki, font Nunito, rozmiary i układ kart pozostają jak w v109. Nagłówki kolekcji mają delikatny cień tekstu dla czytelności na tle strony. Codes zachowuje osobny układ listy.

Zmiana jest dopisana na końcu public/renovation.css, w bloku oznaczonym v110. Katalog, ceny, kalkulator i serwerowy monitor cen pochodzą z v109.

W środku ZIP-a znajduje się cały folder Pet Sim Universe. Po rozpakowaniu uruchom Upload-GitHub.ps1 według START-TUTAJ.md. Domyślnie skrypt zachowuje aktualny public/data/prices.js z GitHuba. Parametr -UseLocalPrices pozwala wysłać lokalne ceny.

Powrót do poprzedniego wyglądu: użyj całego projektu z ZIP-a v109. Opis wcześniejszych zmian znajduje się w START-v109.md.

Podglądy rzeczywistego interfejsu znajdują się w preview/desktop.png i preview/phone.png. Układ sprawdzony w Chromium przy szerokościach 320, 390, 901, 1280 i 3440 px.
