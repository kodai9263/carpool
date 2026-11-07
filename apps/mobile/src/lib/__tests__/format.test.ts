import { toRideDateInput } from '../format';

test('存在しない日付と不正形式を受け付けない', () => {
  for (const value of ['2026-02-30', '2026-02-29', '2026-13-01', '2026/10/04', '']) {
    expect(toRideDateInput(value)).toBeNull();
  }
});

test('うるう日と日本時間の午前0時を正しく扱う', () => {
  expect(toRideDateInput('2028-02-29')).toBe('2028-02-28T15:00:00.000Z');
  expect(toRideDateInput(' 2026-10-04 ')).toBe('2026-10-03T15:00:00.000Z');
});
