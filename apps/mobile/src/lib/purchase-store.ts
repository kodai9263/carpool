import type { StoreConnection, StorePurchase } from './purchases';

export const purchasePlatformMessage = 'アプリ内での購入・復元はiPhone版で利用できます。';
export async function connectPurchaseStore(_onPurchase: (purchase: StorePurchase) => void, _onError: (error: unknown) => void, _onPromotedProduct: (id: string) => void): Promise<StoreConnection | null> {
  void _onPurchase;
  void _onError;
  void _onPromotedProduct;
  return null;
}
