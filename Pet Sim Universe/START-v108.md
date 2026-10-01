# Pet Universe v108 — kompaktowe Items i nowa lista Codes

Panel Items dopasowuje się do pełnych rzędów kart i jest wyśrodkowany. Na szerokim ekranie pokazuje sześć kart obok siebie; przy mniejszej szerokości używa trzech lub dwóch kolumn. Po wyszukaniu jednego lub kilku przedmiotów panel na komputerze zwęża się razem z wynikami. Telefon zachowuje układ kart z v107.

Codes ma osobny, wyśrodkowany panel o szerokości do 860 px. Każdy wiersz zawiera ikonę, czytelny kod, status Active/Expired i przycisk Copy code. Na telefonie status jest pod nazwą; przycisk ma 44 px wysokości. Po skopiowaniu pojawia się Copied! i zielony akcent. Wielokrotne kliknięcie poprawnie przywraca tekst przycisku. W tej kategorii jest tylko wyszukiwarka; sortowanie wraca po przejściu do pozostałych kategorii.

Strona nadal używa angielskich tekstów, fontu Nunito, naszego wspólnego tła, szklanych paneli i dotychczasowych badge oraz animowanych obramówek.

Zmiany układu Items i Codes są w public/collections.css, ładowanym po public/phone.css. Build łączy wszystkie style w jeden plik CSS z hashem. Logika listy i kopiowania jest w public/app.js; szablon strony w src/index.html.

Cały projekt jest w folderze Pet Sim Universe. Upload-GitHub.ps1 wysyła ten folder i domyślnie zachowuje aktualne ceny z GitHuba. Aby wysłać również lokalne ceny, użyj parametru -UseLocalPrices.

Sprawdzenie w Chromium obejmuje szerokości 320–3440 px, brak poziomego przewijania w Items i Codes, oryginalne tło, wyszukiwanie, zerowe wyniki, przywracanie list, rzeczywiste kopiowanie do schowka oraz ponowne kopiowanie.
