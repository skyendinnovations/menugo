// Ensures all packages inside node_modules/.bun/ have top-level symlinks.
// Bun doesn't always hoist transitive deps, which breaks Metro/Babel resolution.
const f = require('fs'), p = require('path');
const n = p.resolve(__dirname, '..', 'node_modules');
const b = p.join(n, '.bun');
if (!f.existsSync(b)) process.exit(0);
for (const d of f.readdirSync(b)) {
  const m = p.join(b, d, 'node_modules');
  if (!f.existsSync(m) || !f.statSync(m).isDirectory()) continue;
  for (const k of f.readdirSync(m)) {
    const s = p.join(m, k);
    if (k.startsWith('@')) {
      if (!f.statSync(s).isDirectory()) continue;
      const c = p.join(n, k);
      if (!f.existsSync(c)) f.mkdirSync(c, { recursive: true });
      for (const x of f.readdirSync(s)) {
        const t = p.join(c, x);
        if (!f.existsSync(t)) try { f.symlinkSync(p.join(s, x), t); } catch {}
      }
    } else {
      const t = p.join(n, k);
      if (!f.existsSync(t)) try { f.symlinkSync(s, t); } catch {}
    }
  }
}
