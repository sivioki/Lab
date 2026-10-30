#!/usr/bin/env python3
"""Packt die GLB-Modelle als Base64 in einzelne JS-Dateien unter astro-run/models/.

Jede Datei setzt window.ASTRO_MODELS[name]. Das Spiel lädt sie bei Bedarf per <script>,
das funktioniert in der Android-App, im Browser und beim direkten Öffnen (file://).
Aufruf: python3 bundle_models.py <ordner mit .glb-dateien>
"""
import base64
import pathlib
import sys

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parent.parent / 'models'
out.mkdir(exist_ok=True)
for f in sorted(src.glob('*.glb')):
    b64 = base64.b64encode(f.read_bytes()).decode('ascii')
    (out / f'{f.stem}.js').write_text(
        '// Automatisch erzeugt von tools/bundle_models.py – nicht von Hand bearbeiten.\n'
        f'(window.ASTRO_MODELS = window.ASTRO_MODELS || {{}})[{f.stem!r}] = "{b64}";\n'.replace("'", '"'))
    print(f.stem, round((out / f'{f.stem}.js').stat().st_size / 1e6, 2), 'MB')
