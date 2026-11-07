import { createPurchaseProcessor, processRestoredPurchases, purchaseErrorMessage, readApplePurchaseConfig, type ApplePurchaseConfig, type StorePurchase } from '../purchases';

const config: ApplePurchaseConfig = { configured: true, canPurchase: true, appAccountToken: '11111111-1111-4111-8111-111111111111', products: { monthly: 'pro.monthly', yearly: 'pro.yearly' }, hasAppleSubscription: false, hasWebSubscription: false };
const purchase: StorePurchase = { id: 't1', transactionId: 't1', productId: 'pro.monthly', purchaseState: 'purchased', appAccountToken: config.appAccountToken, purchaseToken: 'fixture.signed.transaction', raw: {} };
const account = { userId: 'user-a', token: 'token-a', config };

test('サーバーの検証・保存完了まで取引を完了しない', async () => {
  let saved!: (value: { status: 'OK'; mobileAccess: boolean }) => void;
  const verify = jest.fn(() => new Promise<{ status: 'OK'; mobileAccess: boolean }>((resolve) => { saved = resolve; }));
  const finish = jest.fn().mockResolvedValue(undefined);
  const onVerified = jest.fn();
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify, finish, onVerified });
  const pending = process(purchase, account);
  expect(verify).toHaveBeenCalledWith('token-a', { signedTransaction: purchase.purchaseToken, transactionId: 't1' });
  expect(finish).not.toHaveBeenCalled();
  saved({ status: 'OK', mobileAccess: true });
  expect(await pending).toBe('active');
  expect(finish).toHaveBeenCalledTimes(1);
  expect(onVerified).toHaveBeenCalledTimes(1);
});

test('保存失敗ではfinishせず、復元から再試行できる', async () => {
  const verify = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 'OK', mobileAccess: true });
  const finish = jest.fn().mockResolvedValue(undefined);
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify, finish, onVerified: jest.fn() });
  await expect(process(purchase, account)).rejects.toThrow('offline');
  expect(finish).not.toHaveBeenCalled();
  expect(await process(purchase, account)).toBe('active');
  expect(finish).toHaveBeenCalledTimes(1);
});

test('listenerと復元から同じ取引が同時に届いても二重に保存・完了しない', async () => {
  let saved!: (value: { status: 'OK'; mobileAccess: boolean }) => void;
  const verify = jest.fn(() => new Promise<{ status: 'OK'; mobileAccess: boolean }>((resolve) => { saved = resolve; }));
  const finish = jest.fn().mockResolvedValue(undefined);
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify, finish, onVerified: jest.fn() });
  const first = process(purchase, account);
  const duplicate = process(purchase, account);
  expect(first).toBe(duplicate);
  expect(verify).toHaveBeenCalledTimes(1);
  saved({ status: 'OK', mobileAccess: true });
  await Promise.all([first, duplicate]);
  expect(finish).toHaveBeenCalledTimes(1);
});

test('確認中のアカウント切替後は旧購入を完了・反映しない', async () => {
  let owner: string | null = 'user-a';
  let saved!: (value: { status: 'OK'; mobileAccess: boolean }) => void;
  const verify = jest.fn(() => new Promise<{ status: 'OK'; mobileAccess: boolean }>((resolve) => { saved = resolve; }));
  const finish = jest.fn();
  const onVerified = jest.fn();
  const process = createPurchaseProcessor({ currentUserId: () => owner, verify, finish, onVerified });
  const pending = process(purchase, account);
  owner = 'user-b';
  saved({ status: 'OK', mobileAccess: true });
  expect(await pending).toBe('ignored');
  expect(finish).not.toHaveBeenCalled();
  expect(onVerified).not.toHaveBeenCalled();
});

test('承認待ち・対象外商品・別アカウントの購入に権限を与えない', async () => {
  const verify = jest.fn();
  const finish = jest.fn();
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify, finish, onVerified: jest.fn() });
  expect(await process({ ...purchase, purchaseState: 'pending' }, account)).toBe('pending');
  expect(await process({ ...purchase, productId: 'other.app' }, account)).toBe('ignored');
  await expect(process({ ...purchase, appAccountToken: 'another-user' }, account)).rejects.toThrow(/別のCarpool/);
  expect(verify).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
});

test('期限切れ・返金済みの復元でサーバーがfalseを返したら有効化しない', async () => {
  const finish = jest.fn().mockResolvedValue(undefined);
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify: async () => ({ status: 'OK', mobileAccess: false }), finish, onVerified: jest.fn() });
  expect(await process(purchase, account)).toBe('inactive');
  expect(finish).toHaveBeenCalledTimes(1);
});

test('不正な検証応答では取引完了しない', async () => {
  const finish = jest.fn();
  const verify = jest.fn().mockResolvedValue({ status: 'OK' });
  const process = createPurchaseProcessor({ currentUserId: () => 'user-a', verify, finish, onVerified: jest.fn() });
  await expect(process(purchase, account)).rejects.toThrow(/保存結果/);
  expect(finish).not.toHaveBeenCalled();
});

test('購入キャンセルと承認待ちは日本語で区別する', () => {
  expect(purchaseErrorMessage({ code: 'user-cancelled' })).toMatch(/キャンセル/);
  expect(purchaseErrorMessage({ code: 'deferred-payment' })).toMatch(/承認/);
  expect(purchaseErrorMessage(new Error('unavailable'))).toMatch(/購入を復元/);
});

test('商品とアカウントが検証可能な設定だけ受け付ける', () => {
  expect(readApplePurchaseConfig({ status: 'OK', apple: config })).toEqual(config);
  expect(() => readApplePurchaseConfig({ status: 'OK', apple: { configured: true, canPurchase: true } })).toThrow();
  expect(() => readApplePurchaseConfig({ status: 'OK', apple: { ...config, appAccountToken: 'bad' } })).toThrow();
  expect(() => readApplePurchaseConfig({ status: 'OK', apple: { ...config, products: { monthly: 'same', yearly: 'same' } } })).toThrow();
});

test('復元履歴に別アカウントの購入があっても、現在の購入の確認を続ける', async () => {
  const process = jest.fn().mockRejectedValueOnce(new Error('different account')).mockResolvedValueOnce('active');
  const result = await processRestoredPurchases([{ ...purchase, id: 'old' }, purchase], process);
  expect(process).toHaveBeenCalledTimes(2);
  expect(result.active).toBe(true);
  expect(result.failures).toHaveLength(1);
});
