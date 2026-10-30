# Lab

## Astro Run

Ein Endlosläufer im Stil von Temple Run: Als Astronaut fliehst du vor Aliens über die
Stege fremder Planeten. Mit den Coins, die du unterwegs sammelst, schaltest du neue
Planeten frei.

- **Im Browser:** `astro-run/index.html` öffnen (lädt Three.js und Schriften aus dem Netz).
- **Android:** Bei jedem Push baut GitHub Actions (Workflow „Astro Run APK“) die Datei
  `AstroRun.apk`. Sie liegt im Lauf unter *Artifacts* → `AstroRun-APK` (ZIP mit der APK).
  Auf dem Handy die APK öffnen und „Installation aus unbekannten Quellen“ erlauben.
  Die App läuft komplett offline. Selbst bauen: Ordner `android/` in Android Studio
  öffnen oder `cd android && ./gradlew assembleRelease`.

### Steuerung

| Aktion | Tastatur | Handy |
| --- | --- | --- |
| Spur wechseln / an Ecken abbiegen | ← → oder A D | nach links/rechts wischen |
| Springen | ↑, W oder Leertaste | nach oben wischen |
| Rutschen | ↓ oder S | nach unten wischen |
| Pause | P oder Esc | Pause-Knopf oder Zurück-Taste |

Im Pausemenü lässt sich die Grafikqualität wählen (Auto, Hoch, Mittel, Niedrig). Auf „Auto“ schaltet das Spiel selbst eine Stufe herunter, wenn es ruckelt.

### Regeln

- **Aliens** sind dir auf den Fersen. Wenn du über einen Felsen stolperst oder seitlich gegen
  einen Monolithen prallst, holen sie auf. Stolperst du nochmal, bevor du sie abgehängt hast,
  schnappen sie dich.
- **Tödlich:** Monolithen frontal, Laserschranken (rutschen!), Krater (springen!) und
  verpasste Kurven am Ende jedes Stegs.
- **Sauerstoff** sinkt ständig. O₂-Tanks füllen ihn auf. Ohne Sauerstoff wirst du langsamer
  und die Aliens holen dich ein.
- **Schild** fängt einen Treffer oder ein Stolpern ab.

### Planeten

| Planet | Preis | Schwerkraft | Besonderheit |
| --- | --- | --- | --- |
| Mond | frei | niedrig | Felsplateaus, Erde am Himmel |
| Mars | 150 Coins | mittel | Felsnadeln, Staubhimmel |
| Europa | 400 Coins | mittel | Eiskristalle, Jupiter am Himmel |
| Vulkanus | 800 Coins | hoch | Lava und Basaltsäulen |
| Xenon | 1500 Coins | mittel | Leuchtender Pilzdschungel, Ringplanet |

Das Tempo steigt ohne Obergrenze immer weiter, aber sanft: etwa 110 km/h nach einer Minute, gut 200 km/h nach fünf (Anzeige oben). Spätere Planeten starten schwieriger. Coins, freigeschaltete Planeten und Rekorde
(pro Planet) werden auf dem Gerät gespeichert.

### Grafik-Assets

- **3D-Modelle:** aus dem *Ultimate Space Kit* von [Quaternius](https://quaternius.com), CC0 (gemeinfrei). Dazu gehören:
  - animierte Astronauten: Rae, Finn, Barbara und Fernando,
  - die Aliens als Verfolger,
  - Mondstation, Rover und Raumschiff,
  - Felsen, Lava- und Alien-Bäume, Pflanzen,
  - das Schild-Symbol.

  Quellen stehen in `astro-run/models/CREDITS.md`.
- **Figuren:** 13 Stück, im Menü unter „Figur“. Gesperrte Figuren lassen sich als Vorschau ansehen; ein zweites Tippen schaltet sie frei.

  | Figur | Preis |
  | --- | --- |
  | Astro (Klassik), Rae (Roter Panda) | frei |
  | Astro Rot (Mars-Anzug) | 150 |
  | Finn (Frosch) | 300 |
  | Schatten (Tarnanzug) | 450 |
  | Barbara (Biene) | 600 |
  | Fernando (Flamingo) | 1000 |
  | Rae-, Finn-, Barbara-, Fernando-Mech | 1500, 2000, 2500, 3000 |
  | Astro Gold | 4000 |
  | Zork (Überläufer-Alien) | 5000 |
- Die Modelle werden mit `astro-run/tools/build_models.mjs` aufbereitet und mit `bundle_models.py` gebündelt.

### Musik und Sound

- **Musik:** eigene Stücke, erzeugt mit `astro-run/tools/make_music.py`. Im Menü läuft ein ruhiger Ambient-Loop. Beim Lauf spielt treibender Synthwave in drei Ebenen: Die Melodie blendet sich mit der Zeit ein, eine bedrohliche Ebene wird lauter, je näher die Aliens sind.
- **Soundeffekte:** von [Kenney](https://kenney.nl), CC0 (gemeinfrei). Quellen in `astro-run/audio/CREDITS.md`.
- **Wind und Fahrtrauschen** entstehen live und klingen auf jedem Planeten anders.
- Musik und Effekte lassen sich im Pausemenü getrennt abschalten.

Drittanbieter: Three.js r128 mit Nachbearbeitungs-, glTF- und Skelett-Modulen (MIT), Schriften Chakra Petch und Barlow (SIL OFL) in
`astro-run/vendor/`.
