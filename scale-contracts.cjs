// Multiplie qty × 1.5 sur tous les contrats B2B (arrondi entier).
// Le truck max actuel (camion_6 = 16000) supporte les 10000×1.5 = 15000.
const fs = require('fs');
let txt = fs.readFileSync('contracts.ts', 'utf8');
const before = new Map();
let count = 0;
txt = txt.replace(/qty: ?(\d+)/g, (m, n) => {
  const orig = parseInt(n, 10);
  const next = Math.round(orig * 1.5);
  before.set(orig, (before.get(orig) || 0) + 1);
  count++;
  return `qty: ${next}`;
});
fs.writeFileSync('contracts.ts', txt);
console.log(`Modified: ${count} contrats`);
console.log('Distribution avant ×1.5 (qty: nb) :');
[...before.entries()].sort((a, b) => a[0] - b[0]).forEach(([q, n]) => console.log(`  ${q.toString().padStart(6)} ×${n} → ${Math.round(q * 1.5)}`));
