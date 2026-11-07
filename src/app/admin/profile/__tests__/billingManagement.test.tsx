import { render, screen } from '@testing-library/react';
import ProfilePage from '../page';

jest.mock('@/app/_hooks/useFetch', () => ({ useFetch: () => ({ data: { admin: mockAdmin }, isLoading: false, mutate: jest.fn() }) }));
jest.mock('@/app/_hooks/useSupabaseSession', () => ({ useSupabaseSession: () => ({ token: 'test-token' }) }));
jest.mock('@/utils/supabase', () => ({ supabase: { auth: {} } }));
jest.mock('@/utils/api', () => ({ api: {} }));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/app/admin/_components/BillingReturnNotice', () => ({ BillingReturnNotice: () => null }));

let mockAdmin: Record<string, unknown>;
beforeEach(() => {
  mockAdmin = {
    id: 1, email: 'test@example.test', pendingTransferNewEmail: null,
    hasAppleSubscription: false, hasBillingCustomer: false,
    proAccess: { isPro: true, isPaidPro: true, isTrialActive: false },
  };
});

test('Appleのみの契約ではApple管理へ案内し、Stripe管理を出さない', () => {
  mockAdmin.hasAppleSubscription = true;
  render(<ProfilePage />);
  expect(screen.getByRole('link', { name: 'Appleの支払い・解約を管理' })).toHaveAttribute('href', 'https://apps.apple.com/account/subscriptions');
  expect(screen.queryByRole('button', { name: /支払い・解約を管理/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Proを始める/ })).not.toBeInTheDocument();
});

test('両方の契約がある場合は管理先を区別する', () => {
  mockAdmin.hasAppleSubscription = true;
  mockAdmin.hasBillingCustomer = true;
  render(<ProfilePage />);
  expect(screen.getByRole('link', { name: 'Appleの支払い・解約を管理' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Web契約の支払い・解約を管理' })).toBeInTheDocument();
});

test('従来のWeb契約者は既存の管理導線を使える', () => {
  mockAdmin.hasBillingCustomer = true;
  render(<ProfilePage />);
  expect(screen.getByRole('button', { name: '支払い・解約を管理' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Appleの支払い・解約を管理' })).not.toBeInTheDocument();
});
