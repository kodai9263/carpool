import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { PurchaseProvider, usePurchases } from '../../contexts/purchases';
import type { StorePurchase } from '../purchases';

jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('../../contexts/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../contexts/mobile-access', () => ({ useMobileAccess: () => ({ retry: mockRetry }) }));
jest.mock('../api', () => ({ adminGet: (...args: unknown[]) => mockGet(...args), verifyApplePurchase: (...args: unknown[]) => mockVerify(...args) }));
jest.mock('../purchase-store', () => ({ connectPurchaseStore: (...args: unknown[]) => mockConnect(...args), purchasePlatformMessage: 'iPhone版で利用できます。' }));

let mockAuth: { session: { user: { id: string } } | null; token: string | null; isLoading: boolean };
const mockRetry = jest.fn();
const mockGet = jest.fn();
const mockVerify = jest.fn();
const mockConnect = jest.fn();
let listener: (purchase: StorePurchase) => void;
let errorListener: (cause: unknown) => void;
let promotedListener: (id: string) => void;
const store = {
  products: jest.fn(), purchase: jest.fn(), pending: jest.fn(), restore: jest.fn(), finish: jest.fn(), manage: jest.fn(), close: jest.fn(),
};
const config = { configured: true, canPurchase: true, appAccountToken: '11111111-1111-4111-8111-111111111111', products: { monthly: 'pro.monthly', yearly: 'pro.yearly' }, hasAppleSubscription: false, hasWebSubscription: false };
const purchase: StorePurchase = { id: 't1', transactionId: 't1', productId: 'pro.monthly', purchaseState: 'purchased', appAccountToken: config.appAccountToken, purchaseToken: 'fixture.jws', raw: {} };
const wrapper = ({ children }: { children: ReactNode }) => <PurchaseProvider>{children}</PurchaseProvider>;
const settle = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { session: { user: { id: 'user-a' } }, token: 'token-a', isLoading: false };
  mockGet.mockReset().mockResolvedValue({ status: 'OK', apple: config });
  mockVerify.mockReset().mockResolvedValue({ status: 'OK', mobileAccess: true });
  mockConnect.mockReset().mockImplementation(async (onPurchase: typeof listener, onError: typeof errorListener, onPromoted: typeof promotedListener) => { listener = onPurchase; errorListener = onError; promotedListener = onPromoted; return store; });
  store.products.mockReset().mockResolvedValue([{ id: 'pro.monthly', title: 'Pro', displayPrice: '¥300', period: 'month' }]);
  store.pending.mockReset().mockResolvedValue([]);
  store.restore.mockReset().mockResolvedValue([purchase]);
  store.purchase.mockReset().mockResolvedValue(undefined);
  store.finish.mockReset().mockResolvedValue(undefined);
  store.close.mockReset().mockResolvedValue(undefined);
  store.manage.mockReset().mockResolvedValue(undefined);
});

test('非対応環境では購入ストアを要求せず案内を表示する', async () => {
  mockConnect.mockResolvedValue(null);
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  expect(result.current.loading).toBe(false);
  expect(result.current.supported).toBe(false);
  expect(result.current.message).toMatch(/iPhone/);
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(store.purchase).not.toHaveBeenCalled();
});

test('listenerの保存失敗後も購入は完了せず、復元で再送して権限を再確認する', async () => {
  mockVerify.mockRejectedValueOnce(new Error('再試行してください')).mockResolvedValue({ status: 'OK', mobileAccess: true });
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { listener(purchase); });
  expect(result.current.error).toMatch(/再試行/);
  expect(store.finish).not.toHaveBeenCalled();
  expect(mockRetry).not.toHaveBeenCalled();
  await act(async () => { await result.current.restore(); });
  expect(store.finish).toHaveBeenCalledTimes(1);
  expect(mockRetry).toHaveBeenCalled();
  expect(result.current.message).toMatch(/復元しました/);
  expect(result.current.error).toBeNull();
});

test('表示後にWebでPro契約した場合、新しいApple購入を始めない', async () => {
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  mockGet.mockResolvedValue({ status: 'OK', apple: { ...config, canPurchase: false, hasWebSubscription: true } });
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(store.purchase).not.toHaveBeenCalled();
  expect(result.current.error).toMatch(/すでにPro/);
});

test('アカウント切替中に完了した検証結果で新しいユーザーを開放しない', async () => {
  let finishVerification!: (value: unknown) => void;
  mockVerify.mockImplementationOnce(() => new Promise((resolve) => { finishVerification = resolve; }));
  const { result, rerender } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { listener(purchase); });
  mockAuth = { session: { user: { id: 'user-b' } }, token: 'token-b', isLoading: false };
  rerender();
  await act(async () => { finishVerification({ status: 'OK', mobileAccess: true }); });
  expect(store.finish).not.toHaveBeenCalled();
  expect(mockRetry).not.toHaveBeenCalled();
  expect(result.current.owner).toBe('user-b');
});

test('接続中のアカウント切替は古い接続の切断後に新しい接続を始める', async () => {
  let finishConnection!: (value: typeof store) => void;
  mockConnect.mockImplementationOnce(() => new Promise((resolve) => { finishConnection = resolve; }));
  const { rerender } = renderHook(usePurchases, { wrapper });
  await settle();
  mockAuth = { session: { user: { id: 'user-b' } }, token: 'token-b', isLoading: false };
  rerender();
  await settle();
  expect(mockConnect).toHaveBeenCalledTimes(1);
  await act(async () => { finishConnection(store); });
  expect(store.close).toHaveBeenCalledTimes(1);
  expect(mockConnect).toHaveBeenCalledTimes(2);
  expect(store.close.mock.invocationCallOrder[0]).toBeLessThan(mockConnect.mock.invocationCallOrder[1]);
});

test('購入要求の返却後もlistener確定前の再購入を止め、復元だけは行える', async () => {
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(result.current.awaitingPurchase).toBe(true);
  expect(result.current.busy).toBe(false);
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(store.purchase).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current.restore(); });
  expect(store.restore).toHaveBeenCalledTimes(1);
  expect(store.finish).toHaveBeenCalledTimes(1);
  expect(result.current.awaitingPurchase).toBe(false);
});

test('承認待ちは再購入を止め、キャンセル通知で解除する', async () => {
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { errorListener({ code: 'deferred-payment' }); });
  expect(result.current.awaitingPurchase).toBe(true);
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(store.purchase).not.toHaveBeenCalled();
  await act(async () => { errorListener({ code: 'user-cancelled' }); });
  expect(result.current.awaitingPurchase).toBe(false);
  expect(result.current.message).toMatch(/キャンセル/);
});

test('A→B→Aの再ログイン後に古い購入開始前チェックが完了しても購入しない', async () => {
  const { result, rerender } = renderHook(usePurchases, { wrapper });
  await settle();
  let finishOldConfig!: (value: unknown) => void;
  mockGet.mockImplementationOnce(() => new Promise((resolve) => { finishOldConfig = resolve; }));
  let oldPurchase!: Promise<void>;
  await act(async () => { oldPurchase = result.current.purchase('pro.monthly'); });
  mockAuth = { session: { user: { id: 'user-b' } }, token: 'token-b', isLoading: false };
  rerender();
  await settle();
  mockAuth = { session: { user: { id: 'user-a' } }, token: 'token-a-new-session', isLoading: false };
  rerender();
  await settle();
  await act(async () => {
    finishOldConfig({ status: 'OK', apple: config });
    await oldPurchase;
  });
  expect(store.purchase).not.toHaveBeenCalled();
  expect(result.current.awaitingPurchase).toBe(false);
  expect(result.current.owner).toBe('user-a');
});

test('復元処理中に遅い購入キャンセル通知が来ても復元の排他を解除しない', async () => {
  let finishRestore!: (value: StorePurchase[]) => void;
  store.restore.mockImplementationOnce(() => new Promise((resolve) => { finishRestore = resolve; }));
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  let restoring!: Promise<void>;
  await act(async () => { restoring = result.current.restore(); });
  await act(async () => { errorListener({ code: 'user-cancelled' }); });
  expect(result.current.busy).toBe(true);
  await act(async () => { await result.current.restore(); });
  expect(store.restore).toHaveBeenCalledTimes(1);
  await act(async () => { finishRestore([]); await restoring; });
  expect(result.current.busy).toBe(false);
});


test('ログイン前の購入意図の再生を受け取り、自動購入しない', async () => {
  mockAuth = { session: null, token: null, isLoading: false };
  const { result, rerender } = renderHook(usePurchases, { wrapper });
  await settle();
  expect(mockConnect).not.toHaveBeenCalled();
  mockConnect.mockImplementationOnce(async (onPurchase, onError, onPromoted) => { listener = onPurchase; errorListener = onError; promotedListener = onPromoted; onPromoted('pro.monthly'); return store; });
  mockAuth = { session: { user: { id: 'user-a' } }, token: 'token-a', isLoading: false };
  rerender();
  await settle();
  expect(result.current.promotedProductId).toBe('pro.monthly');
  expect(result.current.promotedNeedsNavigation).toBe(true);
  expect(store.purchase).not.toHaveBeenCalled();
  await act(async () => { await result.current.purchase('pro.monthly'); });
  expect(store.purchase).toHaveBeenCalledWith('pro.monthly', config.appAccountToken);
});

test('商品取得前の購入意図を保持し、不明な商品を拒否する', async () => {
  let finishProducts!: (value: unknown) => void;
  store.products.mockImplementationOnce(() => new Promise((resolve) => { finishProducts = resolve; }));
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { promotedListener('other.product'); });
  expect(result.current.promotedProductId).toBeNull();
  await act(async () => { promotedListener('pro.monthly'); });
  expect(result.current.promotedProductId).toBe('pro.monthly');
  expect(result.current.loading).toBe(true);
  await act(async () => { finishProducts([{ id: 'pro.monthly', title: 'Pro', displayPrice: '¥300', period: 'month' }]); });
  expect(result.current.loading).toBe(false);
  expect(result.current.promotedNeedsNavigation).toBe(true);
  expect(store.purchase).not.toHaveBeenCalled();
});

test('購入意図は同じアカウントの再読込で保持し、案内済みの重複通知では再遷移しない', async () => {
  const { result } = renderHook(usePurchases, { wrapper });
  await settle();
  await act(async () => { promotedListener('pro.monthly'); });
  await act(async () => { result.current.acknowledgePromotedNavigation(); result.current.refresh(); });
  await settle();
  expect(result.current.promotedProductId).toBe('pro.monthly');
  expect(result.current.promotedNeedsNavigation).toBe(false);
  await act(async () => { promotedListener('pro.monthly'); });
  expect(result.current.promotedNeedsNavigation).toBe(false);
});

test('購入意図はアカウント切替で破棄し、A→B→Aでも古い接続の通知を無視する', async () => {
  const { result, rerender } = renderHook(usePurchases, { wrapper });
  await settle();
  const oldListener = promotedListener;
  await act(async () => { oldListener('pro.monthly'); });
  mockAuth = { session: { user: { id: 'user-b' } }, token: 'token-b', isLoading: false };
  rerender();
  await settle();
  expect(result.current.promotedProductId).toBeNull();
  mockAuth = { session: { user: { id: 'user-a' } }, token: 'token-a-new', isLoading: false };
  rerender();
  await settle();
  await act(async () => { oldListener('pro.monthly'); });
  expect(result.current.promotedProductId).toBeNull();
  expect(store.purchase).not.toHaveBeenCalled();
});
