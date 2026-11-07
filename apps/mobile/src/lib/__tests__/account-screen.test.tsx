import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Linking } from 'react-native';
import AccountScreen from '../../app/account';

jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('expo-router', () => ({ Redirect: () => <div>ログインへ移動</div>, router: { replace: jest.fn() }, Stack: { Screen: () => null } }), { virtual: true });
jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (value: unknown) => value },
}), { virtual: true });
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div> }), { virtual: true });
jest.mock('../../components/ui', () => ({
  AppButton: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  LoadingState: ({ label }: { label: string }) => <span>{label}</span>,
  ScreenHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
jest.mock('../../contexts/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('../api', () => ({ deleteAccount: (...args: unknown[]) => mockDelete(...args) }));

const mockDelete = jest.fn();
const mockSignOut = jest.fn();
let mockAuth: { token: string | null; session: { user: { id: string; email: string } } | null; isLoading: boolean; signOut: typeof mockSignOut };

beforeEach(() => {
  jest.clearAllMocks();
  mockDelete.mockReset().mockResolvedValue({ status: 'OK' });
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockAuth = { token: 'free-token', session: { user: { id: 'owner-1', email: 'demo@example.test' } }, isLoading: false, signOut: mockSignOut };
});

const confirmDeletion = () => {
  fireEvent.click(screen.getByRole('button', { name: 'アカウント削除の確認へ' }));
  fireEvent.click(screen.getByRole('button', { name: '確認してアカウントを完全に削除' }));
};

test('未ログインでは削除操作を表示しない', () => {
  mockAuth = { ...mockAuth, token: null, session: null };
  render(<AccountScreen />);
  expect(screen.getByText('ログインへ移動')).toBeInTheDocument();
  expect(mockDelete).not.toHaveBeenCalled();
});

test('契約状態の取得なしで設定を開け、Apple自動更新の注意と正規管理ページを表示する', async () => {
  render(<AccountScreen />);
  expect(screen.getByText(/Appleの定期購入は自動で解約されません/)).toBeInTheDocument();
  expect(screen.getByText(/Webで契約したProも/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Webの契約を管理' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Appleの契約を管理' }));
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');
  expect(mockDelete).not.toHaveBeenCalled();
});

test('確認を開くだけでは削除せず、取り消して戻れる', () => {
  render(<AccountScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'アカウント削除の確認へ' }));
  expect(screen.getByText(/「demo@example.test」を削除します/)).toBeInTheDocument();
  expect(mockDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '削除をやめる' }));
  expect(screen.queryByRole('button', { name: '確認してアカウントを完全に削除' })).not.toBeInTheDocument();
  expect(mockDelete).not.toHaveBeenCalled();
});

test('最終確認後に本人のtokenで一度だけ削除し、完了後にログアウトする', async () => {
  let resolve!: () => void;
  mockDelete.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
  render(<AccountScreen />);
  confirmDeletion();
  const pendingButton = screen.getByRole('button', { name: '削除しています…' });
  expect(pendingButton).toBeDisabled();
  fireEvent.click(pendingButton);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith('free-token');
  expect(mockSignOut).not.toHaveBeenCalled();
  await act(async () => { resolve(); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

test('APIや認証ユーザー削除が失敗したら成功表示やログアウトをせず再試行できる', async () => {
  mockDelete.mockRejectedValue(new Error('認証ユーザーの削除に失敗しました'));
  render(<AccountScreen />);
  confirmDeletion();
  await waitFor(() => expect(screen.getByText(/削除の完了を確認できませんでした/)).toBeInTheDocument());
  expect(screen.queryByText('アカウントを削除しました')).not.toBeInTheDocument();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '確認してアカウントを完全に削除' })).toBeEnabled();
});

test('削除成功後のログアウトだけ失敗しても削除を再送しない', async () => {
  mockSignOut.mockRejectedValueOnce(new Error('offline'));
  render(<AccountScreen />);
  confirmDeletion();
  await waitFor(() => expect(screen.getByText(/アカウントは削除されました/)).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: '確認してアカウントを完全に削除' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(2));
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('削除応答の前に画面が破棄されたら別アカウントをログアウトしない', async () => {
  let resolve!: () => void;
  mockDelete.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
  const view = render(<AccountScreen />);
  confirmDeletion();
  view.unmount();
  await act(async () => { resolve(); });
  expect(mockSignOut).not.toHaveBeenCalled();
});
