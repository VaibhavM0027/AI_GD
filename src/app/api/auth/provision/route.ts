import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientKey, fail, guardOrigin, json, rateLimit, readBody } from "@/lib/http";
import { DEMO_PARTICIPANT_EMAIL, DEMO_PARTICIPANT_NAME, HOST_EMAIL } from "@/lib/roles";

const provisionSchema = z
  .object({
    role: z.enum(["HOST", "PARTICIPANT"]),
    password: z.string().min(8).max(80),
  })
  .strict();

const accounts = {
  HOST: { email: HOST_EMAIL, name: "Host", label: "Host" },
  PARTICIPANT: { email: DEMO_PARTICIPANT_EMAIL, name: DEMO_PARTICIPANT_NAME, label: "Participant" },
} as const;

const alreadyExists = (label: string) => fail(`The ${label.toLowerCase()} account already exists. Sign in with it instead.`, 409);

export async function POST(request: Request) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;
  if (!rateLimit(`provision:${clientKey(request)}`, 8, 600_000)) return fail("Too many attempts. Wait a few minutes.", 429);
  const parsed = provisionSchema.safeParse(await readBody(request));
  if (!parsed.success) return fail("Choose an account and enter a password of at least 8 characters.");
  const account = accounts[parsed.data.role];
  // These buttons only fill in an account that is missing. One that already exists is
  // left exactly as it is, so a visitor cannot reset a password its owner chose.
  if (await prisma.user.findUnique({ where: { email: account.email }, select: { id: true } })) return alreadyExists(account.label);
  try {
    await prisma.user.create({
      data: {
        email: account.email,
        name: account.name,
        role: parsed.data.role,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return alreadyExists(account.label);
    console.error("Account provisioning failed.", error);
    return fail("Could not create the account right now. Please try again.", 500);
  }
  return json({ ok: true, email: account.email, label: account.label, next: parsed.data.role === "HOST" ? "/host" : "/participant" });
}
