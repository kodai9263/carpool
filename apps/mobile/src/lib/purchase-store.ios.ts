import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Purchase, PurchaseIOS } from 'expo-iap';
import type { StoreConnection, StoreProduct, StorePurchase } from './purchases';

export const purchasePlatformMessage = '購入機能を利用できるiPhoneアプリで開いてください。';
const normalize = (purchase: Purchase): StorePurchase => ({
  id: purchase.id,
  productId: purchase.productId,
  purchaseState: purchase.purchaseState,
  purchaseToken: purchase.purchaseToken,
  transactionId: 'transactionId' in purchase ? purchase.transactionId ?? undefined : undefined,
  appAccountToken: 'appAccountToken' in purchase ? purchase.appAccountToken : undefined,
  raw: purchase,
});

export async function connectPurchaseStore(onPurchase: (purchase: StorePurchase) => void, onError: (error: unknown) => void, onPromotedProduct: (id: string) => void): Promise<StoreConnection | null> {
  // Expo Goには購入モジュールがない。読み込む前に除外し、認証や通常画面を壊さない。
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const iap = await import('expo-iap');
  const updates = iap.purchaseUpdatedListener((purchase) => onPurchase(normalize(purchase)), { dedupeTransactionIOS: false });
  const errors = iap.purchaseErrorListener(onError);
  let promoted: { remove: () => void } | null = null;
  try {
    const connected = await iap.initConnection();
    if (!connected) throw new Error('App Storeに接続できませんでした。');
    // ログイン前に届いた購入意図も再生する。ここでは購入を開始しない。
    promoted = iap.promotedProductListenerIOS((product) => onPromotedProduct(product.id));
  } catch (cause) {
    updates.remove();
    errors.remove();
    promoted?.remove();
    await iap.endConnection().catch(() => {});
    throw cause;
  }
  return {
    async products(ids) {
      const found = await iap.fetchProducts({ skus: ids, type: 'subs' });
      const products: StoreProduct[] = [];
      for (const product of found ?? []) {
        if (product.platform !== 'ios' || product.type !== 'subs' || !ids.includes(product.id)) continue;
        const period = product.subscriptionPeriodUnitIOS;
        if (product.subscriptionPeriodNumberIOS !== '1' || (period !== 'month' && period !== 'year')) continue;
        products.push({ id: product.id, title: product.title, displayPrice: product.displayPrice, period });
      }
      return products;
    },
    async purchase(productId, appAccountToken) {
      await iap.requestPurchase({ type: 'subs', request: { apple: { sku: productId, appAccountToken, andDangerouslyFinishTransactionAutomatically: false } } });
    },
    async pending() { return (await iap.getPendingTransactionsIOS()).map(normalize); },
    async restore() {
      await iap.restorePurchases();
      return (await iap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false })).map(normalize);
    },
    async finish(purchase) { await iap.finishTransaction({ purchase: purchase.raw as PurchaseIOS, isConsumable: false }); },
    async manage() { await iap.showManageSubscriptionsIOS(); },
    async close() {
      updates.remove();
      errors.remove();
      promoted?.remove();
      await iap.endConnection();
    },
  };
}
