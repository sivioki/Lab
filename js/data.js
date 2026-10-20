/*
 * Stammdaten: häufige Pufferchemikalien und Standardrezepturen.
 * Molare Massen in g/mol (IUPAC-Atommassen), Dichten in g/mL bei 20 °C,
 * Reinheit bzw. Massenanteil w in %. Werte vor Gebrauch mit dem Etikett /
 * Analysenzertifikat der verwendeten Charge abgleichen.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PufferData = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const s = (name, M, purity = 100) => ({ name, M, form: 'solid', purity });
  const l = (name, M, density, purity = 100) => ({ name, M, form: 'liquid', density, purity });

  const CHEMICALS = [
    s('Natriumchlorid (NaCl)', 58.44),
    s('Kaliumchlorid (KCl)', 74.55),
    s('Dinatriumhydrogenphosphat (Na2HPO4)', 141.96),
    s('Dinatriumhydrogenphosphat-Dihydrat (Na2HPO4·2H2O)', 177.99),
    s('Dinatriumhydrogenphosphat-Heptahydrat (Na2HPO4·7H2O)', 268.07),
    s('Dinatriumhydrogenphosphat-Dodecahydrat (Na2HPO4·12H2O)', 358.14),
    s('Natriumdihydrogenphosphat (NaH2PO4)', 119.98),
    s('Natriumdihydrogenphosphat-Monohydrat (NaH2PO4·H2O)', 137.99),
    s('Natriumdihydrogenphosphat-Dihydrat (NaH2PO4·2H2O)', 156.01),
    s('Kaliumdihydrogenphosphat (KH2PO4)', 136.09),
    s('Dikaliumhydrogenphosphat (K2HPO4)', 174.18),
    s('Tris(hydroxymethyl)aminomethan (Tris-Base)', 121.14),
    s('Tris-Hydrochlorid (Tris-HCl)', 157.60),
    s('HEPES', 238.30),
    s('MOPS', 209.26),
    s('MES-Monohydrat', 213.25),
    s('PIPES', 302.37),
    s('Glycin', 75.07),
    s('Bicin', 163.17),
    s('Tricin', 179.17),
    s('EDTA-Dinatriumsalz-Dihydrat (Na2EDTA·2H2O)', 372.24),
    s('EDTA (freie Säure)', 292.24),
    s('EGTA', 380.35),
    s('Natriumacetat (wasserfrei)', 82.03),
    s('Natriumacetat-Trihydrat', 136.08),
    s('Trinatriumcitrat-Dihydrat', 294.10),
    s('Citronensäure (wasserfrei)', 192.12),
    s('Citronensäure-Monohydrat', 210.14),
    s('Magnesiumchlorid-Hexahydrat (MgCl2·6H2O)', 203.30),
    s('Magnesiumsulfat-Heptahydrat (MgSO4·7H2O)', 246.47),
    s('Calciumchlorid-Dihydrat (CaCl2·2H2O)', 147.01),
    s('Natriumhydrogencarbonat (NaHCO3)', 84.01),
    s('Natriumcarbonat (Na2CO3)', 105.99),
    s('Borsäure (H3BO3)', 61.83),
    s('Natriumtetraborat-Decahydrat (Borax)', 381.37),
    s('Ammoniumsulfat ((NH4)2SO4)', 132.14),
    s('Ammoniumacetat', 77.08),
    s('Natriumdodecylsulfat (SDS)', 288.38),
    s('Dithiothreitol (DTT)', 154.25),
    s('Imidazol', 68.08),
    s('Harnstoff', 60.06),
    s('Guanidiniumchlorid', 95.53),
    s('D-Glucose', 180.16),
    s('Saccharose', 342.30),
    s('Natriumhydroxid (NaOH)', 40.00),
    s('Kaliumhydroxid (KOH)', 56.11, 85),
    s('Natriumazid (NaN3)', 65.01),
    l('Essigsäure 100 % (Eisessig)', 60.05, 1.049, 100),
    l('Salzsäure 37 %', 36.46, 1.19, 37),
    l('Salzsäure 32 %', 36.46, 1.16, 32),
    l('Salzsäure 25 %', 36.46, 1.12, 25),
    l('Schwefelsäure 96 %', 98.08, 1.84, 96),
    l('Phosphorsäure 85 %', 98.00, 1.685, 85),
    l('Salpetersäure 65 %', 63.01, 1.39, 65),
    l('Ammoniaklösung 25 %', 17.03, 0.91, 25),
    l('Natronlauge 50 %', 40.00, 1.52, 50),
    l('Glycerin 99,5 %', 92.09, 1.261, 99.5),
    l('Ethanol 99,8 %', 46.07, 0.789, 99.8),
    l('2-Mercaptoethanol', 78.13, 1.114, 99),
    l('Tween 20', 1227.5, 1.10, 100),
    l('Triton X-100', 625, 1.07, 100),
  ];

  const c = (name, conc, concUnit, extra = {}) => {
    const base = CHEMICALS.find((x) => x.name === name);
    return { ...(base || { name, form: 'solid', purity: 100 }), conc, concUnit, ...extra };
  };
  const stock = (name, conc, concUnit, stockConc, stockUnit, M) =>
    ({ name, M, form: 'stock', conc, concUnit, stockConc, stockUnit, purity: 100 });

  const PRESETS = [
    {
      id: 'pbs',
      name: 'PBS 1× (phosphatgepufferte Salzlösung)',
      ph: '7,4',
      notes: 'pH mit HCl bzw. NaOH einstellen. Autoklavieren oder sterilfiltrieren (0,22 µm).',
      components: [
        c('Natriumchlorid (NaCl)', 137, 'mmol/L'),
        c('Kaliumchlorid (KCl)', 2.7, 'mmol/L'),
        c('Dinatriumhydrogenphosphat (Na2HPO4)', 10, 'mmol/L'),
        c('Kaliumdihydrogenphosphat (KH2PO4)', 1.8, 'mmol/L'),
      ],
    },
    {
      id: 'tbs',
      name: 'TBS 1× (Tris-gepufferte Salzlösung)',
      ph: '7,6',
      notes: 'pH mit Salzsäure einstellen. Tris-pH ist stark temperaturabhängig (ca. −0,028 pH/K).',
      components: [
        c('Tris(hydroxymethyl)aminomethan (Tris-Base)', 50, 'mmol/L'),
        c('Natriumchlorid (NaCl)', 150, 'mmol/L'),
      ],
    },
    {
      id: 'tris1m',
      name: 'Tris-HCl 1 mol/L',
      ph: '8,0',
      notes: 'Ca. 70 % des Endvolumens vorlegen, mit Salzsäure 37 % auf Ziel-pH titrieren (exotherm, auf Raumtemperatur abkühlen lassen), dann auffüllen.',
      components: [c('Tris(hydroxymethyl)aminomethan (Tris-Base)', 1, 'mol/L')],
    },
    {
      id: 'tae50',
      name: 'TAE 50× (Elektrophorese)',
      ph: '8,3',
      notes: 'pH nicht einstellen (stellt sich ein). Für Gebrauch 1:50 verdünnen.',
      components: [
        c('Tris(hydroxymethyl)aminomethan (Tris-Base)', 2, 'mol/L'),
        c('Essigsäure 100 % (Eisessig)', 1, 'mol/L'),
        stock('EDTA-Lösung pH 8,0', 50, 'mmol/L', 0.5, 'mol/L', 372.24),
      ],
    },
    {
      id: 'tbe10',
      name: 'TBE 10× (Elektrophorese)',
      ph: '8,3',
      notes: 'pH nicht einstellen. Für Gebrauch 1:10 (bzw. 0,5×: 1:20) verdünnen.',
      components: [
        c('Tris(hydroxymethyl)aminomethan (Tris-Base)', 890, 'mmol/L'),
        c('Borsäure (H3BO3)', 890, 'mmol/L'),
        stock('EDTA-Lösung pH 8,0', 20, 'mmol/L', 0.5, 'mol/L', 372.24),
      ],
    },
    {
      id: 'te',
      name: 'TE-Puffer 1×',
      ph: '8,0',
      notes: 'Aus Stammlösungen ansetzen, autoklavieren.',
      components: [
        stock('Tris-HCl-Lösung pH 8,0', 10, 'mmol/L', 1, 'mol/L', 121.14),
        stock('EDTA-Lösung pH 8,0', 1, 'mmol/L', 0.5, 'mol/L', 372.24),
      ],
    },
    {
      id: 'edta05',
      name: 'EDTA 0,5 mol/L',
      ph: '8,0',
      notes: 'Löst sich erst ab pH ≈ 8: mit NaOH-Plätzchen bzw. Natronlauge unter Rühren auf pH 8,0 einstellen, dann auffüllen.',
      components: [c('EDTA-Dinatriumsalz-Dihydrat (Na2EDTA·2H2O)', 0.5, 'mol/L')],
    },
    {
      id: 'phosphat',
      name: 'Natriumphosphatpuffer 0,1 mol/L',
      ph: '7,4',
      notes: 'Verhältnis HPO4²⁻ : H2PO4⁻ ≈ 81 : 19 ergibt pH ≈ 7,4 (25 °C); pH kontrollieren und ggf. nachstellen.',
      components: [
        c('Dinatriumhydrogenphosphat (Na2HPO4)', 81, 'mmol/L'),
        c('Natriumdihydrogenphosphat-Monohydrat (NaH2PO4·H2O)', 19, 'mmol/L'),
      ],
    },
    {
      id: 'acetat',
      name: 'Natriumacetat 3 mol/L',
      ph: '5,2',
      notes: 'pH mit Eisessig einstellen.',
      components: [c('Natriumacetat-Trihydrat', 3, 'mol/L')],
    },
    {
      id: 'citrat',
      name: 'Citratpuffer 10 mmol/L',
      ph: '6,0',
      notes: 'pH mit NaOH bzw. HCl einstellen. Für Antigen-Demaskierung mit 0,05 % Tween 20.',
      components: [
        c('Trinatriumcitrat-Dihydrat', 10, 'mmol/L'),
        c('Tween 20', 0.05, '% (v/v)'),
      ],
    },
    {
      id: 'hepes',
      name: 'HEPES 1 mol/L',
      ph: '7,5',
      notes: 'pH mit NaOH einstellen, sterilfiltrieren.',
      components: [c('HEPES', 1, 'mol/L')],
    },
  ];

  return { CHEMICALS, PRESETS };
});
