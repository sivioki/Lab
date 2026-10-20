// Erzeugt eine einzelne, eigenständige HTML-Datei (CSS und JS inline) zur
// Veröffentlichung als claude.ai-Seite.  Aufruf: node tools/build-artifact.js <ziel.html>
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const out = process.argv[2] || path.join(root, 'puffer-rechner.html');

const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src='));
const scripts = ['js/calc.js', 'js/data.js', 'js/app.js'].map(read);

const page = [
  '<title>Puffer-Rechner</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<style>\n${read('css/style.css')}</style>`,
  body.trim(),
  '<script>window.PUFFER_EMBED = true;</script>',
  ...scripts.map((s) => `<script>\n${s}</script>`),
].join('\n');

fs.writeFileSync(out, page);
console.log(`${out} (${(page.length / 1024).toFixed(1)} KB)`);
