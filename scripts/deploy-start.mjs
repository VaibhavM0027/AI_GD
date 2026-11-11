import { spawnSync } from "node:child_process";

// A freshly provisioned database has the schema but no accounts, so the
// documented sign-in details only work once the seed has run. Render boots this
// file and its shell is not always reachable, so seed here the first time and
// leave an already provisioned database untouched. A seed failure is reported
// but must never stop the server from booting.
const seed = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env: { ...process.env, SEED_SKIP_IF_PROVISIONED: "1" },
});

if (seed.status !== 0) {
  console.warn(
    "[deploy] Account seeding failed. Set SEED_PASSWORD (at least 16 characters) in the service environment and redeploy, or run `npm run seed` in the shell.",
  );
}

await import("./start-production.mjs");
