import { z } from "zod";

const AdminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters"),
});

export type AdminEnvValidation =
  | { ok: true; email: string; maskedEmail: string }
  | { ok: false; errors: string[] };

export function validateAdminEnv(): AdminEnvValidation {
  const result = AdminEnvSchema.safeParse({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  });
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) };
  }
  const email = result.data.ADMIN_EMAIL;
  const [local, domain] = email.split("@");
  const maskedEmail = `${local[0]}***@${domain}`;
  return { ok: true, email, maskedEmail };
}
