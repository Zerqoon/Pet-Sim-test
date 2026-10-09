# Licznik Watching Value List na Home

Na Home, pod datą aktualizacji cen, pojawia się np. **1 Watching Value List**.
Liczba oznacza aktywne przeglądarki na stronie wartości (Home, Values lub
Calculator). Nie jest sumą wejść ani liczbą kart. Odświeżenie strony i otwarcie
kilku kart w tej samej przeglądarce nie zwiększa wyniku.

## Wgraj pełną stronę

Rozpakuj ZIP i otwórz PowerShell w folderze **Pet Sim Universe**. Uruchom:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1 -UseRemotePrices
```

Skrypt zachowuje aktualny katalog, ceny i grafiki z Twojego GitHuba. Ustawienia
Pages: root `Pet Sim Universe`, build `npm run build`, output `public`.
API `/value` dla bota i panel admina pozostają w tej paczce.

## Włącz wspólny licznik w Cloudflare

Licznik wymaga wspólnej bazy, aby odwiedzający z różnych urządzeń i regionów
widzieli ten sam wynik. Wystarczy jednorazowo podłączyć D1 do projektu Pages.

1. Jeśli projekt Pages ma już bazę z bindingiem **VALUES_DB**, licznik użyje
   jej automatycznie. W takim przypadku nie trzeba dodawać nowego bindingu.
2. W przeciwnym razie w Cloudflare utwórz bazę D1, np. `pet-universe-viewers`.
   Możesz też wybrać istniejącą bazę monitora cen; licznik korzysta z osobnych
   tabel i nie zmienia historii cen ani ustawień monitora.
3. Otwórz swój projekt **Pages → Settings → Bindings → Add → D1 database**.
   W środowisku **Production** wpisz nazwę bindingu **VIEWERS_DB** i wybierz bazę.
4. Zapisz binding i wykonaj ponowne wdrożenie Pages. Sam zapis bindingu nie
   wystarcza. Tabele utworzą się automatycznie przy pierwszym wywołaniu API.

Nie trzeba ustawiać sekretu ani zmieniać bota Discord. Binding w osobnym
Workerze monitora nie jest automatycznie dostępny w projekcie Pages.

Po wdrożeniu otwórz Home, a następnie:

```text
https://petuniverse-values.pl/api/viewers
```

Odpowiedź ma `available: true` i rzeczywisty `count`. Samo otwarcie tego adresu
nie dodaje odwiedzającego. Jeśli licznik nie ma połączenia z bazą, jest ukryty;
strona nie pokazuje wymyślonego wyniku ani starej liczby jako aktualnej.

## Jak działa liczenie

- Aktywna karta wysyła sygnał co **15 sekund**. Ten sam identyfikator przeglądarki
  jest współdzielony przez wszystkie karty, również po odświeżeniu strony.
- Otworzenie pięciu kart nadal daje **1**. Druga przeglądarka/profil lub inne
  urządzenie daje kolejną sesję — bez logowania nie da się rozpoznać, czy to
  ta sama osoba. Tryb incognito ma osobny identyfikator.
- Ukryte karty przestają wysyłać sygnały. Przeglądarka znika z wyniku po
  **45 sekundach** bez sygnału. Na ekranie innych osób zmiana pojawia się przy
  ich następnym odświeżeniu licznika, czyli najpóźniej około **60 sekund** od
  ostatniego sygnału. Powrót do aktywnej karty wysyła sygnał od razu.
- Zamknięcie jednej karty nie usuwa pozostałych kart z licznika. Nie ma
  zgadywania na podstawie adresu IP: różne osoby w tej samej sieci liczą się
  osobno. Baza przechowuje tylko losowy identyfikator i termin wygaśnięcia.
- Identyfikator używa localStorage oraz pomocniczego cookie. Jeśli przeglądarka
  blokuje oba mechanizmy, nie tworzymy osobnego ID dla każdej karty.
- Licznik nie liczy wywołań API cen przez Discord bota. Zapisy sesji przyjmują
  żądania JSON wyłącznie z tej samej domeny strony.

Wydajność: wynik utrzymują triggery w jednej tabeli; każde odświeżenie nie
skanuje wszystkich odwiedzających. Indeks pozwala usuwać wygasłe sesje.
Ruch licznika korzysta z limitów Functions i D1 na Twoim koncie; stan zużycia
sprawdzisz w Cloudflare. Nie włączamy automatycznie płatnego planu.

## Sprawdź lokalnie

Node.js 22.13 lub nowszy:

```text
npm run dev
npm test
```

Serwer lokalny używa prawdziwej bazy SQLite w pamięci procesu. Wynik pochodzi
z otwartych przeglądarek, nie z danych demonstracyjnych. Restart lokalnego
serwera zeruje wyłącznie tę lokalną bazę.

Kontrola tej paczki: **158 testów przeszło**, build zakończył się poprawnie.
W Chromium sprawdzono sześć kart otwartych jednocześnie (wynik 1), drugą
przeglądarkę (wynik 2), odświeżenie strony, zamknięcie jednej karty, rzeczywiste
wygaśnięcie zamkniętej przeglądarki oraz wygląd Home na desktopie i telefonie.
Wdrożenie na Twoim koncie Cloudflare wykonujesz po wgraniu paczki i bindingu.

Dokumentacja Cloudflare:
https://developers.cloudflare.com/pages/functions/bindings/#d1-databases
https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
