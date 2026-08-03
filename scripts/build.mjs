// Wraps `next build` so dev-only routes are physically absent from Vercel
// builds -- not merely gated behind a runtime flag they could still ship
// inside. `VERCEL` is set to "1" by Vercel's build environment on every
// deployment (production AND preview), so this fires for both.
//
// Move-then-restore (not delete): if this is ever run locally via
// `VERCEL=1 npm run build` or `vercel build` to reproduce a Vercel build,
// the `finally` guarantees the directory is put back even if `next build`
// itself fails -- a plain prebuild/postbuild npm script pair can't offer
// that guarantee, since npm skips postbuild when the build script fails.
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const DEV_ONLY_DIRS = ["app/dev-login"];
const isVercelBuild = process.env.VERCEL === "1";

function quarantinePath(dir) {
  return `.${dir.replace(/\//g, "-")}.build-quarantine`;
}

function moveAside() {
  for (const dir of DEV_ONLY_DIRS) {
    if (existsSync(dir)) {
      renameSync(dir, quarantinePath(dir));
      console.log(`[build] Vercel build: removed ${dir} (dev-only route).`);
    }
  }
}

function restore() {
  for (const dir of DEV_ONLY_DIRS) {
    const quarantined = quarantinePath(dir);
    if (existsSync(quarantined)) {
      renameSync(quarantined, dir);
      console.log(`[build] Restored ${dir}.`);
    }
  }
}

if (isVercelBuild) {
  moveAside();
}

let result;
try {
  result = spawnSync("next", ["build", "--turbopack"], {
    stdio: "inherit",
    shell: true,
  });
} finally {
  if (isVercelBuild) {
    restore();
  }
}

process.exit(result?.status ?? 1);
