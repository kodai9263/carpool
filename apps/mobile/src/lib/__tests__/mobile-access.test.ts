import { createMobileAccessController, readMobileAccess } from '../mobile-access';

const response = (mobileAccess: boolean) => ({ status: 'OK', billing: { mobileAccess } });

test.each([
  undefined, null, {}, { status: 'OK', billing: { isPro: true, isPaidPro: true } },
  { status: 'OK', billing: { mobileAccess: 'true' } },
  { status: 'ERROR', billing: { mobileAccess: true } },
])('旧API・欠損・不正な応答をアクセス許可に使わない: %j', (value) => {
  expect(() => readMobileAccess(value)).toThrow();
});

test('明示的なmobileAccessだけを採用し、無料体験や無料枠は参照しない', () => {
  expect(readMobileAccess(response(true))).toBe(true);
  expect(readMobileAccess({ ...response(false), autoAssign: { isExempt: true, canUseAutoAssign: true }, isPro: true })).toBe(false);
});

test('再確認で失効したらロックし、画面を保持する状態だけ残す', async () => {
  const update = jest.fn();
  const fetchStatus = jest.fn().mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(false));
  const controller = createMobileAccessController({ fetchStatus, onChange: update });
  await controller.check('a', 'token');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'allowed', hasOpened: true });
  const pending = controller.check('a', 'token');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'checking', hasOpened: true });
  await pending;
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'locked', hasOpened: true });
});

test('確認失敗は開放せず、再試行成功でのみ利用可能になる', async () => {
  const update = jest.fn();
  const fetchStatus = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(true));
  const controller = createMobileAccessController({ fetchStatus, onChange: update });
  await controller.check('a', 'token');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'error', hasOpened: false });
  await controller.check('a', 'token');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'allowed', hasOpened: true });
});

test('アカウント切替で前ユーザーの開放状態と遅い応答を引き継がない', async () => {
  let finish!: (value: unknown) => void;
  const fetchStatus = jest.fn().mockResolvedValueOnce(response(true))
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValueOnce(response(false));
  const update = jest.fn();
  const controller = createMobileAccessController({ fetchStatus, onChange: update });
  await controller.check('a', 'a-token');
  const old = controller.check('a', 'a-token');
  await controller.check('b', 'b-token');
  finish(response(true));
  await old;
  expect(update).toHaveBeenLastCalledWith({ userId: 'b', status: 'locked', hasOpened: false });
});

test('ログアウト後に返る契約確認結果で再開放しない', async () => {
  let finish!: (value: unknown) => void;
  const update = jest.fn();
  const controller = createMobileAccessController({
    fetchStatus: () => new Promise((resolve) => { finish = resolve; }), onChange: update,
  });
  const pending = controller.check('a', 'token');
  controller.suspend(null);
  finish(response(true));
  await pending;
  expect(update).toHaveBeenLastCalledWith({ userId: null, status: 'checking', hasOpened: false });
});

test('バックグラウンド移行は許可を取り消し、入力を保って復帰時に再確認できる', async () => {
  const update = jest.fn();
  const controller = createMobileAccessController({ fetchStatus: async () => response(true), onChange: update });
  await controller.check('a', 'token');
  controller.suspend('a');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'checking', hasOpened: true });
  await controller.check('a', 'token');
  expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'allowed', hasOpened: true });
});

test('応答しない通信も時間切れで再試行可能になる', async () => {
  jest.useFakeTimers();
  try {
    const update = jest.fn();
    const fetchStatus = jest.fn(() => new Promise<unknown>(() => {}));
    const controller = createMobileAccessController({ fetchStatus, onChange: update, timeoutMs: 10 });
    const pending = controller.check('a', 'token');
    jest.advanceTimersByTime(11);
    await pending;
    expect(update).toHaveBeenLastCalledWith({ userId: 'a', status: 'error', hasOpened: false });
    expect(fetchStatus.mock.calls[0][1].aborted).toBe(true);
  } finally { jest.useRealTimers(); }
});
