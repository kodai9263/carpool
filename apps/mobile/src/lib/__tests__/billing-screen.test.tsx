import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BillingScreen from '../../app/billing';
import type { ApplePurchaseConfig, StoreProduct } from '../purchases';

jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('expo-router', () => ({ Redirect: () => <div>ログインへ移動</div>, router: { replace: jest.fn() } }), { virtual: true });
jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (value: unknown) => value },
}), { virtual: true });
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div> }), { virtual: true });
jest.mock('../../components/ui', () => ({
  AppButton: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  LoadingState: ({ label }: { label: string }) => <span>{label}</span>,
  ScreenHeader: ({ title, description }: { title: string; description: string }) => <><h1>{title}</h1><p>{description}</p></>,
}));
jest.mock('../../contexts/auth', () => ({ useAuth: () => ({ token: 'fixture-token', session: { user: { email: 'demo@example.test' } }, isLoading: false }) }));
jest.mock('../../contexts/mobile-access', () => ({ useMobileAccess: () => ({ status: mockAccessStatus, retry: jest.fn() }) }));
jest.mock('../../contexts/purchases', () => ({ usePurchases: () => mockPurchases }));
jest.mock('../config', () => ({ env: { webBaseUrl: 'https://fixture.example.test' } }));

const mockPurchase = jest.fn();
const mockRestore = jest.fn();
const mockManage = jest.fn();
let mockAccessStatus = 'locked';
const config: ApplePurchaseConfig = {
  configured: true, canPurchase: true, appAccountToken: '11111111-1111-4111-8111-111111111111',
  products: { monthly: 'pro.monthly', yearly: 'pro.yearly' }, hasAppleSubscription: false, hasWebSubscription: false,
};
let mockPurchases: {
  config: ApplePurchaseConfig;
  products: StoreProduct[];
  promotedProductId: string | null;
  loading: boolean;
  busy: boolean;
  awaitingPurchase: boolean;
  supported: boolean;
  error: string | null;
  message: string | null;
  refresh: () => void;
  purchase: typeof mockPurchase;
  restore: typeof mockRestore;
  manage: typeof mockManage;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessStatus = 'locked';
  mockPurchases = {
    config: { ...config },
    products: [
      { id: 'pro.monthly', title: 'Carpool Pro Monthly', displayPrice: '€4,99', period: 'month' },
      { id: 'pro.yearly', title: 'Carpool Pro Annual', displayPrice: '€49,99', period: 'year' },
    ],
    promotedProductId: null, loading: false, busy: false, awaitingPurchase: false, supported: true, error: null, message: null,
    refresh: jest.fn(), purchase: mockPurchase, restore: mockRestore, manage: mockManage,
  };
});

test('App Store取得のローカライズ価格と月年の期間を表示し、選んだ商品を購入する', () => {
  render(<BillingScreen />);
  const monthly = screen.getByText('月額プラン').closest('section')!;
  const yearly = screen.getByText('年額プラン').closest('section')!;
  expect(monthly).toHaveTextContent('€4,99 / 1か月');
  expect(yearly).toHaveTextContent('€49,99 / 1年');
  expect(screen.queryByText(/¥300|¥3,000/)).not.toBeInTheDocument();
  fireEvent.click(within(monthly).getByRole('button', { name: '月額プランを購入' }));
  expect(mockPurchase).toHaveBeenLastCalledWith('pro.monthly');
  fireEvent.click(within(yearly).getByRole('button', { name: '年額プランを購入' }));
  expect(mockPurchase).toHaveBeenLastCalledWith('pro.yearly');
});

test('購入の確認中は購入・復元・管理を開始できない', () => {
  mockPurchases.busy = true;
  render(<BillingScreen />);
  for (const label of ['月額プランを購入', '年額プランを購入', '購入を復元', 'Appleの契約を管理']) {
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeDisabled();
    fireEvent.click(button);
  }
  expect(mockPurchase).not.toHaveBeenCalled();
  expect(mockRestore).not.toHaveBeenCalled();
  expect(mockManage).not.toHaveBeenCalled();
});

test('承認待ちでは追加購入を止め、復元は利用できる', () => {
  mockPurchases.awaitingPurchase = true;
  render(<BillingScreen />);
  expect(screen.getByRole('button', { name: '月額プランを購入' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '年額プランを購入' })).toBeDisabled();
  const restore = screen.getByRole('button', { name: '購入を復元' });
  expect(restore).toBeEnabled();
  fireEvent.click(restore);
  expect(mockRestore).toHaveBeenCalledTimes(1);
});

test('Pro有効時もWeb契約の状態は断定せず、新規購入を出さずアプリ利用へ進める', () => {
  mockAccessStatus = 'allowed';
  mockPurchases.config = { ...config, canPurchase: false, hasWebSubscription: true };
  render(<BillingScreen />);
  expect(screen.getByText('Webの契約・お申し込みがあります')).toBeInTheDocument();
  expect(screen.getByText(/^追加購入はせず、Web版のプロフィールで契約・お支払い状況をご確認ください/)).toBeInTheDocument();
  expect(screen.queryByText('WebのPro契約で利用できます')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'アプリを使う' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: '月額プランを購入' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '年額プランを購入' })).not.toBeInTheDocument();
});

test('Webの未払い・手続き中では利用可能と言わず、契約確認を案内する', () => {
  mockPurchases.config = { ...config, canPurchase: false, hasWebSubscription: true };
  render(<BillingScreen />);
  expect(screen.getByText('Webの契約・お申し込みがあります')).toBeInTheDocument();
  expect(screen.getByText(/^追加購入はせず、Web版のプロフィールで契約・お支払い状況をご確認ください/)).toBeInTheDocument();
  expect(screen.queryByText('WebのPro契約で利用できます')).not.toBeInTheDocument();
  expect(screen.queryByText(/^追加購入は不要です/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'アプリを使う' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '月額プランを購入' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '年額プランを購入' })).not.toBeInTheDocument();
});

test('Web・Android・Expo Goなど非対応環境には購入・復元ボタンを出さない', () => {
  mockPurchases.supported = false;
  mockPurchases.message = 'アプリ内での購入・復元はiPhone版で利用できます。';
  render(<BillingScreen />);
  expect(screen.getByText(mockPurchases.message)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '月額プランを購入' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '年額プランを購入' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '購入を復元' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Appleの契約を管理' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'プライバシーポリシー' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '利用規約（Apple標準）' })).toBeEnabled();
});


test('App Storeで選んだプランを案内し、明示的な購入操作を待つ', () => {
  mockPurchases.promotedProductId = 'pro.yearly';
  render(<BillingScreen />);
  expect(screen.getByText(/App Storeで選択した年額プランです/)).toBeInTheDocument();
  expect(screen.getByText('ログイン中：demo@example.test')).toBeInTheDocument();
  expect(mockPurchase).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '年額プランを購入' }));
  expect(mockPurchase).toHaveBeenCalledWith('pro.yearly');
});
