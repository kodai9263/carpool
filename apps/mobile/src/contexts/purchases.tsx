import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { useMobileAccess } from './mobile-access';
import { adminGet, verifyApplePurchase } from '../lib/api';
import { connectPurchaseStore, purchasePlatformMessage } from '../lib/purchase-store';
import { createPurchaseProcessor, processRestoredPurchases, purchaseErrorMessage, readApplePurchaseConfig, type ApplePurchaseConfig, type PurchaseOutcome, type StoreConnection, type StoreProduct, type StorePurchase } from '../lib/purchases';

type PurchaseState = {
  owner: string | null;
  promotedProductId: string | null;
  promotedNeedsNavigation: boolean;
  config: ApplePurchaseConfig | null;
  products: StoreProduct[];
  loading: boolean;
  busy: boolean;
  awaitingPurchase: boolean;
  supported: boolean;
  message: string | null;
  error: string | null;
};
type PurchaseContextValue = PurchaseState & {
  acknowledgePromotedNavigation: () => void;
  refresh: () => void;
  purchase: (id: string) => Promise<void>;
  restore: () => Promise<void>;
  manage: () => Promise<void>;
};
const empty: PurchaseState = { owner: null, promotedProductId: null, promotedNeedsNavigation: false, config: null, products: [], loading: false, busy: false, awaitingPurchase: false, supported: false, message: null, error: null };
const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { session, token, isLoading } = useAuth();
  const { retry } = useMobileAccess();
  const userId = !isLoading && token ? session?.user.id ?? null : null;
  const current = useRef({ userId, token, retry });
  current.current = { userId, token, retry };
  const [state, setState] = useState<PurchaseState>(empty);
  const [generation, setGeneration] = useState(0);
  const connection = useRef<{ owner: string; store: StoreConnection; process: (purchase: StorePurchase) => Promise<PurchaseOutcome> } | null>(null);
  const closing = useRef<Promise<void>>(Promise.resolve());
  const action = useRef(false);
  const processingCount = useRef(0);
  const awaitingPurchase = useRef(false);
  const promotedIntent = useRef<{ owner: string; id: string; needsNavigation: boolean } | null>(null);

  async function fetchConfig(owner: string): Promise<ApplePurchaseConfig> {
    const accessToken = current.current.userId === owner ? current.current.token : null;
    if (!accessToken) throw new Error('購入時のアカウントでログインしてください。');
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const result = await adminGet<unknown>('/api/admin/billing/apple/config', accessToken, { cache: 'no-store', signal: abort.signal });
      const config = readApplePurchaseConfig(result);
      if (current.current.userId !== owner) throw new Error('アカウントが変更されました。');
      return config;
    } finally { clearTimeout(timeout); }
  }

  useEffect(() => {
    let alive = true;
    let store: StoreConnection | null = null;
    const owner = userId;
    action.current = false;
    processingCount.current = 0;
    awaitingPurchase.current = false;
    connection.current = null;
    // 同一ユーザーの再読込では選択を保持し、アカウント変更では持ち越さない。
    if (promotedIntent.current?.owner !== owner) promotedIntent.current = null;
    setState({ ...empty, owner, loading: Boolean(owner), promotedProductId: promotedIntent.current?.id ?? null, promotedNeedsNavigation: promotedIntent.current?.needsNavigation ?? false });
    if (!owner) return;
    const active = () => alive && current.current.userId === owner;
    const patch = (value: Partial<PurchaseState>) => { if (active()) setState((before) => ({ ...before, ...value })); };
    const queue: StorePurchase[] = [];
    let process: ((purchase: StorePurchase) => Promise<PurchaseOutcome>) | null = null;
    const received = async (purchase: StorePurchase) => {
      if (!active()) return 'ignored' as const;
      if (!process) { queue.push(purchase); return 'ignored' as const; }
      processingCount.current += 1;
      patch({ busy: true, error: null });
      try {
        const outcome = await process(purchase);
        if (active() && outcome !== 'ignored') {
          awaitingPurchase.current = outcome === 'pending';
          patch({ awaitingPurchase: awaitingPurchase.current });
        }
        if (outcome === 'active') patch({ message: '購入を確認しました。Proをご利用いただけます。' });
        else if (outcome === 'inactive') patch({ message: '購入を確認しましたが、現在有効なPro契約はありません。' });
        else if (outcome === 'pending') patch({ message: '購入の承認を待っています。承認後、このアカウントでアプリを開いてください。' });
        return outcome;
      } catch (cause) {
        patch({ error: cause instanceof Error ? cause.message : purchaseErrorMessage(cause) });
        throw cause;
      } finally {
        if (active()) {
          processingCount.current -= 1;
          patch({ busy: processingCount.current > 0 || action.current });
        }
      }
    };
    const initialization = (async () => {
      try {
        const config = await fetchConfig(owner);
        if (!active()) return;
        patch({ config });
        if (!config.configured) { patch({ message: '現在、アプリ内購入の提供準備中です。' }); return; }
        await closing.current;
        if (!active()) return;
        store = await connectPurchaseStore(
          (purchase) => { void received(purchase).catch(() => {}); },
          (cause) => {
            if (!active()) return;
            const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : '';
            awaitingPurchase.current = code === 'pending' || code === 'deferred-payment';
            patch({ busy: processingCount.current > 0 || action.current, awaitingPurchase: awaitingPurchase.current, message: purchaseErrorMessage(cause), error: null });
          },
          (id) => {
            if (!active() || !Object.values(config.products).includes(id)) return;
            // native側の再生や同一商品の重複通知で、戻った画面を再び購入画面にしない。
            if (promotedIntent.current?.owner === owner && promotedIntent.current.id === id) return;
            promotedIntent.current = { owner, id, needsNavigation: true };
            patch({ promotedProductId: id, promotedNeedsNavigation: true });
          },
        );
        if (!active()) return;
        if (!store) { patch({ message: purchasePlatformMessage }); return; }
        const connected = store;
        const processor = createPurchaseProcessor({
          currentUserId: () => active() ? owner : null,
          verify: verifyApplePurchase,
          finish: (purchase) => connected.finish(purchase),
          onVerified: () => {
            if (!active()) return;
            current.current.retry();
            void fetchConfig(owner).then((next) => patch({ config: next })).catch(() => {});
          },
        });
        process = (purchase) => {
          const accessToken = active() ? current.current.token : null;
          if (!accessToken) return Promise.resolve('ignored');
          return processor(purchase, { userId: owner, token: accessToken, config });
        };
        connection.current = { owner, store: connected, process: received };
        patch({ supported: true });
        // listenerは購入画面の外でも生かし、保存失敗で未完了になった取引を起動時に再送する。
        const pending = await connected.pending();
        for (const purchase of [...queue, ...pending]) await received(purchase).catch(() => {});
        queue.length = 0;
        if (!active()) return;
        const products = await connected.products(Object.values(config.products));
        if (active()) patch({ products });
      } catch {
        patch({ error: '購入情報を取得できませんでした。通信状況を確認して、再読み込みしてください。' });
      } finally { patch({ loading: false }); }
    })();
    return () => {
      alive = false;
      connection.current = null;
      // 古い接続処理の完了と切断を待ち、次のアカウントの接続を後から切断しない。
      closing.current = initialization.then(async () => { await store?.close(); }).catch(() => {});
    };
    // 同一ユーザーのtoken更新では、購入シートとStoreKit接続を取り外さない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, generation]);

  const isCurrentConnection = (value: NonNullable<typeof connection.current>) => connection.current === value && current.current.userId === value.owner;
  const run = async (operation: (value: NonNullable<typeof connection.current>) => Promise<void>) => {
    const value = connection.current;
    if (action.current || processingCount.current > 0 || !value || value.owner !== current.current.userId) return;
    action.current = true;
    setState((before) => ({ ...before, busy: true, error: null, message: null }));
    try { await operation(value); }
    catch (cause) {
      if (isCurrentConnection(value)) {
        const storeError = cause && typeof cause === 'object' && 'code' in cause;
        if (storeError) {
          awaitingPurchase.current = cause.code === 'pending' || cause.code === 'deferred-payment';
        }
        setState((before) => storeError
          ? { ...before, awaitingPurchase: awaitingPurchase.current, message: purchaseErrorMessage(cause), error: null }
          : { ...before, error: cause instanceof Error ? cause.message : purchaseErrorMessage(cause) });
      }
    } finally {
      if (isCurrentConnection(value)) {
        action.current = false;
        setState((before) => ({ ...before, busy: processingCount.current > 0 }));
      }
    }
  };

  const purchase = (id: string) => {
    if (awaitingPurchase.current) return Promise.resolve();
    return run(async (value) => {
      const { owner, store } = value;
      // 表示後にWeb側で契約した場合にも、新規Apple購入を始めない。
      const config = await fetchConfig(owner);
      if (!isCurrentConnection(value)) return;
      setState((before) => ({ ...before, config }));
      if (!config.configured || !config.canPurchase) throw new Error('すでにProをご利用中か、購入の準備が整っていません。契約状況をご確認ください。');
      if (!Object.values(config.products).includes(id) || !state.products.some((product) => product.id === id)) throw new Error('購入するプランを再読み込みしてください。');
      awaitingPurchase.current = true;
      setState((before) => ({ ...before, awaitingPurchase: true }));
      await store.purchase(id, config.appAccountToken);
      if (isCurrentConnection(value)) setState((before) => ({ ...before, message: before.message ?? '購入結果を確認しています。反映されない場合は「購入を復元」をお試しください。' }));
    });
  };
  const restore = () => run(async (value) => {
    const { store, process } = value;
    const purchases = await store.restore();
    if (!isCurrentConnection(value)) return;
    const result = await processRestoredPurchases(purchases, process);
    if (!result.active && result.failures.length > 0) throw result.failures[0];
    if (isCurrentConnection(value)) {
      current.current.retry();
      const message = result.active
        ? (result.failures.length ? 'Proの購入を復元しました。一部の過去の購入は復元できませんでした。' : '購入を復元しました。Proをご利用いただけます。')
        : (result.pending ? '購入の承認を待っています。承認後、このアカウントでアプリを開いてください。' : 'このアカウントで復元できる有効なPro購入は見つかりませんでした。');
      setState((before) => ({ ...before, message, error: null }));
    }
  });
  const manage = () => run(async (value) => {
    const { owner, store } = value;
    await store.manage();
    if (isCurrentConnection(value)) {
      current.current.retry();
      const config = await fetchConfig(owner);
      if (!isCurrentConnection(value)) return;
      setState((before) => ({ ...before, config }));
    }
  });
  const acknowledgePromotedNavigation = () => {
    const intent = promotedIntent.current;
    if (!intent || intent.owner !== current.current.userId) return;
    intent.needsNavigation = false;
    setState((before) => before.owner === intent.owner ? { ...before, promotedNeedsNavigation: false } : before);
  };
  const shown = state.owner === userId ? state : { ...empty, owner: userId, loading: Boolean(userId) };
  return <PurchaseContext.Provider value={{ ...shown, acknowledgePromotedNavigation, refresh: () => { if (!action.current && processingCount.current === 0 && !awaitingPurchase.current) setGeneration((value) => value + 1); }, purchase, restore, manage }}>{children}</PurchaseContext.Provider>;
}

export function usePurchases() {
  const value = useContext(PurchaseContext);
  if (!value) throw new Error('PurchaseProvider is required');
  return value;
}
