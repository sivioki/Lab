/* Puffer-Rechner – Oberfläche */
(function () {
  'use strict';

  const C = window.PufferCalc;
  const D = window.PufferData;
  const $ = (sel) => document.querySelector(sel);
  const STORE_KEY = 'puffer-rechner.rezepturen';

  const FORMS = {
    solid: 'Feststoff',
    liquid: 'Flüssigkeit',
    stock: 'Stammlösung',
  };
  const CONC_UNIT_LIST = Object.keys(C.CONC_UNITS);
  const STOCK_UNIT_LIST = CONC_UNIT_LIST.filter((u) => C.CONC_UNITS[u].kind !== 'volume');

  let uid = 0;
  const newId = () => `c${++uid}`;

  const defaultComponent = () => ({
    id: newId(), name: '', M: '', form: 'solid', conc: '', concUnit: 'mmol/L',
    purity: '100', density: '', stockConc: '', stockUnit: 'mol/L',
  });

  const state = {
    name: '', ph: '', temp: '20', operator: '', batch: '', notes: '',
    components: [defaultComponent()],
    volumes: [
      { value: '100', unit: 'mL' },
      { value: '250', unit: 'mL' },
      { value: '500', unit: 'mL' },
      { value: '1', unit: 'L' },
    ],
  };

  const numStr = (x) => (x == null || x === '' ? '' : String(x).replace('.', ','));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Rezeptur-Eingabe ----------

  function options(list, selected, labels) {
    return list.map((v) => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(labels ? labels[v] : v)}</option>`).join('');
  }

  function renderComponents() {
    const box = $('#components');
    box.innerHTML = state.components.map((c, i) => {
      const isStock = c.form === 'stock';
      const isLiquid = c.form === 'liquid';
      return `
      <div class="comp" data-id="${c.id}">
        <label class="f-name">Komponente ${i + 1}
          <input data-k="name" list="chem-list" value="${esc(c.name)}" placeholder="Chemikalie suchen oder eingeben">
        </label>
        <label>M (g/mol)
          <input data-k="M" inputmode="decimal" value="${esc(numStr(c.M))}" placeholder="z. B. 58,44">
        </label>
        <label>Form
          <select data-k="form">${options(Object.keys(FORMS), c.form, FORMS)}</select>
        </label>
        <label>Zielkonz.
          <input data-k="conc" inputmode="decimal" value="${esc(numStr(c.conc))}" placeholder="Wert">
        </label>
        <label>Einheit
          <select data-k="concUnit">${options(CONC_UNIT_LIST, c.concUnit)}</select>
        </label>
        ${isStock ? `
        <label class="f-stock">Stammlösung c₁
          <span class="pair">
            <input data-k="stockConc" inputmode="decimal" value="${esc(numStr(c.stockConc))}" placeholder="Wert">
            <select data-k="stockUnit">${options(STOCK_UNIT_LIST, c.stockUnit)}</select>
          </span>
        </label>` : `
        <label title="Reinheit bzw. Massenanteil w laut Etikett">${isLiquid ? 'w (%)' : 'Reinheit (%)'}
          <input data-k="purity" inputmode="decimal" value="${esc(numStr(c.purity))}" placeholder="100">
        </label>
        <label class="${isLiquid ? '' : 'hidden'}">ρ (g/mL)
          <input data-k="density" inputmode="decimal" value="${esc(numStr(c.density))}" placeholder="z. B. 1,19" ${isLiquid ? '' : 'tabindex="-1"'}>
        </label>`}
        <div class="f-del"><button type="button" class="btn icon" data-del="${c.id}" title="Komponente entfernen" aria-label="Komponente ${i + 1} entfernen">✕</button></div>
      </div>`;
    }).join('');
  }

  function findComp(id) {
    return state.components.find((c) => c.id === id);
  }

  function applyChemical(comp, chem) {
    comp.M = chem.M;
    comp.form = chem.form;
    comp.purity = chem.purity != null ? chem.purity : 100;
    comp.density = chem.density != null ? chem.density : '';
  }

  function onComponentInput(e) {
    const el = e.target;
    const k = el.dataset.k;
    if (!k) return;
    const comp = findComp(el.closest('.comp').dataset.id);
    comp[k] = el.value;

    if (k === 'name' && e.type === 'change') {
      const chem = D.CHEMICALS.find((x) => x.name.toLowerCase() === el.value.trim().toLowerCase());
      if (chem) {
        comp.name = chem.name;
        applyChemical(comp, chem);
        renderComponents();
      }
    }
    if (k === 'form') renderComponents();
    if (k === 'concUnit' && el.value === '% (v/v)' && comp.form === 'solid') {
      comp.form = 'liquid';
      renderComponents();
    }
    update();
  }

  // ---------- Volumina ----------

  function volumeKey(v) {
    return C.toLitres(v.value, v.unit);
  }

  function renderVolumes() {
    const sorted = state.volumes.slice().sort((a, b) => volumeKey(a) - volumeKey(b));
    state.volumes = sorted;
    $('#volumes').innerHTML = sorted.length
      ? sorted.map((v, i) => `<span class="chip">${esc(C.fmtVolumeLabel(v.value, v.unit))}<button type="button" data-vdel="${i}" class="no-print" aria-label="Volumen entfernen">✕</button></span>`).join('')
      : '<span class="hint">Noch kein Volumen – bitte unten eingeben.</span>';

    const present = new Set(sorted.map((v) => Math.round(volumeKey(v) * 1e9)));
    $('#iso-quick').innerHTML = C.ISO1042.map(([nom]) => {
      const L = nom / 1000;
      const label = nom >= 1000 ? `${C.fmt(nom / 1000, 0)} L` : `${nom} mL`;
      const active = present.has(Math.round(L * 1e9));
      return `<button type="button" data-quick="${nom}" class="${active ? 'active' : ''}" aria-pressed="${active}">${label}</button>`;
    }).join('');
  }

  function addVolume(value, unit) {
    const L = C.toLitres(value, unit);
    if (!(L > 0)) {
      toast('Bitte ein gültiges Volumen eingeben');
      return false;
    }
    const key = Math.round(L * 1e9);
    if (state.volumes.some((v) => Math.round(volumeKey(v) * 1e9) === key)) {
      toast('Volumen ist bereits vorhanden');
      return false;
    }
    state.volumes.push({ value: String(C.parseNum(value)), unit });
    return true;
  }

  function toggleQuick(nomMl) {
    const key = Math.round((nomMl / 1000) * 1e9);
    const idx = state.volumes.findIndex((v) => Math.round(volumeKey(v) * 1e9) === key);
    if (idx >= 0) state.volumes.splice(idx, 1);
    else state.volumes.push(nomMl >= 1000 ? { value: String(nomMl / 1000), unit: 'L' } : { value: String(nomMl), unit: 'mL' });
  }

  // ---------- Ergebnis ----------

  function concLabel(c) {
    const v = C.parseNum(c.conc);
    return Number.isFinite(v) ? `${C.fmtSig(v, 4)} ${c.concUnit}` : '–';
  }

  function amountText(r) {
    if (!r.ok) return `<span class="err-text">${esc(r.error)}</span>`;
    if (r.measure === 'mass') return `<span class="amount">${esc(C.fmtMass(r.mass, r.device))}</span>`;
    const unit = r.device && r.device.unit;
    return `<span class="amount">${esc(C.fmtVolume(r.volume, unit))}</span>`;
  }

  function actionWord(r) {
    if (!r.ok) return '';
    return r.measure === 'mass' ? 'einwiegen' : (r.dilution ? 'Stammlösung pipettieren' : 'abmessen');
  }

  function toleranceText(r) {
    if (!r.ok || !r.device) return '';
    if (r.measure === 'mass') {
      const rel = r.device.d / r.mass;
      return `${C.fmtSig(rel * 100, 2)} % (d/m)`;
    }
    if (r.device.tol == null) return '';
    const rel = r.device.tol / r.volume;
    return `${C.fmtTol(r.device.tol)} (${C.fmtSig(rel * 100, 2)} %)`;
  }

  function renderOverview(results) {
    const comps = state.components.filter((c) => c.name || c.conc);
    if (!results.length || !comps.length) {
      $('#overview').innerHTML = '<p class="hint">Komponenten und Volumen eingeben, um die Mengen zu berechnen.</p>';
      return;
    }
    const head = results.map((r) => `<th class="num">${esc(C.fmtVolumeLabel(r.volume.value, r.volume.unit))}</th>`).join('');
    const rows = state.components.map((c, i) => {
      const cells = results.map((res) => {
        const it = res.items[i];
        return `<td class="num">${amountText(it.result)}</td>`;
      }).join('');
      return `<tr><td>${esc(c.name || `Komponente ${i + 1}`)}<span class="meta-line">${esc(concLabel(c))} · ${esc(FORMS[c.form])}</span></td>${cells}</tr>`;
    }).join('');
    const water = results.map((res) => `<td class="num">ad ${esc(C.fmtVolumeLabel(res.volume.value, res.volume.unit))}</td>`).join('');
    $('#overview').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Komponente</th>${head}</tr></thead>
          <tbody>${rows}<tr><td>Wasser (ISO 3696)<span class="meta-line">auffüllen bis zur Marke</span></td>${water}</tr></tbody>
        </table>
      </div>`;
  }

  function renderDetails(results) {
    if (!results.length) {
      $('#details').innerHTML = '';
      return;
    }
    $('#details').innerHTML = results.map((res, idx) => {
      const rows = res.items.map(({ comp, result: r }, i) => {
        const dev = r.ok && r.device ? r.device : null;
        const extra = [];
        if (r.ok && r.measure === 'volume' && r.mass != null && !r.dilution) extra.push(`entspricht ${C.fmtMass(r.mass)}`);
        if (r.ok && r.dilution) extra.push(`Verdünnung 1 : ${C.fmtSig(r.dilution, 4)}`);
        if (r.ok && r.n != null) extra.push(`n = ${C.fmtSig(r.n * 1000, 4)} mmol`);
        const warn = dev && dev.warn ? `<span class="warn-text">⚠ ${esc(dev.warn)}</span>` : '';
        return `<tr>
          <td>${esc(comp.name || `Komponente ${i + 1}`)}<span class="meta-line">${esc(concLabel(comp))}</span></td>
          <td class="num">${amountText(r)}<span class="meta-line">${esc(extra.join(' · '))}</span></td>
          <td>${esc(actionWord(r))}</td>
          <td>${dev ? esc(dev.label) : ''}${warn}</td>
          <td class="num">${esc(toleranceText(r))}</td>
        </tr>`;
      }).join('');
      const f = res.flask;
      const flaskTol = f.tol != null ? ` (${C.fmtTol(f.tol)})` : '';
      const msgs = [
        ...res.warnings.map((w) => `<div class="msg error">${esc(w)}</div>`),
        f.note ? `<div class="msg warn">${esc(f.note)}</div>` : '',
      ].join('');
      return `
      <details class="vol"${idx === 0 ? ' open' : ''}>
        <summary>${esc(C.fmtVolumeLabel(res.volume.value, res.volume.unit))} <span class="flask">${esc(f.label)}${esc(flaskTol)}</span></summary>
        <div class="body">
          ${msgs}
          <div class="table-wrap">
            <table>
              <thead><tr><th>Komponente</th><th class="num">Menge</th><th>Schritt</th><th>Messmittel</th><th class="num">Grenzwert</th></tr></thead>
              <tbody>${rows}
                <tr><td>Wasser (ISO 3696)</td><td class="num"><span class="amount">ad ${esc(C.fmtVolume(res.volumeMl))}</span><span class="meta-line">ca. ${esc(C.fmtVolume(res.waterApprox * 0.8))} vorlegen</span></td><td>auffüllen</td><td>${esc(f.label)}</td><td class="num">${f.tol != null ? esc(C.fmtTol(f.tol)) : ''}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </details>`;
    }).join('');
  }

  function renderProcedure() {
    const hasSolid = state.components.some((c) => c.form === 'solid');
    const hasLiquid = state.components.some((c) => c.form === 'liquid');
    const hasStock = state.components.some((c) => c.form === 'stock');
    const steps = [
      'Persönliche Schutzausrüstung tragen, Sicherheitsdatenblätter der Chemikalien beachten. Etiketten (Hydratstufe, Reinheit, Charge) mit den Eingaben abgleichen.',
      'Becherglas mit Rührfisch bereitstellen und ca. 70–80 % des Endvolumens Wasser (ISO 3696, mind. Qualität 3) vorlegen.',
    ];
    if (hasSolid) steps.push('Feststoffe auf der angegebenen Waage in ein Wägeschiffchen einwiegen (Waage nivelliert, justiert, tariert) und quantitativ überführen; Schiffchen nachspülen.');
    if (hasLiquid) steps.push('Flüssige Reagenzien mit dem angegebenen Messmittel abmessen. Konzentrierte Säuren/Laugen langsam ins Wasser geben, nie umgekehrt (Abzug).');
    if (hasStock) steps.push('Stammlösungen mit Pipette bzw. Messzylinder zudosieren; Pipettenspitze vorbenetzen.');
    steps.push('Rühren, bis alles gelöst ist.');
    const ph = state.ph.trim();
    const temp = state.temp.trim() || '20';
    if (ph) steps.push(`pH-Meter mit mind. zwei Pufferstandards kalibrieren. pH bei ${temp} °C kontrollieren (Ziel ${ph}) und – sofern die Rezeptur es vorsieht – mit Säure/Lauge tropfenweise einstellen; immer vor dem Auffüllen.`);
    steps.push('Lösung quantitativ in den angegebenen Messkolben (ISO 1042) überführen, Becherglas nachspülen, bei Justiertemperatur (20 °C) bis zur Ringmarke auffüllen (Meniskus-Unterkante auf Augenhöhe) und durch Umschwenken mischen.');
    if (state.notes.trim()) steps.push(state.notes.trim());
    steps.push('Gefäß beschriften: Bezeichnung, Konzentrationen, pH, Datum, Bearbeiter/in, Charge, Haltbarkeit.');
    $('#procedure').innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join('');
  }

  function renderPrintMeta() {
    const parts = [
      state.name && `<strong>${esc(state.name)}</strong>`,
      state.ph && `pH ${esc(state.ph)} (${esc(state.temp || '20')} °C)`,
      `Datum: ${new Date().toLocaleDateString('de-DE')}`,
      state.operator && `Bearbeiter/in: ${esc(state.operator)}`,
      state.batch && `Charge: ${esc(state.batch)}`,
    ].filter(Boolean);
    $('#print-meta').innerHTML = parts.join(' · ');
  }

  let lastResults = [];
  function update() {
    lastResults = C.computeRecipe(state);
    renderOverview(lastResults);
    renderDetails(lastResults);
    renderProcedure();
    renderPrintMeta();
    saveDraft();
  }

  // ---------- Export / Speichern ----------

  function serial() {
    return {
      name: state.name, ph: state.ph, temp: state.temp, notes: state.notes,
      components: state.components.map(({ id, ...rest }) => rest),
      volumes: state.volumes,
    };
  }

  function load(data) {
    if (!data || typeof data !== 'object') return;
    ['name', 'ph', 'temp', 'notes'].forEach((k) => { state[k] = data[k] != null ? String(data[k]) : (k === 'temp' ? '20' : ''); });
    state.components = (Array.isArray(data.components) && data.components.length ? data.components : [{}])
      .map((c) => ({ ...defaultComponent(), ...c, id: newId() }));
    if (Array.isArray(data.volumes)) state.volumes = data.volumes.filter((v) => C.toLitres(v.value, v.unit) > 0);
    syncMetaInputs();
    renderComponents();
    renderVolumes();
    update();
  }

  function syncMetaInputs() {
    ['name', 'ph', 'temp', 'operator', 'batch', 'notes'].forEach((k) => { $(`#${k}`).value = state[k] || ''; });
  }

  function loadPreset(p) {
    load({
      name: p.name, ph: p.ph, temp: '20', notes: p.notes,
      components: p.components.map((c) => ({ ...c, M: numStr(c.M), conc: numStr(c.conc), purity: numStr(c.purity), density: numStr(c.density), stockConc: numStr(c.stockConc) })),
      volumes: state.volumes,
    });
  }

  function encodeState() {
    const json = JSON.stringify(serial());
    return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  }

  function decodeState(b64) {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  function saveDraft() {
    storageSet(`${STORE_KEY}.entwurf`, { ...serial(), operator: state.operator, batch: state.batch });
  }

  function savedList() {
    const list = storageGet(STORE_KEY);
    return Array.isArray(list) ? list : [];
  }

  function renderSaved() {
    const list = savedList();
    $('#saved').innerHTML = '<option value="">Gespeichert …</option>'
      + list.map((r, i) => `<option value="${i}">${esc(r.name || `Rezeptur ${i + 1}`)}</option>`).join('')
      + (list.length ? '<option value="__del">Alle gespeicherten löschen</option>' : '');
    $('#saved').disabled = !list.length;
  }

  function saveRecipe() {
    const data = serial();
    if (!data.name) data.name = `Rezeptur ${new Date().toLocaleString('de-DE')}`;
    const list = savedList().filter((r) => r.name !== data.name);
    list.push(data);
    if (storageSet(STORE_KEY, list)) {
      renderSaved();
      toast(`„${data.name}“ gespeichert`);
    } else {
      toast('Speichern im Browser nicht möglich');
    }
  }

  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const rows = [['Rezeptur', state.name], ['pH', state.ph], ['Temperatur °C', state.temp], ['Datum', new Date().toLocaleDateString('de-DE')], ['Bearbeiter/in', state.operator], ['Charge', state.batch], []];
    rows.push(['Endvolumen', 'Komponente', 'M (g/mol)', 'Konzentration', 'Form', 'Menge', 'Einheit', 'Messmittel', 'Grenzwert']);
    lastResults.forEach((res) => {
      const vol = C.fmtVolumeLabel(res.volume.value, res.volume.unit);
      res.items.forEach(({ comp, result: r }) => {
        let amount = '';
        let unit = '';
        if (r.ok && r.measure === 'mass') { amount = C.fmt(r.mass, r.device.decimals); unit = 'g'; }
        if (r.ok && r.measure === 'volume') { amount = C.fmtSig(r.volume, 4); unit = 'mL'; }
        rows.push([vol, comp.name, numStr(comp.M), concLabel(comp), FORMS[comp.form], r.ok ? amount : r.error, unit, r.ok && r.device ? r.device.label : '', toleranceText(r)]);
      });
      rows.push([vol, 'Wasser (ISO 3696)', '', '', '', `ad ${C.fmtSig(res.volumeMl, 4)}`, 'mL', res.flask.label, res.flask.tol != null ? C.fmtTol(res.flask.tol) : '']);
    });
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${(state.name || 'puffer').replace(/[^\wäöüÄÖÜß-]+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function share() {
    const url = `${location.origin}${location.pathname}#r=${encodeState()}`;
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      toast('Link in die Zwischenablage kopiert');
    } catch (e) {
      toast('Link steht jetzt in der Adresszeile');
    }
  }

  // ---------- Initialisierung ----------

  function init() {
    $('#chem-list').innerHTML = D.CHEMICALS.map((c) => `<option value="${esc(c.name)}">${esc(`${C.fmt(c.M, 2)} g/mol`)}</option>`).join('');
    $('#preset').innerHTML += D.PRESETS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

    const comps = $('#components');
    comps.addEventListener('input', onComponentInput);
    comps.addEventListener('change', onComponentInput);
    comps.addEventListener('click', (e) => {
      const id = e.target.dataset.del;
      if (!id) return;
      state.components = state.components.filter((c) => c.id !== id);
      if (!state.components.length) state.components.push(defaultComponent());
      renderComponents();
      update();
    });

    ['name', 'ph', 'temp', 'operator', 'batch', 'notes'].forEach((k) => {
      $(`#${k}`).addEventListener('input', (e) => { state[k] = e.target.value; update(); });
    });

    $('#add-comp').addEventListener('click', () => {
      state.components.push(defaultComponent());
      renderComponents();
      update();
      const inputs = document.querySelectorAll('.comp .f-name input');
      inputs[inputs.length - 1].focus();
    });
    $('#clear').addEventListener('click', () => {
      if (!confirm('Rezeptur wirklich leeren?')) return;
      load({ components: [], volumes: state.volumes });
    });

    $('#preset').addEventListener('change', (e) => {
      const p = D.PRESETS.find((x) => x.id === e.target.value);
      if (p) loadPreset(p);
      e.target.value = '';
    });
    $('#saved').addEventListener('change', (e) => {
      const v = e.target.value;
      e.target.value = '';
      if (v === '__del') {
        if (confirm('Alle gespeicherten Rezepturen löschen?')) { storageSet(STORE_KEY, []); renderSaved(); }
        return;
      }
      const r = savedList()[Number(v)];
      if (r) load(r);
    });

    $('#vol-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (addVolume($('#vol-value').value, $('#vol-unit').value)) {
        $('#vol-value').value = '';
        renderVolumes();
        update();
      }
    });
    $('#volumes').addEventListener('click', (e) => {
      const i = e.target.dataset.vdel;
      if (i == null) return;
      state.volumes.splice(Number(i), 1);
      renderVolumes();
      update();
    });
    $('#iso-quick').addEventListener('click', (e) => {
      const nom = e.target.dataset.quick;
      if (!nom) return;
      toggleQuick(Number(nom));
      renderVolumes();
      update();
    });

    $('#save').addEventListener('click', saveRecipe);
    $('#share').addEventListener('click', share);
    $('#csv').addEventListener('click', exportCsv);
    $('#print').addEventListener('click', () => window.print());
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('details.vol').forEach((d) => { d.open = true; });
    });

    renderSaved();

    const m = location.hash.match(/^#r=(.+)$/);
    let initial = null;
    if (m) {
      try { initial = decodeState(m[1]); } catch (e) { toast('Link konnte nicht gelesen werden'); }
    }
    if (!initial) initial = storageGet(`${STORE_KEY}.entwurf`);
    if (initial) {
      state.operator = initial.operator || '';
      state.batch = initial.batch || '';
      load(initial);
    } else {
      loadPreset(D.PRESETS[0]);
    }
  }

  init();
})();
