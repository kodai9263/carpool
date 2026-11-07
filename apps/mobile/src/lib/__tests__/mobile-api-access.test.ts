import { adminGet, adminPost, adminPut, deleteAccount, publicPost, verifyApplePurchase } from '../api';
import { setMobileWriteAccess } from '../mobile-write-access';

jest.mock('../config', () => ({ env: { apiBaseUrl: 'https://fixture.example.test' } }));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  setMobileWriteAccess(null);
  global.fetch = mockFetch;
  mockFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ status: 'OK' }) });
});
afterAll(() => { global.fetch = originalFetch; setMobileWriteAccess(null); });

test('未確認・未契約の更新操作はサーバーへ送らない', async () => {
  await expect(adminPost('/api/admin/teams', 'free-token', {})).rejects.toThrow(/契約状況/);
  await expect(adminPut('/api/admin/ride/1', 'free-token', {})).rejects.toThrow(/契約状況/);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('確認済みtokenのみ保存でき、再確認中や古い確認ダイアログからの更新は拒否する', async () => {
  setMobileWriteAccess('paid-token');
  await adminPost('/api/admin/teams', 'paid-token', {});
  expect(mockFetch).toHaveBeenCalledTimes(1);
  await expect(adminPut('/api/admin/ride/1', 'different-token', {})).rejects.toThrow(/契約状況/);
  setMobileWriteAccess(null);
  await expect(adminPut('/api/admin/ride/1', 'paid-token', {})).rejects.toThrow(/契約状況/);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test('未契約でも管理者の認証確認と契約状況の取得は可能', async () => {
  await publicPost('/api/auth/ensure-admin', 'token');
  const abort = new AbortController();
  await adminGet('/api/admin/billing/status', 'token', { signal: abort.signal, cache: 'no-store' });
  expect(mockFetch).toHaveBeenLastCalledWith('https://fixture.example.test/api/admin/billing/status', expect.objectContaining({ signal: abort.signal, cache: 'no-store' }));
});

test('未契約でもApple購入を認証付き専用APIへ送り、通常の更新制限は維持する', async () => {
  await verifyApplePurchase('new-user-token', { signedTransaction: 'fixture.jws', transactionId: 't1' });
  expect(mockFetch).toHaveBeenCalledWith('https://fixture.example.test/api/admin/billing/apple/transactions', expect.objectContaining({
    method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer new-user-token' }),
    body: JSON.stringify({ signedTransaction: 'fixture.jws', transactionId: 't1' }),
  }));
  await expect(adminPost('/api/admin/teams', 'new-user-token', {})).rejects.toThrow(/契約状況/);
});

test('未契約でも本人のアカウント削除を認証付きで送信でき、通常の更新制限は維持する', async () => {
  await deleteAccount('free-token');
  expect(mockFetch).toHaveBeenCalledWith('https://fixture.example.test/api/admin/me', expect.objectContaining({
    method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer free-token' }),
  }));
  await expect(adminPost('/api/admin/teams', 'free-token', {})).rejects.toThrow(/契約状況/);
});
