#!/usr/bin/env python3
"""Packt alle Ogg-Dateien aus astro-run/audio/{music,sfx} als Base64 in audio/audio-data.js.

So lädt das Spiel seine Klänge per <script> – das klappt in der Android-App, im Browser
und auch beim direkten Öffnen der Datei (file://), wo fetch() nicht erlaubt ist.
Aufruf: python3 bundle_audio.py
"""
import base64
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent / 'audio'
data = {}
for sub in ('music', 'sfx'):
    for f in sorted((root / sub).glob('*.ogg')):
        data[f'{sub}/{f.stem}'] = base64.b64encode(f.read_bytes()).decode('ascii')
out = root / 'audio-data.js'
out.write_text('// Automatisch erzeugt von tools/bundle_audio.py – nicht von Hand bearbeiten.\n'
               'window.ASTRO_AUDIO = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print(out, round(out.stat().st_size / 1e6, 2), 'MB,', len(data), 'Dateien')
