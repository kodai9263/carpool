import { formatDate } from '../formatDate';

describe('formatDate', () => {
  test('文字列の日付を正しくフォーマットする', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('2024/01/15/月');
  });

  test('Dateオブジェクトを正しくフォーマットする', () => {
    const date = new Date('2024-03-20');
    const result = formatDate(date);
    expect(result).toBe('2024/03/20/水');
  });

  test('1桁の月と日を0パディングする', () => {
    const result = formatDate('2024-01-05');
    expect(result).toBe('2024/01/05/金');
  });

  test('日曜日を正しく表示する', () => {
    const result = formatDate('2024-01-14');
    expect(result).toBe('2024/01/14/日');
  });

  test('土曜日を正しく表示する', () => {
    const result = formatDate('2024-01-13');
    expect(result).toBe('2024/01/13/土');
  });

  test('12月31日を正しく処理する', () => {
    const result = formatDate('2024-12-31');
    expect(result).toBe('2024/12/31/火');
  });
})