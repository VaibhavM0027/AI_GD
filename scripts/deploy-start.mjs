import { spawnSync } from "node:child_process";

// A freshly provisioned database has the schema but no accounts, so the
// documented sign-in details only work once the seed has run. Render boots this
// file, so seed here the first time and leave an already provisioned database
// untouched. A seed failure is reported but must never stop the server from
// booting: the create-account buttons on /login do the same job without any
// environment value, which is the simpler path when SEED_PASSWORD is unset.
const seed = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env: { ...process.env, SEED_SKIP_IF_PROVISIONED: "1" },
});

if (seed.status !== 0) {
  console.warn(
    "[deploy] Account seeding was skipped. Either set SEED_PASSWORD (at least 16 characters) in the service environment and redeploy, or open /login and use the create host / create participant buttons.",
  );
}

await import("./start-production.mjs");
