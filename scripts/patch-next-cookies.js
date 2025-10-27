// scripts/patch-next-cookies.js
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const NM = path.join(ROOT, "node_modules");
if (!fs.existsSync(NM)) {
  console.error("node_modules não encontrado. Rode pnpm install.");
  process.exit(1);
}

// heurísticas de substituição
function fixSource(src) {
  let changed = false;

  // 1) Trocar cookies(<qualquer coisa>) -> cookies()
  const r1 = /(\b)cookies\s*\([^)]*\)/g;
  if (r1.test(src)) {
    src = src.replace(r1, 'require("next/headers").cookies()');
    changed = true;
  }

  // 2) Normalizar acesso .get(name) -> ?.get(name)?.value
  // Evita quebrar req.cookies.get; tentamos mirar quando o alvo é resultado de cookies()
  // Aprox: `.cookies().get(` ou `).cookies().get(`
  const r2 = /(\.cookies\(\)\s*)\.get\s*\(\s*([^)]+)\s*\)/g;
  if (r2.test(src)) {
    src = src.replace(r2, '$1?.get($2)?.value');
    changed = true;
  }

  return { src, changed };
}

const touchedFiles = [];
const touchedPkgs = new Set();

function pkgNameFromPath(p) {
  const i = p.indexOf(`node_modules${path.sep}`);
  if (i === -1) return null;
  const rest = p.slice(i + `node_modules${path.sep}`.length);
  const parts = rest.split(path.sep);
  if (!parts.length) return null;
  if (parts[0].startsWith("@") && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    let st;
    try { st = fs.statSync(p); } catch { continue; }

    if (st.isDirectory()) {
      if (f === ".bin") continue;
      walk(p);
    } else {
      if (!/\.(m?js|cjs|jsbundle)$/.test(f)) continue;
      let src;
      try { src = fs.readFileSync(p, "utf8"); } catch { continue; }

      if (!src.includes("cookies(") && !src.includes(".cookies()")) continue;

      const before = src;
      const { src: after, changed } = fixSource(src);
      if (changed) {
        try {
          fs.writeFileSync(p, after, "utf8");
          touchedFiles.push(p);
          const pkg = pkgNameFromPath(p);
          if (pkg) touchedPkgs.add(pkg);
        } catch (e) {
          console.error("Falha ao escrever patch em", p, e.message);
        }
      }
    }
  }
}

console.log("> Varredura em node_modules…");
walk(NM);
console.log(`> Arquivos alterados: ${touchedFiles.length}`);
touchedFiles.forEach(p => console.log(" -", p));

if (!touchedFiles.length) {
  console.log("Nenhum alvo encontrado. Ok.");
  process.exit(0);
}

for (const pkg of touchedPkgs) {
  try {
    console.log("> Gerando patch para", pkg);
    cp.execSync(`npx patch-package "${pkg}"`, { stdio: "inherit" });
  } catch (e) {
    console.error("Falha ao gerar patch para", pkg, e.message);
  }
}
console.log("> Patches prontos na pasta patches/");

