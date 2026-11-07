import type { Session } from '@supabase/supabase-js';
import { createSessionVerifier, passwordError } from '../authSession';

const session = (id: string, token: string) => ({ user: { id }, access_token: token }) as Session;

test('管理者確認が終わるまでセッションを画面へ渡さない', async () => {
  let finish!: () => void;
  const verify = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const update = jest.fn();
  const verifier = createSessionVerifier(verify, update);
  const pending = verifier.accept(session('admin', 'initial'));
  expect(update).toHaveBeenLastCalledWith({ session: null, isLoading: true, error: null });
  finish();
  await pending;
  expect(update).toHaveBeenLastCalledWith({ session: session('admin', 'initial'), isLoading: false, error: null });
});

test('同一ユーザーのtoken更新でloadingや未ログイン状態を挟まない', async () => {
  const verify = jest.fn().mockResolvedValue(undefined);
  const update = jest.fn();
  const verifier = createSessionVerifier(verify, update);
  await verifier.accept(session('admin', 'initial'));
  update.mockClear();
  await verifier.accept(session('admin', 'refreshed'));
  expect(verify).toHaveBeenCalledTimes(1);
  expect(update.mock.calls).toEqual([[{ session: session('admin', 'refreshed'), isLoading: false, error: null }]]);
});

test('別ユーザーのログインは再検証し、遅い古い結果で上書きしない', async () => {
  let finishOld!: () => void;
  const verify = jest.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finishOld = resolve; })).mockResolvedValue(undefined);
  const update = jest.fn();
  const verifier = createSessionVerifier(verify, update);
  const oldRequest = verifier.accept(session('old', 'old-token'));
  await verifier.accept(session('new', 'new-token'));
  finishOld();
  await oldRequest;
  expect(update).toHaveBeenLastCalledWith({ session: session('new', 'new-token'), isLoading: false, error: null });
});

test('ログアウト後に遅れて返る検証結果で再ログインしない', async () => {
  let finish!: () => void;
  const update = jest.fn();
  const verifier = createSessionVerifier(() => new Promise<void>((resolve) => { finish = resolve; }), update);
  const pending = verifier.accept(session('admin', 'token'));
  await verifier.accept(null);
  finish();
  await pending;
  expect(update).toHaveBeenLastCalledWith({ session: null, isLoading: false, error: null });
});

test('確認失敗はセッションを公開せず、再試行成功後のみ公開する', async () => {
  const verify = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const update = jest.fn();
  const verifier = createSessionVerifier(verify, update);
  await verifier.accept(session('admin', 'token'));
  expect(update).toHaveBeenLastCalledWith({ session: null, isLoading: false, error: expect.any(String) });
  await verifier.accept(session('admin', 'token'));
  expect(verify).toHaveBeenCalledTimes(2);
  expect(update).toHaveBeenLastCalledWith({ session: session('admin', 'token'), isLoading: false, error: null });
});

test('破棄済みの検証結果を画面へ通知しない', async () => {
  let finish!: () => void;
  const update = jest.fn();
  const verifier = createSessionVerifier(() => new Promise<void>((resolve) => { finish = resolve; }), update);
  const pending = verifier.accept(session('admin', 'token'));
  verifier.dispose();
  update.mockClear();
  finish();
  await pending;
  expect(update).not.toHaveBeenCalled();
});

test('パスワードの長さと確認入力を検証する', () => {
  expect(passwordError('short', 'short')).toMatch(/8文字/);
  expect(passwordError('long-enough', 'different')).toMatch(/一致/);
  expect(passwordError('long-enough', 'long-enough')).toBeNull();
});
