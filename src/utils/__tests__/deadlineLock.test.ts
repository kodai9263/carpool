import { isAnswerLocked } from "../deadlineLock";

describe("isAnswerLocked", () => {
  // 期限: 2026-07-10（date inputの保存値はUTC 0時 = JST 9時）
  const deadline = new Date("2026-07-10T00:00:00.000Z");

  it("ロック設定がOFFなら期限を過ぎてもロックしない", () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    expect(isAnswerLocked(deadline, false, now)).toBe(false);
    expect(isAnswerLocked(deadline, undefined, now)).toBe(false);
  });

  it("期限が未設定ならロックしない", () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    expect(isAnswerLocked(null, true, now)).toBe(false);
    expect(isAnswerLocked(undefined, true, now)).toBe(false);
  });

  it("期限日の当日中（JST）はロックしない", () => {
    // 2026-07-10 23:59 JST = 2026-07-10 14:59 UTC
    const now = new Date("2026-07-10T14:59:00.000Z");
    expect(isAnswerLocked(deadline, true, now)).toBe(false);
  });

  it("期限日の翌日0時（JST）以降はロックする", () => {
    // 2026-07-11 00:00 JST = 2026-07-10 15:00 UTC
    const now = new Date("2026-07-10T15:00:00.000Z");
    expect(isAnswerLocked(deadline, true, now)).toBe(true);
  });

  it("期限日より前はロックしない", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(isAnswerLocked(deadline, true, now)).toBe(false);
  });

  it("文字列の期限（ISO形式）でも判定できる", () => {
    const now = new Date("2026-07-10T15:00:00.000Z");
    expect(isAnswerLocked("2026-07-10T00:00:00.000Z", true, now)).toBe(true);
  });

  it("不正な日付文字列はロックしない", () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    expect(isAnswerLocked("invalid-date", true, now)).toBe(false);
  });
});
