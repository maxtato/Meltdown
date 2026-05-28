// Extrait pour chaque palier de chaque personnage :
//   - name.fr (titre affiché)
//   - desc.fr (desc courte sur la carte)
//   - longDesc.fr (narratif détaillé)
//   - thanks.fr (popup d'embauche, si existe dans UPGRADE_THANKS)
const fs = require('fs');
const src = fs.readFileSync('meltdown.tsx', 'utf8');

const characters = [
  { label: 'FRED · production',    tiers: ['fred_stage', 'fred', 'fred_perma', 'fred_chef', 'fred_dir', 'fred_legende'] },
  { label: 'BRIGITTE · admin',     tiers: ['autosell', 'brigitte_compta', 'brigitte_ad', 'brigitte_legende'] },
  { label: 'LENNY · transport',    tiers: ['camion_1', 'camion_2', 'camion_3', 'camion_4', 'camion_5', 'camion_6'] },
  { label: 'JANICE · marketing',   tiers: ['janice_jr', 'janice_senior', 'janice_dir'] },
  { label: 'KAREN · RH',           tiers: ['karen_junior', 'karen_senior', 'karen_drh'] },
  { label: 'MARK · achats',        tiers: ['mark_jr', 'mark_resp', 'mark_dir'] },
  { label: 'SABINE · juridique',   tiers: ['sabine_jr', 'sabine_sr', 'sabine_dg'] },
];

function findUpgradeLine(id) {
  // Cherche la ligne `{ id: 'xxx', ... }`
  const re = new RegExp(`\\{\\s*id:\\s*'${id}'[^\\n]*$`, 'm');
  const m = src.match(re);
  if (!m) return null;
  return m[0];
}
function findLongDescBlock(id) {
  // Le longDesc est sur la ligne suivante. On cherche les ~3 lignes après la déclaration.
  const idx = src.indexOf(`id: '${id}'`);
  if (idx < 0) return null;
  const slice = src.slice(idx, idx + 8000);
  const m = slice.match(/longDesc:\s*\{([\s\S]*?)\}\s*,/);
  if (!m) return null;
  return m[1];
}
function findThanks(id) {
  // Cherche `id: { speaker: '...', fr: "...", ... }` dans UPGRADE_THANKS
  const idx = src.indexOf('const UPGRADE_THANKS');
  if (idx < 0) return null;
  const block = src.slice(idx, idx + 60000);
  const re = new RegExp(`${id}:\\s*\\{\\s*speaker:[^\\n]*\\n\\s*fr:\\s*"([^"]+)"`, 'm');
  const m = block.match(re);
  return m ? m[1] : null;
}
function pickFr(text) {
  // Sur une ligne style `{ fr: '...', en: '...', ... }` ou `{ fr: "...", ... }`
  if (!text) return null;
  const m1 = text.match(/fr:\s*'([^']*)'/);
  if (m1) return m1[1];
  const m2 = text.match(/fr:\s*"([^"]*)"/);
  if (m2) return m2[1];
  return null;
}
function pickField(line, field) {
  if (!line) return null;
  // Cherche `field: { ... }` puis FR à l'intérieur
  const re = new RegExp(`${field}:\\s*\\{([^}]*)\\}`);
  const m = line.match(re);
  return m ? pickFr(m[1]) : null;
}

let out = '';
for (const c of characters) {
  out += `\n========================================\n${c.label}\n========================================\n`;
  for (const id of c.tiers) {
    const line = findUpgradeLine(id);
    const long = findLongDescBlock(id);
    const thanks = findThanks(id);
    const name = pickField(line, 'name');
    const desc = pickField(line, 'desc');
    const longFr = pickFr(long);
    out += `\n--- ${id} ---\n`;
    out += `NAME : ${name || '(?)'}\n`;
    out += `DESC : ${desc || '(?)'}\n`;
    out += `LONG : ${longFr || '(?)'}\n`;
    out += `THANKS : ${thanks || '(aucun)'}\n`;
  }
}
fs.writeFileSync('personnel-export.txt', out);
console.log(out);
