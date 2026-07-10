const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 回答期限によるロック判定
// 期限日の当日いっぱい（日本時間）までは回答可能で、翌日0時以降はロックする
export function isAnswerLocked(
  deadline: Date | string | null | undefined,
  lockAfterDeadline: boolean | undefined,
  now: Date = new Date(),
): boolean {
  if (!lockAfterDeadline || !deadline) return false;

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;

  // 期限を日本時間の暦日に変換し、その翌日0時（JST）をロック開始時刻とする
  const jst = new Date(d.getTime() + JST_OFFSET_MS);
  const lockStart =
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + 1) -
    JST_OFFSET_MS;

  return now.getTime() >= lockStart;
}
