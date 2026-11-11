import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { HOST_EMAIL } from "../src/lib/roles";

const prisma = new PrismaClient();
const participantEmail = process.env.SEED_PARTICIPANT_EMAIL || "participant@quorum.local";
const password = process.env.SEED_PASSWORD;

async function upsert(email: string, name: string, role: "HOST" | "PARTICIPANT") {
  // A deploy must never overwrite a password the account owner already chose, so
  // an account that exists only has its name and role re-asserted.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && process.env.SEED_SKIP_IF_PROVISIONED === "1") {
    await prisma.user.update({ where: { email }, data: { name, role } });
    console.log(`Kept the existing password for ${email}.`);
    return;
  }
  if (!password || password.length < 16 || password.startsWith("replace-with-") || password === "Quorum-demo-2026") {
    throw new Error("Set a unique SEED_PASSWORD of at least 16 characters before provisioning accounts.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  if (participantEmail.toLowerCase() === HOST_EMAIL) {
    throw new Error("SEED_PARTICIPANT_EMAIL must be different from the fixed host email.");
  }
  await prisma.user.updateMany({
    where: { role: "HOST", email: { not: HOST_EMAIL } },
    data: { role: "PARTICIPANT" },
  });
  await upsert(HOST_EMAIL, "Host", "HOST");
  await upsert(participantEmail, "Rahul Iyer", "PARTICIPANT");
  console.log(`Seeded host ${HOST_EMAIL} and participant ${participantEmail}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
