const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');
const { PRESETS } = require('../js/data.js');

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('Feststoff: NaCl 137 mmol/L in 1 L = 8,006 g', () => {
  const r = C.computeComponent({ M: 58.44, form: 'solid', conc: 137, concUnit: 'mmol/L', purity: 100 }, 1);
  assert.equal(r.measure, 'mass');
  close(r.mass, 8.00628);
});

test('Feststoff mit Reinheit und Komma-Eingabe', () => {
  const r = C.computeComponent({ M: '56,11', form: 'solid', conc: '1', concUnit: 'mol/L', purity: '85' }, 0.1);
  close(r.mass, 5.611 / 0.85);
});

test('Massenkonzentration % (w/v)', () => {
  const r = C.computeComponent({ M: '', form: 'solid', conc: 0.1, concUnit: '% (w/v)' }, 0.5);
  close(r.mass, 0.5);
});

test('Flüssigkeit: Eisessig 1 mol/L in 1 L ≈ 57,25 mL', () => {
  const r = C.computeComponent({ M: 60.05, form: 'liquid', conc: 1, concUnit: 'mol/L', purity: 100, density: 1.049 }, 1);
  close(r.volume, 60.05 / 1.049);
});

test('Flüssigkeit: HCl 37 % für 100 mL 1 mol/L', () => {
  const r = C.computeComponent({ M: 36.46, form: 'liquid', conc: 1, concUnit: 'mol/L', purity: 37, density: 1.19 }, 0.1);
  close(r.volume, 3.646 / 0.37 / 1.19);
});

test('Volumenanteil % (v/v)', () => {
  const r = C.computeComponent({ M: 1227.5, form: 'liquid', conc: 0.05, concUnit: '% (v/v)', density: 1.1 }, 1);
  close(r.volume, 0.5);
});

test('Stammlösung: 10 mmol/L aus 1 mol/L in 500 mL = 5 mL', () => {
  const r = C.computeComponent({ form: 'stock', conc: 10, concUnit: 'mmol/L', stockConc: 1, stockUnit: 'mol/L' }, 0.5);
  close(r.volume, 5);
  close(r.dilution, 100);
});

test('Stammlösung gemischte Einheiten braucht M', () => {
  const bad = C.computeComponent({ form: 'stock', conc: 10, concUnit: 'mmol/L', stockConc: 100, stockUnit: 'g/L' }, 1);
  assert.equal(bad.ok, false);
  const ok = C.computeComponent({ form: 'stock', M: 100, conc: 10, concUnit: 'mmol/L', stockConc: 100, stockUnit: 'g/L' }, 1);
  close(ok.volume, 10);
});

test('Fehler: Stammlösung zu verdünnt, fehlende M, Dichte', () => {
  assert.equal(C.computeComponent({ form: 'stock', conc: 2, concUnit: 'mol/L', stockConc: 1, stockUnit: 'mol/L' }, 1).ok, false);
  assert.equal(C.computeComponent({ form: 'solid', conc: 1, concUnit: 'mol/L' }, 1).ok, false);
  assert.equal(C.computeComponent({ form: 'liquid', M: 10, conc: 1, concUnit: 'mol/L' }, 1).ok, false);
  assert.equal(C.computeComponent({ form: 'solid', M: 10, conc: 1, concUnit: 'mol/L', purity: 120 }, 1).ok, false);
});

test('Messkolben nach ISO 1042', () => {
  assert.equal(C.selectFlask(250).type, 'flask');
  assert.equal(C.selectFlask(250).tol, 0.15);
  assert.equal(C.selectFlask(750).type, 'cylinder');
  assert.equal(C.selectFlask(10000).type, 'none');
});

test('Messmittel für Volumina', () => {
  assert.match(C.selectVolumeDevice(10).label, /Vollpipette 10 mL/);
  assert.match(C.selectVolumeDevice(0.05).label, /100 µL/);
  assert.match(C.selectVolumeDevice(0.25).label, /1000 µL/);
  assert.match(C.selectVolumeDevice(57.2).label, /Messzylinder 100 mL/);
  assert.match(C.selectVolumeDevice(0.0001).label, /zu klein/);
  close(C.selectVolumeDevice(0.5).tol, 0.008);
});

test('Waagenauswahl', () => {
  assert.match(C.selectBalance(8).label, /Analysenwaage/);
  assert.match(C.selectBalance(121.14).label, /Präzisionswaage/);
  assert.ok(C.selectBalance(0.0005).warn);
});

test('Formatierung deutsch', () => {
  assert.equal(C.fmtMass(8.00628), '8,0063 g');
  assert.equal(C.fmtVolume(0.05), '50,00 µL');
  assert.equal(C.fmtVolume(57.246), '57,25 mL');
});

test('Rezeptur mit mehreren Volumina skaliert linear', () => {
  const tae = PRESETS.find((p) => p.id === 'tae50');
  const res = C.computeRecipe({ components: tae.components, volumes: [{ value: '500', unit: 'mL' }, { value: '1', unit: 'L' }] });
  assert.equal(res.length, 2);
  close(res[1].items[0].result.mass, 242.28);
  close(res[0].items[0].result.mass * 2, res[1].items[0].result.mass);
  close(res[1].items[2].result.volume, 100);
  assert.equal(res[1].flask.type, 'flask');
});

test('Alle Vorlagen rechnen fehlerfrei', () => {
  for (const p of PRESETS) {
    const res = C.computeRecipe({ components: p.components, volumes: [{ value: '1', unit: 'L' }] });
    for (const it of res[0].items) assert.ok(it.result.ok, `${p.name}: ${it.comp.name} – ${it.result.error}`);
    assert.equal(res[0].warnings.length, 0, p.name);
  }
});
