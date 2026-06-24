const DEFAULT_MFA_EXCLUDED_EMAILS = "guest@carpool.demo";

function parseCsv(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminMfaRequired() {
  return process.env.NEXT_PUBLIC_ADMIN_MFA_REQUIRED === "true";
}

export function shouldRequireAdminMfa(email: string | null | undefined) {
  if (!isAdminMfaRequired()) return false;
  if (!email) return true;

  const excludedEmails = parseCsv(
    process.env.NEXT_PUBLIC_ADMIN_MFA_EXCLUDED_EMAILS ??
      DEFAULT_MFA_EXCLUDED_EMAILS,
  );

  return !excludedEmails.has(email.toLowerCase());
}
