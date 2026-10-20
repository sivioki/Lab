# Lab – Puffer-Rechner

Web-App zur Pufferherstellung im Labor. Aus **molarer Masse**, **Zielkonzentration** und **Endvolumen**
berechnet sie, wie viel einer Chemikalie **eingewogen** bzw. **abgemessen/pipettiert** werden muss –
für beliebig viele Endvolumina gleichzeitig.

## Starten

`index.html` im Browser öffnen (keine Installation, kein Server nötig). Alternativ über GitHub Pages bereitstellen.

## Funktionen

- Komponenten als **Feststoff** (Einwaage, mit Reinheit), **Flüssigkeit** (Volumen aus Massenanteil *w* und Dichte *ρ*)
  oder **Stammlösung** (Verdünnung *c₁·V₁ = c₂·V₂*)
- Konzentrationen in mol/L, mmol/L, µmol/L, g/L, mg/mL, mg/L, µg/mL, % (w/v), % (v/v)
- Mehrere Endvolumina (µL, mL, L) mit Schnellwahl der Messkolben-Nennvolumina nach ISO 1042
- Automatische Auswahl des Messmittels mit Fehlergrenze:
  - Messkolben Klasse A – ISO 1042
  - Vollpipetten Klasse A – ISO 648
  - Messzylinder Klasse A – ISO 4788
  - Kolbenhubpipetten – ISO 8655-2
  - passende Waage (Ablesbarkeit) für die Einwaage
- Größen und Einheiten nach ISO 80000-9, Wasserqualität nach ISO 3696
- Chemikalien-Bibliothek (≈ 60 Stoffe inkl. Hydratstufen, Säuren/Laugen mit Dichte) und Vorlagen
  (PBS, TBS, Tris-HCl, TAE, TBE, TE, EDTA, Phosphat-, Acetat-, Citrat-, HEPES-Puffer)
- Arbeitsanweisung, druckbares Protokoll, CSV-Export, Link teilen, Rezepturen im Browser speichern

## Formeln

| Fall | Formel |
|---|---|
| Feststoff | *m = c · V · M · 100 / Reinheit* |
| Flüssigkeit | *V_R = c · V · M · 100 / (w · ρ)* |
| Stammlösung | *V₁ = c₂ · V₂ / c₁* |
| Massenkonzentration | *m = β · V* |

## Tests

```sh
node --test test/*.test.js
```

> Molare Massen, Reinheiten und Dichten der Vorlagen sind Richtwerte – vor Gebrauch mit Etikett bzw.
> Analysenzertifikat der verwendeten Charge abgleichen.
