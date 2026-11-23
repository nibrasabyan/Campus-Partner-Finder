// Memeriksa semua href/src lokal di HTML dan target *.html di JS menunjuk ke file yang ada.
// Jalankan: node tests/links.test.js
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (['tests', 'docs', 'node_modules', '.git'].includes(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(f)) files.push(p);
  }
})(root);

let bad = 0, checked = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const refs = new Set();
  if (file.endsWith('.html')) {
    for (const m of src.matchAll(/(?:href|src)="([^"]+)"/g)) refs.add(m[1]);
  }
  for (const m of src.matchAll(/['"]([a-z-]+\.html)(?:[?#][^'"]*)?['"]/g)) refs.add(m[1]);
  for (const ref of refs) {
    if (/^(https?:|#|mailto:|data:)/.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) continue;
    checked++;
    if (!fs.existsSync(path.join(root, clean))) { bad++; console.log('RUSAK:', path.relative(root, file), '->', ref); }
  }
}
console.log(`Diperiksa ${checked} referensi di ${files.length} file, rusak: ${bad}`);
process.exit(bad ? 1 : 0);
