# Pet Universe Values — v128

Cały projekt, gotowy build, grafiki i nowy panel admina są w tej paczce.

## Aktualizacja

1. Rozpakuj ZIP do **osobnego folderu**.
2. Otwórz znajdujący się w nim folder **Pet Sim Universe**.
3. Uruchom **Start-Update.cmd** i poczekaj na komunikat GOTOWE.

Domyślny dotychczasowy projekt: `C:\Users\zerqo\Desktop\Pet Sim Universe`.
Skrypt aktualizuje admina i wysyła cały projekt, korzystając z aktualnego katalogu,
cen oraz zdjęć z GitHuba. Zachowuje konta, token oraz prywatną konfigurację.
Jeżeli lokalnego admin.json brakuje, odzyskuje konfigurację istniejącego panelu.

PowerShell z folderu nowej paczki:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1
```

Inny folder obecnego projektu:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Project.ps1 -ProjectPath "C:\TwojFolder\Pet Sim Universe"
```

Nie zastępuj swojego istniejącego projektu przez ręczne rozpakowanie ZIP-a na jego
plikach danych. Aktualizator zachowuje aktualne dane i używa najnowszych danych
z repozytorium podczas wysyłania.

## Nowy admin

Krótszy nagłówek, szerszy katalog, przyklejony pasek kategorii i filtrów,
edytor z podglądem oraz zakładkami Values / Details / Artwork. Stały pasek
Review / Publish, zapis szkiców na urządzeniu, wykrywanie konfliktów,
galeria assetów i czytelniejsza historia. Status publikacji sprawdza GitHub,
stronę oraz Discord osobno. Edytor na telefonie wypełnia ekran.

Panel: https://admin.petuniverse-values.pl. Konta i hasła są te same.
Edytowalny plik cen: **public/data/prices.js**. ??? i Null to Not Price.
Główna strona oraz dane w paczce pozostają takie jak w v127.

122 testy i build przechodzą. Testy sieciowe używają symulacji.
Wdrożenie na Twoim koncie sprawdzają skrypty po uruchomieniu aktualizacji.
Instrukcja panelu: README-ADMIN.md. Pierwsza instalacja: ADMIN-START.md.
Cloudflare Pages: root Pet Sim Universe, build npm run build, output public.
