import type { ReactNode, CSSProperties } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { router } from 'expo-router';
import RootLayout from '../../app/_layout';
import { MobileAccessScreen } from '../../components/mobile-access-screen';

jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('expo-router', () => {
  const Stack = ({ children }: { children: ReactNode }) => <div data-testid="stack">{children}</div>;
  Stack.Screen = function MockScreen({ name }: { name: string }) { return <div data-testid={`route-${name}`}>{name}</div>; };
  Stack.Protected = function MockProtected({ children, guard }: { children: ReactNode; guard: boolean }) { return guard ? children : null; };
  return { Stack, usePathname: () => mockPath, router: { push: jest.fn() } };
}, { virtual: true });
jest.mock('react-native', () => ({
  Keyboard: { dismiss: jest.fn() },
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  View: ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <div style={style}>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (value: unknown) => value, absoluteFill: {} },
}), { virtual: true });
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }), { virtual: true });
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}), { virtual: true });
jest.mock('../../components/ui', () => ({
  AppButton: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  LoadingState: ({ label }: { label: string }) => <span>{label}</span>,
  ScreenHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
jest.mock('../../contexts/auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ token: 'fixture-token', session: { user: { id: 'owner-1', email: 'demo@example.test' } }, signOut: jest.fn() }),
}));
jest.mock('../../contexts/mobile-access', () => ({
  MobileAccessProvider: ({ children }: { children: ReactNode }) => children,
  useMobileAccess: () => ({ status: mockStatus, hasOpened: mockHasOpened, retry: jest.fn() }),
}));
jest.mock('../../contexts/purchases', () => ({
  PurchaseProvider: ({ children }: { children: ReactNode }) => children,
  usePurchases: () => ({ promotedProductId: null, promotedNeedsNavigation: false, products: [], supported: false, loading: false, busy: false, awaitingPurchase: false, acknowledgePromotedNavigation: jest.fn() }),
}));

let mockPath = '/account';
let mockStatus = 'locked';
let mockHasOpened = false;

beforeEach(() => {
  jest.clearAllMocks();
  mockPath = '/account';
  mockStatus = 'locked';
  mockHasOpened = false;
});

test.each(['locked', 'error', 'checking'])('%s の利用制限画面からアカウント設定に進める', (status) => {
  mockStatus = status;
  render(<MobileAccessScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'アカウント設定・削除' }));
  expect(router.push).toHaveBeenCalledWith('/account');
});

test.each(['locked', 'error', 'checking'])('利用開始後に %s になってもアカウント設定は契約ゲートに覆われない', (status) => {
  mockStatus = status;
  mockHasOpened = true;
  render(<RootLayout />);
  expect(screen.getByTestId('stack')).toBeVisible();
  expect(screen.getByTestId('route-account')).toBeVisible();
  expect(screen.queryByRole('button', { name: '契約状況を再確認' })).not.toBeInTheDocument();
});

test('初回未契約でも設定画面が登録され、配車などの管理画面は保護される', () => {
  render(<RootLayout />);
  expect(screen.getByTestId('route-account')).toBeVisible();
  expect(screen.queryByTestId('route-teams/new')).not.toBeInTheDocument();
});

test('契約が失効した通常画面は引き続き契約ゲートで保護する', () => {
  mockPath = '/team/1';
  mockHasOpened = true;
  render(<RootLayout />);
  expect(screen.getByTestId('stack')).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'アカウント設定・削除' })).toBeVisible();
});
