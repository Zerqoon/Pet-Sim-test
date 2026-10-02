# Pet Universe v111 — Calculator na bazie v108

Cały projekt zachowuje wybrany układ Value List z v108, w tym kompaktowe Items, listę Codes, Nunito, tło świata i dotychczasowe badge. Zmiany dotyczą kalkulatora i wyboru przedmiotów do ofert.

## Wybór przedmiotów

- O/C jest na początku; potem wartości malejąco. Przedmioty bez wyceny są na końcu. Równe ceny porządkuje nazwa.
- Pets ma osobny przełącznik Normal / Golden / Diamond. Zmienia zdjęcia, widoczne ceny oraz kolejność listy. Pokazuje tylko pety dostępne w wybranym wariancie.
- Add to offer dodaje aktualny wariant do wybranej strony. Licznik ×2, ×3 itd. pokazuje ilość już dodaną do tej oferty. Normal, Golden i Diamond liczą się osobno.
- Kategorie Charms, Eggs i Items korzystają z tego samego sortowania cen. Przełącznik wariantów dotyczy Pets.
- Wyszukiwanie działa razem z kategorią i wariantem. Przełączenie wariantu lub kategorii przewija listę na początek.

## Kalkulator

Szklane panele w tonach fioletu i błękitu pasują do Value List. Pozostaje oryginalne tło strony. Karty ofert mają równe odstępy, czytelne ceny i osobne przyciski + / − u dołu. Wariant Pets jest opisany przy nazwie rzadkości.

Na komputerze oferty są obok siebie, z wynikiem między nimi. Na telefonie wynik jest zwięzły, a oferty znajdują się jedna pod drugą. Wybór przedmiotów ma dwie kolumny na telefonie. Tylko lista kart przewija się wewnątrz okna; wyszukiwarka i filtry pozostają widoczne.

W / FAIR / L korzysta z dotychczasowej wspólnej logiki strony i obrazu PNG. O/C i niewycenione przedmioty są oznaczane; porównanie obejmuje wartości znane. Save Trade Image nadal tworzy PNG bez udostępniania długiego linku.

## Pliki i aktualizacja

- Wygląd kalkulatora: `public/calculator.css`.
- Logika aplikacji: `public/app.js`.
- Szablon strony: `src/index.html`.
- Ceny: `public/data/prices.js` — bez zmiany danych z v108 w tym wydaniu.
- Build: `npm run build`. Pliki strony są w `public`, a CSS i JS są łączone w pliki z hashem.

`Upload-GitHub.ps1` wysyła cały folder `Pet Sim Universe` i domyślnie zachowuje aktualne ceny z GitHuba. Dodaj `-UseLocalPrices` tylko wtedy, gdy chcesz wysłać także ceny z tej paczki. Instrukcja wdrożenia jest w `START-TUTAJ.md`. Konfiguracja Cloudflare oraz monitora Discorda pozostaje taka jak w v108.

## Weryfikacja wydania

Build oraz walidacja katalogu przechodzą poprawnie. Sprawdzenie w Chromium obejmowało szerokości 320, 375, 390, 900, 901, 1280, 1920 i 3440 px: sortowanie wszystkich kategorii, warianty Pets, zdjęcia i ceny wariantów, oddzielne ilości, wyszukiwanie, brak wyników, powrót do listy, zmianę stron, W / FAIR / L, porównanie wartości dziesiętnych i oznaczenia O/C. Eksport tworzy poprawny PNG o szerokości 1600 px. Sprawdzono brak poziomego przewijania, nakładania badge na zdjęcia oraz ściskania wariantu i ceny. Value List nadal ma 26 petów, a Codes sześć pozycji. Nie było błędów JavaScript podczas tych scenariuszy.

Podglądy kalkulatora i wyboru petów na komputerze i telefonie są w folderze `preview`. Pliki cen, katalogu, wygląd Value List i pliki backendu porównano z v108 — zachowują oryginalną zawartość.
