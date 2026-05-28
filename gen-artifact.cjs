// Génère meltdown.artifact.tsx (mono-fichier pour l'artifact Claude) :
//  - imports React + lucide (lignes 1-12 de meltdown.tsx)
//  - polyfill window.storage
//  - i18n.ts inliné (export const -> const)
//  - contracts.ts inliné (export const -> const)
//  - reste de meltdown.tsx (sans les 2 imports ./i18n et ./contracts)
const fs = require('fs');

const md = fs.readFileSync('meltdown.tsx', 'utf8').split('\n');

// Vérifs de structure : lignes 13/14 = imports ./i18n et ./contracts
const l13 = md[12], l14 = md[13];
if (!/from '\.\/i18n'/.test(l13) || !/from '\.\/contracts'/.test(l14)) {
  console.error('STRUCTURE INATTENDUE: ligne13=', l13, ' ligne14=', l14);
  process.exit(1);
}

const header = md.slice(0, 12).join('\n');       // imports React + lucide (1-12)
const body = md.slice(14).join('\n');            // tout après les 2 imports inlinés

const polyfill = `if (typeof window !== 'undefined' && !(window as any).storage) {
  (window as any).storage = {
    get: async (k: string) => { const v = localStorage.getItem(k); return v == null ? null : { value: v }; },
    set: async (k: string, v: string) => { localStorage.setItem(k, v); },
    delete: async (k: string) => { localStorage.removeItem(k); },
  };
}`;

let i18n = fs.readFileSync('i18n.ts', 'utf8');
if (!/export const TRANSLATIONS/.test(i18n)) { console.error('i18n: export introuvable'); process.exit(1); }
i18n = i18n.replace('export const TRANSLATIONS', 'const TRANSLATIONS');

let contracts = fs.readFileSync('contracts.ts', 'utf8');
if (!/export const B2B_CONTRACTS/.test(contracts)) { console.error('contracts: export introuvable'); process.exit(1); }
contracts = contracts.replace('export const B2B_CONTRACTS', 'const B2B_CONTRACTS');

const out = [
  header,
  '',
  polyfill,
  '',
  '// i18n inliné',
  i18n.trimEnd(),
  '',
  '// contracts inlinés',
  contracts.trimEnd(),
  '',
  body,
].join('\n');

fs.writeFileSync('meltdown.artifact.tsx', out);
console.log('artifact écrit:', out.length, 'octets');
