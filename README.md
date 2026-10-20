# Lab

## Flappy Vogel – ein Flappy-Bird-Klon für Android

Kleines Android-Spiel in Kotlin, komplett mit `Canvas` auf einer `SurfaceView` gezeichnet –
keine externen Bibliotheken, keine Bilddateien.

- Tippen lässt den Vogel nach oben flattern, Schwerkraft zieht ihn nach unten
- Durch die Lücken zwischen den Röhren fliegen – jede Röhre gibt einen Punkt
- Rekord wird gespeichert (`SharedPreferences`)
- Chiptune-Hintergrundmusik in Dauerschleife
- Soundeffekte für Flattern, Punkt, Aufprall und Absturz; Lautsprecher-Knopf oben rechts
  (auf Start- und Game-Over-Bildschirm) schaltet Musik und Effekte stumm
- Alle Größen skalieren mit der Bildschirmhöhe, läuft also auf jedem Handy gleich

### APK bekommen

**Ohne eigenes Setup:** Bei jedem Push baut GitHub Actions die APK.
Unter *Actions → Build APK → letzter Lauf → Artifacts* `flappy-vogel-apk` herunterladen,
entpacken und `app-debug.apk` aufs Handy kopieren und installieren
(Installation aus unbekannten Quellen erlauben).

**Lokal:** Projekt in Android Studio öffnen und auf *Run* drücken, oder:

```sh
./gradlew assembleDebug
# APK liegt danach unter app/build/outputs/apk/debug/app-debug.apk
```

### Code

- `app/src/main/java/com/sivioki/flappy/MainActivity.kt` – Vollbild-Activity
- `app/src/main/java/com/sivioki/flappy/GameView.kt` – Spielschleife, Physik, Kollision und Zeichnen
- `app/src/main/java/com/sivioki/flappy/Sounds.kt` – Soundeffekte über `SoundPool`, Musik über `MediaPlayer`
- `tools/make_sounds.py` – erzeugt Effekte und Musik in `app/src/main/res/raw/`
  (`python3 tools/make_sounds.py`, für die Musik wird `ffmpeg` benötigt)
