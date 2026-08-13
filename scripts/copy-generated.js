// tsc only compiles/emits .ts files — it never copies the plain .js/.d.ts files Prisma
// generates into apps/api/src/generated. Without this, `nest build`/`nest start` (which
// use tsc, not webpack, per nest-cli.json) produce a dist that's missing the Prisma client
// at runtime. Run this once after building/before starting the api app.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [{ from: 'apps/api/src/generated', to: 'dist/apps/api/generated' }];

for (const { from, to } of targets) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-generated] skipping ${from} — not found (run prisma:generate first?)`);
    continue;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`[copy-generated] ${from} -> ${to}`);
}
