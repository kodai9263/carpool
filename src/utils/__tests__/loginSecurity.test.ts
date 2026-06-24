import {
  DEFAULT_LOGIN_LOCK_MINUTES,
  DEFAULT_LOGIN_MAX_FAILURES,
  getClientIp,
  getLockedUntil,
  getRemainingLoginFailures,
  isCurrentlyLocked,
  normalizeLoginEmail,
} from "../loginSecurity";

describe("loginSecurity helpers", () => {
  test("normalizes login email", () => {
    expect(normalizeLoginEmail("  TEST@Example.COM ")).toBe("test@example.com");
  });

  test("uses the first x-forwarded-for IP address", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
    });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  test("falls back to unknown when no IP headers exist", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  test("locks only when the next failed count reaches the limit", () => {
    const now = new Date("2026-06-24T00:00:00.000Z");

    expect(getLockedUntil(DEFAULT_LOGIN_MAX_FAILURES - 1, now)).toBeNull();
    expect(getLockedUntil(DEFAULT_LOGIN_MAX_FAILURES, now)?.toISOString()).toBe(
      new Date(
        now.getTime() + DEFAULT_LOGIN_LOCK_MINUTES * 60 * 1000,
      ).toISOString(),
    );
  });

  test("detects current lock state", () => {
    const now = new Date("2026-06-24T00:00:00.000Z");

    expect(
      isCurrentlyLocked(new Date("2026-06-24T00:29:00.000Z"), now),
    ).toBe(true);
    expect(
      isCurrentlyLocked(new Date("2026-06-23T23:59:00.000Z"), now),
    ).toBe(false);
  });

  test("calculates remaining failures without negative values", () => {
    expect(getRemainingLoginFailures(0)).toBe(DEFAULT_LOGIN_MAX_FAILURES);
    expect(getRemainingLoginFailures(DEFAULT_LOGIN_MAX_FAILURES + 1)).toBe(0);
  });
});
