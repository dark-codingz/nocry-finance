// scripts/patch-cookies.js
const fs = require('fs');
const path = require('path');
const child = require('child_process');

const root = process.cwd();
const nm = path.join(root, 'node_modules');

if (!fs.existsSync(nm)) {
  console.error('node_modules não encontrado. Rode npm install antes.');
  process.exit(1);
}

const touchedFiles = [];
const touchedPkgs = new Set();

function pkgNameFromPath(p) {
  const i = p.indexOf('node_modules' + path.sep);
  if (i === -1) return null;
  const rest = p.slice(i + ('node_modules'+path.sep).length);
  const parts = rest.split(path.sep);
  if (!parts.length) return null;
  // Suporta escopo @scope/pkg
  if (parts[0].startsWith('@') && parts.length >= 2) {
    return parts[0] + '/' + parts[1];
  }
  return parts[0];
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      // pular diretórios grandes irrelevantes
      if (f === '.bin' || f === '.cache') continue;
      walk(p);
    } else {
      if (!/\.(m?js|cjs|jsbundle)$/.test(f)) continue;
      let src;
      try { src = fs.readFileSync(p, 'utf8'); } catch { continue; }

      if (src.includes('this.context.cookies(')) {
        const before = src;

        // 1) cookies(any) -> cookies()
        src = src.replace(
          /this\.context\.cookies\s*\([^)]*\)/g,
          '(this.context && typeof this.context.cookies==="function" ? this.context.cookies() : require("next/headers").cookies())'
        );

        // 2) Normalizar .get(name) para acessar .value quando objeto
        //    Fica: ?.get(name)?.value  (mantém compatibilidade com string se houver)
        src = src.replace(
          /\.get\s*\(\s*([^)]+)\s*\)/g,
          '?.get($1)?.value'
        );

        if (src !== before) {
          try {
            fs.writeFileSync(p, src, 'utf8');
            touchedFiles.push(p);
            const pkg = pkgNameFromPath(p);
            if (pkg) touchedPkgs.add(pkg);
          } catch (e) {
            console.error('Falha ao escrever patch em', p, e);
          }
        }
      }
    }
  }
}

console.log('> Varredura iniciada em node_modules...');
walk(nm);
console.log('> Arquivos alterados:', touchedFiles.length);
touchedFiles.forEach(f => console.log(' -', f));

if (!touchedFiles.length) {
  console.log('Nenhum arquivo com "this.context.cookies(" encontrado.');
  process.exit(0);
}

// Gerar patch-package para cada pacote tocado
for (const pkg of touchedPkgs) {
  try {
    console.log('> Gerando patch-package para', pkg);
    child.execSync(`npx patch-package "${pkg}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Falha ao gerar patch para', pkg, e.message);
  }
}

console.log('> Patches gerados. Verifique a pasta patches/.');

