import { render } from '@testing-library/react';
import { PromotedPurchaseRoute } from '../../components/promoted-purchase-route';

jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) }, usePathname: () => mockPath }), { virtual: true });
jest.mock('../../contexts/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../contexts/purchases', () => ({ usePurchases: () => mockPurchases }));
const mockPush = jest.fn();
let mockPath = '/';
let mockAuth = { token: 'token', isLoading: false, isPasswordRecovery: false };
const mockAcknowledge = jest.fn(() => { mockPurchases.promotedNeedsNavigation = false; });
let mockPurchases = { promotedProductId: 'pro.monthly', promotedNeedsNavigation: true, products: [{ id: 'pro.monthly' }], supported: true, loading: false, busy: false, awaitingPurchase: false, acknowledgePromotedNavigation: mockAcknowledge };
beforeEach(() => {
  jest.clearAllMocks();
  mockPath = '/';
  mockAuth = { token: 'token', isLoading: false, isPasswordRecovery: false };
  mockPurchases = { promotedProductId: 'pro.monthly', promotedNeedsNavigation: true, products: [{ id: 'pro.monthly' }], supported: true, loading: false, busy: false, awaitingPurchase: false, acknowledgePromotedNavigation: mockAcknowledge };
});

test('購入画面を一度だけ案内し、画面から戻っても再遷移しない', () => {
  const { rerender } = render(<PromotedPurchaseRoute />);
  expect(mockPush).toHaveBeenCalledWith('/billing');
  expect(mockAcknowledge).toHaveBeenCalledTimes(1);
  mockPath = '/billing';
  rerender(<PromotedPurchaseRoute />);
  mockPath = '/';
  rerender(<PromotedPurchaseRoute />);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test('購入画面を開いている場合は積み重ねない', () => {
  mockPath = '/billing';
  render(<PromotedPurchaseRoute />);
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockAcknowledge).toHaveBeenCalledTimes(1);
});

test.each(['auth-loading', 'signed-out', 'recovery', 'products-loading', 'unknown-product', 'busy', 'awaiting'] as const)('%sでは案内を消費せず購入画面へ遷移しない', (condition) => {
  if (condition === 'auth-loading') mockAuth.isLoading = true;
  if (condition === 'signed-out') mockAuth.token = '';
  if (condition === 'recovery') mockAuth.isPasswordRecovery = true;
  if (condition === 'products-loading') mockPurchases.loading = true;
  if (condition === 'unknown-product') mockPurchases.products = [];
  if (condition === 'busy') mockPurchases.busy = true;
  if (condition === 'awaiting') mockPurchases.awaitingPurchase = true;
  render(<PromotedPurchaseRoute />);
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockAcknowledge).not.toHaveBeenCalled();
});
