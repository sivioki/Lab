# Audio in Astro Run

## Musik (`music/`)
Eigene Kompositionen, erzeugt mit `tools/make_music.py` (synthetisch, keine Samples).
Frei verwendbar wie der Rest des Spiels.

| Datei | Verwendung |
| --- | --- |
| `menu.ogg` | Ambient-Loop im Hauptmenü |
| `run_core.ogg` | Lauf: Schlagzeug, Bass, Flächen |
| `run_lead.ogg` | Lauf: Arpeggio und Melodie, blendet mit der Zeit ein |
| `run_tense.ogg` | Lauf: Bedrohung, wird lauter, wenn die Aliens nah sind |
| `gameover.ogg`, `unlock.ogg` | kurze Jingles |

## Soundeffekte (`sfx/`)
Von [Kenney](https://kenney.nl) – CC0 (gemeinfrei), aus den Starter-Kits auf GitHub:

| Datei | Quelle |
| --- | --- |
| `coin.ogg`, `land.ogg`, `fall.ogg`, `steps.ogg` | KenneyNL/Starter-Kit-3D-Platformer (`coin`, `land`, `fall`, `walking`) |
| `jump_a/b/c.ogg`, `crash.ogg`, `shield_hit.ogg`, `shield.ogg`, `alien.ogg`, `laser.ogg` | KenneyNL/Starter-Kit-FPS (`jump_*`, `enemy_destroy`, `enemy_hurt`, `weapon_change`, `enemy_attack`, `blaster`) |
| `stumble.ogg`, `slide.ogg` | KenneyNL/Starter-Kit-Racing (`impact`, `skid` – gekürzt; Skid von Landeplage, ebenfalls CC0) |
| `turn.ogg`, `click.ogg`, `o2.ogg` | KenneyNL/Starter-Kit-City-Builder (`rotate`, `toggle`, `placement-c`) |

Wind und Fahrtgeräusche entstehen live im Spiel aus gefiltertem Rauschen.
