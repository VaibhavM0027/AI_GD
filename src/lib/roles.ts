export const HOST_EMAIL = "karthiksathish1820@gmail.com";

// The demo participant account is created both by the deploy seed and by the
// create-account buttons on the sign-in page, so both must use the same address.
export const DEMO_PARTICIPANT_EMAIL = process.env.SEED_PARTICIPANT_EMAIL?.trim() || "participant@quorum.local";
export const DEMO_PARTICIPANT_NAME = "Rahul Iyer";

export type AccountRole = "HOST" | "PARTICIPANT";

export function authorizedRole(email: string, storedRole: AccountRole): AccountRole {
  return storedRole === "HOST" && email.trim().toLowerCase() === HOST_EMAIL
    ? "HOST"
    : "PARTICIPANT";
}
