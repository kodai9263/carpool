import { connectPurchaseStore } from '../purchase-store.ios';

jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }), { virtual: true });
jest.mock('expo-iap', () => ({
  purchaseUpdatedListener: () => ({ remove: mockRemoveUpdated }),
  purchaseErrorListener: () => ({ remove: mockRemoveError }),
  initConnection: () => mockInit(),
  endConnection: () => mockEnd(),
  promotedProductListenerIOS: (listener: (product: { id: string }) => void) => mockPromoted(listener),
}), { virtual: true });
const mockRemoveUpdated = jest.fn();
const mockRemoveError = jest.fn();
const mockRemovePromoted = jest.fn();
const mockInit = jest.fn();
const mockEnd = jest.fn();
const mockPromoted = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  mockInit.mockReset().mockResolvedValue(true);
  mockEnd.mockReset().mockResolvedValue(true);
  mockPromoted.mockReset().mockImplementation((listener: (product: { id: string }) => void) => {
    listener({ id: 'pro.yearly' });
    return { remove: mockRemovePromoted };
  });
});

test('接続成功後に保存済み購入意図を受け取り、切断時に全listenerを解除する', async () => {
  const onIntent = jest.fn();
  const store = await connectPurchaseStore(jest.fn(), jest.fn(), onIntent);
  expect(onIntent).toHaveBeenCalledWith('pro.yearly');
  expect(mockInit.mock.invocationCallOrder[0]).toBeLessThan(mockPromoted.mock.invocationCallOrder[0]);
  await store?.close();
  expect(mockRemoveUpdated).toHaveBeenCalledTimes(1);
  expect(mockRemoveError).toHaveBeenCalledTimes(1);
  expect(mockRemovePromoted).toHaveBeenCalledTimes(1);
  expect(mockEnd).toHaveBeenCalledTimes(1);
});

test('接続失敗時には購入意図を取得せずlistenerを片付ける', async () => {
  mockInit.mockResolvedValue(false);
  await expect(connectPurchaseStore(jest.fn(), jest.fn(), jest.fn())).rejects.toThrow('App Store');
  expect(mockPromoted).not.toHaveBeenCalled();
  expect(mockRemoveUpdated).toHaveBeenCalledTimes(1);
  expect(mockRemoveError).toHaveBeenCalledTimes(1);
  expect(mockEnd).toHaveBeenCalledTimes(1);
});
