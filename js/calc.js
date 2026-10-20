/*
 * Puffer-Rechner – Rechenkern (ohne DOM, im Browser und in Node nutzbar).
 *
 * Größen und Einheiten nach ISO 80000-9 (Stoffmenge n in mol, molare Masse M in g/mol,
 * Stoffmengenkonzentration c in mol/L). Messmittel-Toleranzen nach
 * ISO 1042 (Messkolben, Klasse A), ISO 648 (Vollpipetten, Klasse A),
 * ISO 4788 (Messzylinder, Klasse A) und ISO 8655-2 (Kolbenhubpipetten).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PufferCalc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // kind: molar = Stoffmengenkonzentration, mass = Massenkonzentration, volume = Volumenanteil
  // f: Faktor auf mol/L, g/L bzw. mL/L
  const CONC_UNITS = {
    'mol/L': { kind: 'molar', f: 1 },
    'mmol/L': { kind: 'molar', f: 1e-3 },
    'µmol/L': { kind: 'molar', f: 1e-6 },
    'g/L': { kind: 'mass', f: 1 },
    'mg/mL': { kind: 'mass', f: 1 },
    'mg/L': { kind: 'mass', f: 1e-3 },
    'µg/mL': { kind: 'mass', f: 1e-3 },
    '% (w/v)': { kind: 'mass', f: 10 },
    '% (v/v)': { kind: 'volume', f: 10 },
  };

  const VOLUME_UNITS = { L: 1, mL: 1e-3, 'µL': 1e-6 };

  // ISO 1042 Messkolben Klasse A: [Nennvolumen mL, Fehlergrenze ± mL]
  const ISO1042 = [
    [1, 0.025], [2, 0.025], [5, 0.025], [10, 0.025], [20, 0.04], [25, 0.04],
    [50, 0.06], [100, 0.1], [200, 0.15], [250, 0.15], [500, 0.25],
    [1000, 0.4], [2000, 0.6], [5000, 1.2],
  ];

  // ISO 648 Vollpipetten Klasse A
  const ISO648 = [
    [1, 0.008], [2, 0.01], [5, 0.015], [10, 0.02], [20, 0.03], [25, 0.03],
    [50, 0.05], [100, 0.08],
  ];

  // ISO 4788 Messzylinder Klasse A
  const ISO4788 = [
    [5, 0.05], [10, 0.1], [25, 0.25], [50, 0.5], [100, 0.5], [250, 1],
    [500, 2.5], [1000, 5], [2000, 10],
  ];

  // ISO 8655-2 Kolbenhubpipetten (variabel): Bereich in µL, max. systematische
  // Messabweichung in % des Nennvolumens (gilt als Absolutwert für den ganzen Bereich)
  const ISO8655 = [
    { nominal: 2, min: 0.2, max: 2, err: 4.0 },
    { nominal: 10, min: 1, max: 10, err: 1.2 },
    { nominal: 20, min: 2, max: 20, err: 1.0 },
    { nominal: 100, min: 10, max: 100, err: 0.8 },
    { nominal: 200, min: 20, max: 200, err: 0.8 },
    { nominal: 1000, min: 100, max: 1000, err: 0.8 },
    { nominal: 5000, min: 500, max: 5000, err: 0.8 },
    { nominal: 10000, min: 1000, max: 10000, err: 0.6 },
  ];

  const EPS = 1e-9;

  function parseNum(v) {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
  }

  function toLitres(value, unit) {
    const f = VOLUME_UNITS[unit];
    const v = parseNum(value);
    if (!f || !(v > 0)) return NaN;
    return v * f;
  }

  /** Konzentration in mol/L (benötigt M bei Massenkonzentration). */
  function toMolar(value, unit, M) {
    const u = CONC_UNITS[unit];
    if (!u) return NaN;
    if (u.kind === 'molar') return value * u.f;
    if (u.kind === 'mass' && M > 0) return (value * u.f) / M;
    return NaN;
  }

  function fail(msg) {
    return { ok: false, error: msg };
  }

  /**
   * Berechnet für eine Komponente und ein Endvolumen (in L), wie viel eingewogen
   * bzw. abgemessen werden muss.
   *
   * comp: { name, M, form: 'solid'|'liquid'|'stock', conc, concUnit,
   *         purity (%), density (g/mL), stockConc, stockUnit }
   *
   * Rückgabe: { ok, measure: 'mass'|'volume', mass (g), volume (mL), n (mol), warnings }
   */
  function computeComponent(comp, volumeL) {
    const M = parseNum(comp.M);
    const conc = parseNum(comp.conc);
    const u = CONC_UNITS[comp.concUnit];
    const warnings = [];

    if (!(volumeL > 0)) return fail('Ungültiges Volumen');
    if (!u) return fail('Unbekannte Konzentrationseinheit');
    if (!(conc >= 0)) return fail('Konzentration fehlt');

    if (comp.form === 'stock') {
      const su = CONC_UNITS[comp.stockUnit];
      const stock = parseNum(comp.stockConc);
      if (!su) return fail('Unbekannte Einheit der Stammlösung');
      if (!(stock > 0)) return fail('Konzentration der Stammlösung fehlt');
      let target, source;
      if (u.kind === su.kind) {
        target = conc * u.f;
        source = stock * su.f;
      } else if (u.kind !== 'volume' && su.kind !== 'volume' && M > 0) {
        target = toMolar(conc, comp.concUnit, M);
        source = toMolar(stock, comp.stockUnit, M);
      } else {
        return fail('Zur Umrechnung zwischen Stoffmengen- und Massenkonzentration wird die molare Masse benötigt');
      }
      if (target > source + EPS) return fail('Zielkonzentration ist höher als die Stammlösung');
      const volume = (target / source) * volumeL * 1000;
      const n = u.kind === 'molar' ? conc * u.f * volumeL
        : (u.kind === 'mass' && M > 0 ? (conc * u.f * volumeL) / M : null);
      return { ok: true, measure: 'volume', volume, mass: null, n, warnings, dilution: source / target };
    }

    if (u.kind === 'volume') {
      if (comp.form !== 'liquid') return fail('% (v/v) ist nur für Flüssigkeiten sinnvoll');
      const volume = conc * u.f * volumeL;
      const density = parseNum(comp.density);
      const mass = density > 0 ? volume * density : null;
      const n = mass != null && M > 0 ? mass / M : null;
      return { ok: true, measure: 'volume', volume, mass, n, warnings };
    }

    let gPure, n;
    if (u.kind === 'molar') {
      if (!(M > 0)) return fail('Molare Masse fehlt');
      n = conc * u.f * volumeL;
      gPure = n * M;
    } else {
      gPure = conc * u.f * volumeL;
      n = M > 0 ? gPure / M : null;
    }

    let purity = parseNum(comp.purity);
    if (Number.isNaN(purity)) purity = 100;
    if (!(purity > 0 && purity <= 100)) return fail('Reinheit/Massenanteil muss zwischen 0 und 100 % liegen');
    const mass = gPure / (purity / 100);

    if (comp.form === 'liquid') {
      const density = parseNum(comp.density);
      if (!(density > 0)) return fail('Dichte fehlt');
      return { ok: true, measure: 'volume', volume: mass / density, mass, n, warnings };
    }
    return { ok: true, measure: 'mass', mass, volume: null, n, warnings };
  }

  function findNominal(table, mL) {
    return table.find(([nom]) => Math.abs(nom - mL) <= Math.max(EPS, nom * 1e-6)) || null;
  }

  /** Geeignetes Gefäß zum Auffüllen auf das Endvolumen. */
  function selectFlask(volumeMl) {
    const flask = findNominal(ISO1042, volumeMl);
    if (flask) {
      return { type: 'flask', label: `Messkolben ${fmt(flask[0], 0)} mL, Klasse A (ISO 1042)`, tol: flask[1] };
    }
    const cyl = ISO4788.find(([nom]) => nom >= volumeMl - EPS);
    if (cyl) {
      return {
        type: 'cylinder',
        label: `Messzylinder ${fmt(cyl[0], 0)} mL, Klasse A (ISO 4788)`,
        tol: cyl[1],
        note: 'Kein Nennvolumen nach ISO 1042 – für höchste Genauigkeit ein Messkolben-Normvolumen wählen.',
      };
    }
    return {
      type: 'none',
      label: 'Becherglas/Flasche, Volumen gravimetrisch oder in Teilmengen bestimmen',
      tol: null,
      note: 'Volumen größer als ISO-Normgefäße – in Teilmengen ansetzen oder gravimetrisch arbeiten.',
    };
  }

  /** Geeignetes Messmittel für ein Flüssigkeitsvolumen (mL). */
  function selectVolumeDevice(mL) {
    const uL = mL * 1000;
    if (!(mL > 0)) return null;
    if (uL < 0.2 - EPS) {
      return { label: 'zu klein zum Pipettieren', tol: null, warn: 'Unter 0,2 µL – Zwischenverdünnung (Stammlösung) verwenden.' };
    }
    const vp = findNominal(ISO648, mL);
    if (vp) {
      return { label: `Vollpipette ${fmt(vp[0], 0)} mL, Klasse A (ISO 648)`, tol: vp[1], decimals: 2, unit: 'mL' };
    }
    const pip = ISO8655.find((p) => uL >= p.min - EPS && uL <= p.max + EPS);
    if (pip) {
      const tolUl = (pip.err / 100) * pip.nominal;
      const nomLabel = pip.nominal >= 5000 ? `${pip.nominal / 1000} mL` : `${pip.nominal} µL`;
      const res = {
        label: `Kolbenhubpipette ${nomLabel} (ISO 8655)`,
        tol: tolUl / 1000,
        unit: uL < 1000 ? 'µL' : 'mL',
      };
      if (tolUl / uL > 0.05) res.warn = 'Am unteren Bereichsende – relative Abweichung > 5 %.';
      return res;
    }
    const cyl = ISO4788.find(([nom]) => nom >= mL - EPS);
    if (cyl) {
      const res = { label: `Messzylinder ${fmt(cyl[0], 0)} mL, Klasse A (ISO 4788)`, tol: cyl[1], unit: 'mL' };
      return res;
    }
    const big = ISO4788[ISO4788.length - 1];
    const times = Math.ceil(mL / big[0]);
    return {
      label: `Messzylinder ${fmt(big[0], 0)} mL (ISO 4788), ${times}× abmessen`,
      tol: big[1] * times,
      unit: 'mL',
      warn: 'Großes Volumen – ggf. gravimetrisch (Masse = Volumen × Dichte) abmessen.',
    };
  }

  /** Geeignete Waage für eine Einwaage (g). */
  function selectBalance(g) {
    if (!(g > 0)) return null;
    if (g < 0.001) {
      return { label: 'Mikrowaage (d = 0,001 mg)', d: 0.000001, decimals: 6, warn: 'Einwaage < 1 mg – Stammlösung ansetzen und verdünnen.' };
    }
    if (g < 0.01) {
      return { label: 'Semimikrowaage (d = 0,01 mg)', d: 0.00001, decimals: 5, warn: 'Kleine Einwaage – Stammlösung empfohlen.' };
    }
    if (g < 100) return { label: 'Analysenwaage (d = 0,1 mg)', d: 0.0001, decimals: 4 };
    if (g < 5000) return { label: 'Präzisionswaage (d = 0,01 g)', d: 0.01, decimals: 2 };
    return { label: 'Präzisionswaage (d = 0,1 g)', d: 0.1, decimals: 1 };
  }

  function fmt(x, decimals) {
    if (x == null || !Number.isFinite(x)) return '–';
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(x);
  }

  function fmtSig(x, sig = 4) {
    if (x == null || !Number.isFinite(x)) return '–';
    if (x === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(x)));
    const decimals = Math.max(0, Math.min(8, sig - 1 - mag));
    return fmt(x, decimals);
  }

  /** Volumenangabe passend zur Größenordnung (mL bzw. µL). */
  function fmtVolume(mL, unit) {
    if (mL == null || !Number.isFinite(mL)) return '–';
    const u = unit || (mL < 1 ? 'µL' : 'mL');
    if (u === 'µL') return `${fmtSig(mL * 1000, 4)} µL`;
    if (u === 'L') return `${fmtSig(mL / 1000, 4)} L`;
    return `${fmtSig(mL, 4)} mL`;
  }

  /** Fehlergrenze: ab 0,01 mL in mL, darunter in µL. */
  function fmtTol(mL) {
    if (mL == null || !Number.isFinite(mL)) return '–';
    return mL >= 0.01 ? `± ${fmtSig(mL, 2)} mL` : `± ${fmtSig(mL * 1000, 2)} µL`;
  }

  /** Masse gerundet auf die Ablesbarkeit der Waage, kleine Mengen zusätzlich in mg. */
  function fmtMass(g, balance) {
    if (g == null || !Number.isFinite(g)) return '–';
    const b = balance || selectBalance(g);
    const main = `${fmt(g, b ? b.decimals : 4)} g`;
    if (g < 1) return `${main} (${fmtSig(g * 1000, 4)} mg)`;
    return main;
  }

  function fmtVolumeLabel(value, unit) {
    return `${fmt(parseNum(value), Number.isInteger(parseNum(value)) ? 0 : 2)} ${unit}`;
  }

  /** Komplette Rezeptur für alle Volumina berechnen. */
  function computeRecipe(recipe) {
    const volumes = (recipe.volumes || [])
      .map((v) => ({ ...v, litres: toLitres(v.value, v.unit) }))
      .filter((v) => v.litres > 0);
    return volumes.map((v) => {
      const mL = v.litres * 1000;
      let liquidSum = 0;
      const items = (recipe.components || []).map((c) => {
        const r = computeComponent(c, v.litres);
        if (r.ok && r.measure === 'volume') {
          liquidSum += r.volume;
          r.device = selectVolumeDevice(r.volume);
        } else if (r.ok && r.measure === 'mass') {
          r.device = selectBalance(r.mass);
        }
        return { comp: c, result: r };
      });
      const warnings = [];
      if (liquidSum > mL + EPS) {
        warnings.push(`Summe der Flüssigkeitsvolumina (${fmtVolume(liquidSum)}) übersteigt das Endvolumen.`);
      }
      return {
        volume: v,
        volumeMl: mL,
        flask: selectFlask(mL),
        items,
        liquidSum,
        waterApprox: Math.max(0, mL - liquidSum),
        warnings,
      };
    });
  }

  return {
    CONC_UNITS, VOLUME_UNITS, ISO1042, ISO648, ISO4788, ISO8655,
    parseNum, toLitres, toMolar, computeComponent, computeRecipe,
    selectFlask, selectVolumeDevice, selectBalance,
    fmt, fmtSig, fmtVolume, fmtTol, fmtMass, fmtVolumeLabel,
  };
});
