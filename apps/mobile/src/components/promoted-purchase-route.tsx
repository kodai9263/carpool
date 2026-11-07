import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/auth';
import { usePurchases } from '../contexts/purchases';

export function PromotedPurchaseRoute() {
  const { token, isLoading, isPasswordRecovery } = useAuth();
  const { promotedProductId, promotedNeedsNavigation, products, supported, loading, busy, awaitingPurchase, acknowledgePromotedNavigation } = usePurchases();
  const path = usePathname();
  useEffect(() => {
    if (!token || isLoading || isPasswordRecovery || !supported || loading || busy || awaitingPurchase || !promotedNeedsNavigation || !products.some((product) => product.id === promotedProductId)) return;
    // 購入画面で価格とアカウントを確認してもらい、決済は明示操作に委ねる。
    if (path !== '/billing') router.push('/billing');
    acknowledgePromotedNavigation();
  }, [token, isLoading, isPasswordRecovery, promotedProductId, promotedNeedsNavigation, products, supported, loading, busy, awaitingPurchase, path, acknowledgePromotedNavigation]);
  return null;
}
