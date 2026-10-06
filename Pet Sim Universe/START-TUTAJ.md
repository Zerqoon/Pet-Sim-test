# Pet Universe Values — v127

Cały projekt, gotowy build oraz wszystkie grafiki są w tej paczce.

Usunięto z katalogu i prices.js: Exquisite Peacock, Imp, Shadow Dominus,
Fishing Charm I, Fishing Charm II, Squeaky, Ball, Fish Hook oraz Worm.
Dla trzech petów usunięto także Golden i Diamond.
Golden Fish Hook, Universe Worm i Fishing Charm III zostają.
Pozostałe wyceny z v126 są zachowane dokładnie.

Admin ma dopracowany układ, filtry, sortowanie, licznik zmian i czytelniejszy
edytor. Kliknij kartę → Delete card → Queue removal. Usunięcie trafia do
podglądu zmian. Undo removal cofa je przed publikacją. Publish changes
zapisuje całą paczkę dodawania, edycji i usuwania w jednym commicie.

## Aktualizacja wszystkiego

Rozpakuj ZIP osobno. Otwórz PowerShell w jego folderze Pet Sim Universe:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1
```

Domyślny obecny projekt: C:\Users\zerqo\Desktop\Pet Sim Universe.
Inny folder wskazujesz parametrem -ProjectPath:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1 -ProjectPath "C:\TwojFolder\Pet Sim Universe"
```

Skrypt kopiuje kod do Twojego obecnego projektu, zachowując pozostałe lokalne ceny,
grafiki, .cloudflare i private-setup. Usuwa lokalnie wskazane karty i zapisuje kopię
danych w .cloudflare/v127-local-data-backup. Wdraża admina, sprawdza logowanie,
katalog i zdjęcia, usuwa wskazane pozycje z aktualnych danych na GitHubie,
a następnie wgrywa cały projekt z zachowaniem pozostałych zdalnych cen i grafik.
Skrypt zachowuje istniejący token, konta oraz bazę panelu. Po zakończeniu
poczekaj na udany build Pages i odśwież panel.

Panel: https://admin.petuniverse-values.pl.
Instrukcja admina: README-ADMIN.md. Pierwsza instalacja: ADMIN-START.md.
Projekt działa na Workers Free. Edytowalny plik cen to nadal public/data/prices.js.

Cloudflare Pages: root Pet Sim Universe, build npm run build, output public.
Kontrola lokalna: npm test i npm run build. 98 testów przechodzi.
Publiczny wygląd z v126 jest zachowany. Testy HTTP korzystają z symulacji;
wdrożenie sprawdzają skrypty na Twoim komputerze.
