import { calculatePagination } from "../pagination"

describe('calculatePagination', () => {
  test('正常な値で正しく計算する', () => {
    const result = calculatePagination({
      page: 2,
      perPage: 10,
      total: 50,
    });

    expect(result.page).toBe(2);
    expect(result.perPage).toBe(10);
    expect(result.skip).toBe(10);
    expect(result.totalPages).toBe(5);
  });

  test('pageが未指定の場合、デフォルト値1を使う', () => {
    const result = calculatePagination({
      perPage: 10,
      total: 50,
    });

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  test('perPageが未指定の場合,デフォルト値5を使う', () => {
    const result = calculatePagination({
      page: 1,
      total: 50,
    });

    expect(result.perPage).toBe(5);
    expect(result.totalPages).toBe(10);
  });

  test('pageが0以下の場合、1として扱う', () => {
    const result = calculatePagination({
      page: 0,
      perPage: 10,
      total: 50,
    });

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  test('pageが負の数の場合、1として扱う', () => {
    const result = calculatePagination({
      page: -1,
      perPage: 10,
      total: 50,
    });

    expect(result.page).toBe(1);
  });

  test('perPageが50を超える場合、50に制限される', () => {
    const result = calculatePagination({
      page: 1,
      perPage: 51,
      total: 105,
    });

    expect(result.perPage).toBe(50);
    expect(result.totalPages).toBe(3);
  });

  test('文字列のpage/perPageを正しく変換する', () => {
    const result = calculatePagination({
      page: '3',
      perPage: '15',
      total: 100,
    });

    expect(result.page).toBe(3);
    expect(result.perPage).toBe(15);
    expect(result.skip).toBe(30);
  });

  test('少数のpageは切り捨てられる', () => {
    const result = calculatePagination({
      page: 2.7,
      perPage: 10,
      total: 50,
    });

    expect(result.page).toBe(2);
  });

  test('totalが0の場合、totalPageは1になる', () => {
    const result = calculatePagination({
      page: 1,
      perPage: 10,
      total: 0,
    });

    expect(result.totalPages).toBe(1);
  });

  test('totalが perPage で割り切れない場合、切り上げる', () => {
    const result = calculatePagination({
      page: 1,
      perPage: 10,
      total: 47,
    });

    expect(result.totalPages).toBe(5);
  });

  test('無効な文字列(NaN)の場合、デフォルト値を使う', () => {
    const result = calculatePagination({
      page: 'invalid',
      perPage: 'abc',
      total: 50.
    });

    expect(result.page).toBe(1);
    expect(result.perPage).toBe(5);
  });
});