# Pet Universe Values — v121

Cały projekt, gotowy build i wszystkie grafiki są w tej paczce.
Strona jest po angielsku. Zachowano dokładnie ceny z Twojej paczki v118.
**Edytujesz tylko `public/data/prices.js`.**

## Wgranie całego projektu

Rozpakuj folder `Pet Sim Universe`. Skopiuj jego zawartość do swojego projektu,
np. `C:\Users\zerqo\Desktop\Pet Sim Universe`, zastępując pliki.
Zachowaj prywatny folder `.cloudflare` z wcześniejszej konfiguracji Discorda.

W PowerShell uruchom:

```powershell
Set-Location "C:\Users\zerqo\Desktop\Pet Sim Universe"
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upload-GitHub.ps1
```

Upload wgrywa cały projekt do `Zerqoon/Pet-Sim-test` i używa cen z tej paczki.
Wykonuje walidację i build przed commitem. Przy zachowanej konfiguracji Discorda
czeka na opublikowane ceny, wdraża monitor i potwierdza test na Twoim kanale.

Cloudflare Pages: **Root `Pet Sim Universe`**, **Build `npm run build`**, **Output `public`**.
Ceny działają także bez Pages Functions. Historia wymaga opcjonalnego bindingu
D1 `VALUES_DB`; przy jego braku dialog pokazuje aktualną cenę i informację,
że historia jest niedostępna.

## Co zmieniło się w v121

Home zajmuje całą szerokość — panel boczny jest w nim ukryty, a w Values i Calculator nadal działa. Menu jest wyśrodkowane i ma dokładnie dwa przyciski:
**Values** oraz **Calculator**. Usunięto dodatkowe kategorie, kafelki, linki
i opisy. Zachowano czas aktualizacji cen oraz dyskretne podpisy twórców.

Tło korzysta z istniejących sky-world.png, category-pets.png oraz
gummy-egg.png. Grafiki są przyciemnione warstwami CSS i umieszczone za menu;
nie zmieniano oryginalnych plików. Build korzysta z istniejących wariantów WebP.
Na telefonie dwa przyciski układają się pionowo. Tło jest statyczne.

Pozostałe widoki i nawigacja, wszystkie 331 plików grafik i fontów, ceny,
ich data aktualizacji, katalog oraz Discord pochodzą bez zmian z v120.
Edytujesz nadal tylko jeden **public/data/prices.js**.

## Dodawanie petów

Ta paczka nie zawiera panelu administracyjnego ani strony logowania do edycji
GitHuba. Dodajesz dane peta w **public/data/catalog.js**, jego cenę w
**public/data/prices.js** i obraz w **public/assets/pets/**. Następnie uruchamiasz
**Upload-GitHub.ps1**, który sprawdza i publikuje projekt. Wywołania administracyjne
monitora Discorda służą do diagnostyki; nie są edytorem katalogu.

## Ceny i czas aktualizacji

`???`, `null`, `"null"`, `No Price`, `Not Price`, `N/A` oraz puste wartości
wyświetlają **Not Price**. Prawdziwe zero pozostaje ceną **0**. **O/C** pozostaje O/C.
Oferta z Not Price lub O/C ma wynik **INCOMPLETE**, a suma obejmuje znane ceny.
Strona i eksport PNG stosują tę samą zasadę.

Zestaw zawiera 91 wycen, w tym 79 liczbowych i 12 bez ceny. W porównaniu z v116
zmieniły się 22 wyceny. Data startowa **05 Oct 2026, 10:33:51 CEST** oznacza czas
otrzymania Twojego załącznika; jego oryginalna godzina edycji nie jest dostępna.

Kolejne zmiany: zapisujesz `public/data/prices.js` i wgrywasz projekt albo
commitujesz ten plik na GitHubie. Build sam zapisuje datę i SHA-256 wartości
w `price-updates.js`. To metryka bez cen, której nie edytujesz.
Wizyty, rozpakowanie, zmiana wyglądu i build tych samych wartości nie zerują daty.
Przy braku właściwej metryki monitor zapisuje czas wykrycia, oznaczony
**CHANGE DETECTED**. Panel nie podaje starej daty dla nowego zestawu cen.

## Discord

Monitor zachowuje wersję 116 z poprawkami autoryzacji, kolejki i limitów Discorda.
Numer v121 dotyczy strony; protokół monitora pozostaje v116. Nie musisz edytować drugiego pliku cen.

Jeśli konfiguracja została w poprzednim folderze:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Upgrade-Discord.ps1 -ProjectPath "C:\Poprzedni-projekt\Pet Sim Universe"
```

Przy pierwszej konfiguracji lub zmianie webhooka:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-Discord.ps1
```

Cron sprawdza ceny co minutę. Rzeczywiste zmiany są zapisane w trwałej kolejce,
wysyłane grupami z osobnymi embedami i ponawiane po przejściowym błędzie.
Setup/Upgrade zgłasza sukces dopiero po odpowiedzi Discorda.
Testy w paczce symulują HTTP; nie oznaczają testu na Twoim kanale.

## Uruchomienie lokalne

Node.js 22.13 lub nowszy:

```text
npm run dev
```

Otwórz `http://127.0.0.1:4173`. Nie uruchamiaj `index.html` przez dwuklik.

```text
npm run build
npm test
```

Sprawdzono build, kompletność grafik i zgodność danych z v120,
strukturę HTML, dwa wejścia z Home oraz odpowiedzi lokalnego serwera. Nowy wygląd nie
został sprawdzony wizualnie w przeglądarce ani na prawdziwym telefonie, ponieważ
w tym środowisku nie ma dostępnej przeglądarki do lokalnego podglądu.
Nie zmieniano Twojego wdrożenia ani konta Cloudflare.
