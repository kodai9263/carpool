export const DEFAULT_LOGIN_MAX_FAILURES = 5;
export const DEFAULT_LOGIN_LOCK_MINUTES = 30;

type HeaderReader = {
  get(name: string): string | null;
};

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getClientIp(headers: HeaderReader) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    "unknown"
  );
}

export function getLoginMaxFailures() {
  const value = Number(process.env.ADMIN_LOGIN_MAX_FAILURES);
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_LOGIN_MAX_FAILURES;
}

export function getLoginLockMinutes() {
  const value = Number(process.env.ADMIN_LOGIN_LOCK_MINUTES);
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_LOGIN_LOCK_MINUTES;
}

export function getLockedUntil(
  nextFailedCount: number,
  now: Date,
  maxFailures = DEFAULT_LOGIN_MAX_FAILURES,
  lockMinutes = DEFAULT_LOGIN_LOCK_MINUTES,
) {
  if (nextFailedCount < maxFailures) return null;
  return new Date(now.getTime() + lockMinutes * 60 * 1000);
}

export function isCurrentlyLocked(
  lockedUntil: Date | string | null | undefined,
  now: Date,
) {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now.getTime();
}

export function getRemainingLoginFailures(
  failedCount: number,
  maxFailures = DEFAULT_LOGIN_MAX_FAILURES,
) {
  return Math.max(maxFailures - failedCount, 0);
}
