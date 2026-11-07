export type ApplePurchaseConfig = {
  configured: boolean;
  canPurchase: boolean;
  appAccountToken: string;
  products: { monthly: string; yearly: string };
  hasAppleSubscription: boolean;
  hasWebSubscription: boolean;
};

export type StoreProduct = { id: string; title: string; displayPrice: string; period: 'month' | 'year' };
export type StorePurchase = {
  id: string;
  productId: string;
  purchaseState: 'pending' | 'purchased' | 'unknown';
  purchaseToken?: string | null;
  transactionId?: string;
  appAccountToken?: string | null;
  raw: unknown;
};
export type PurchasePayload = { signedTransaction?: string; transactionId?: string };
export type PurchaseOutcome = 'active' | 'inactive' | 'pending' | 'ignored';

export async function processRestoredPurchases(purchases: StorePurchase[], process: (purchase: StorePurchase) => Promise<PurchaseOutcome>) {
  let active = false;
  let pending = false;
  const failures: unknown[] = [];
  // 過去の別アカウントの購入が含まれていても、現在のアカウントの購入を確認し続ける。
  for (const purchase of purchases) {
    try {
      const result = await process(purchase);
      active ||= result === 'active';
      pending ||= result === 'pending';
    } catch (cause) { failures.push(cause); }
  }
  return { active, pending, failures };
}

export function readApplePurchaseConfig(value: unknown): ApplePurchaseConfig {
  const result = value as { status?: unknown; apple?: Partial<ApplePurchaseConfig> } | null;
  const apple = result?.apple;
  if (result?.status !== 'OK' || !apple ||
    typeof apple.configured !== 'boolean' || typeof apple.canPurchase !== 'boolean' ||
    typeof apple.hasAppleSubscription !== 'boolean' || typeof apple.hasWebSubscription !== 'boolean' ||
    typeof apple.appAccountToken !== 'string' || typeof apple.products?.monthly !== 'string' || typeof apple.products.yearly !== 'string' ||
    (apple.configured && (!apple.products.monthly || !apple.products.yearly || apple.products.monthly === apple.products.yearly ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apple.appAccountToken)))) {
    throw new Error('購入設定を確認できませんでした。');
  }
  return apple as ApplePurchaseConfig;
}
export type StoreConnection = {
  products: (ids: string[]) => Promise<StoreProduct[]>;
  purchase: (productId: string, appAccountToken: string) => Promise<void>;
  pending: () => Promise<StorePurchase[]>;
  restore: () => Promise<StorePurchase[]>;
  finish: (purchase: StorePurchase) => Promise<void>;
  manage: () => Promise<void>;
  close: () => Promise<void>;
};

export function purchaseErrorMessage(cause: unknown) {
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  if (code === 'user-cancelled') return '購入をキャンセルしました。';
  if (code === 'pending' || code === 'deferred-payment') return '購入の承認を待っています。承認後、このアカウントでアプリを開いてください。';
  return '購入を確認できませんでした。通信状況を確認し、「購入を復元」で再試行してください。';
}

// StoreKitのイベントと復元が同時に届いても、検証・保存・完了を一度ずつ実行する。
export function createPurchaseProcessor({
  currentUserId,
  verify,
  finish,
  onVerified,
}: {
  currentUserId: () => string | null;
  verify: (token: string, payload: PurchasePayload) => Promise<{ status: 'OK'; mobileAccess: boolean }>;
  finish: (purchase: StorePurchase) => Promise<void>;
  onVerified: () => void;
}) {
  const inFlight = new Map<string, Promise<PurchaseOutcome>>();
  return function process(purchase: StorePurchase, account: { userId: string; token: string; config: ApplePurchaseConfig }): Promise<PurchaseOutcome> {
    if (currentUserId() !== account.userId) return Promise.resolve('ignored');
    if (!Object.values(account.config.products).includes(purchase.productId)) return Promise.resolve('ignored');
    if (purchase.purchaseState === 'pending') return Promise.resolve('pending');
    if (purchase.purchaseState !== 'purchased') return Promise.resolve('ignored');
    if (purchase.appAccountToken && purchase.appAccountToken.toLowerCase() !== account.config.appAccountToken.toLowerCase()) {
      return Promise.reject(new Error('この購入は別のCarpoolアカウントに紐づいています。購入時のアカウントでログインしてください。'));
    }
    const transactionId = purchase.transactionId || purchase.id;
    if (!transactionId && !purchase.purchaseToken) return Promise.reject(new Error('購入情報が不足しています。購入を復元してください。'));
    const key = `${account.userId}:${transactionId}`;
    const existing = inFlight.get(key);
    if (existing) return existing;
    const result = (async (): Promise<PurchaseOutcome> => {
      const response = await verify(account.token, {
        ...(purchase.purchaseToken ? { signedTransaction: purchase.purchaseToken } : {}),
        ...(transactionId ? { transactionId } : {}),
      });
      if (response.status !== 'OK' || typeof response.mobileAccess !== 'boolean') throw new Error('購入の保存結果を確認できませんでした。購入を復元してください。');
      if (currentUserId() !== account.userId) return 'ignored';
      // 有効期限切れもサーバーが確認・保存済みなら取引を完了できる。権限はサーバー判定だけに従う。
      await finish(purchase);
      if (currentUserId() !== account.userId) return 'ignored';
      onVerified();
      return response.mobileAccess ? 'active' : 'inactive';
    })();
    inFlight.set(key, result);
    void result.finally(() => { inFlight.delete(key); }).catch(() => {});
    return result;
  };
}
