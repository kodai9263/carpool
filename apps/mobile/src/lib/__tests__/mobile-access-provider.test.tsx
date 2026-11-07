import type { ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { MobileAccessProvider, useMobileAccess } from '../../contexts/mobile-access';
import { requireMobileWriteAccess, setMobileWriteAccess } from '../mobile-write-access';

// Web側のテストレンダラーと同じReactを使い、mobile側との二重読込を避ける。
jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('react/jsx-runtime', () => jest.requireActual('../../../../../node_modules/react/jsx-runtime'));
jest.mock('../../contexts/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('../api', () => ({ adminGet: (...args: unknown[]) => mockGet(...args) }));
jest.mock('react-native', () => ({
  AppState: {
    get currentState() { return mockAppState; },
    addEventListener: (_event: string, listener: (state: string) => void) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  },
}), { virtual: true });

let mockAuth: { session: { user: { id: string } } | null; token: string | null; isLoading: boolean };
let mockAppState = 'active';
const mockListeners = new Set<(state: string) => void>();
const mockGet = jest.fn();
const requests: { token: string; signal: AbortSignal; resolve: (value: unknown) => void }[] = [];
const billing = (mobileAccess: boolean) => ({ status: 'OK', billing: { mobileAccess } });
const wrapper = ({ children }: { children: ReactNode }) => <MobileAccessProvider>{children}</MobileAccessProvider>;

function changeAppState(next: string) {
  act(() => {
    mockAppState = next;
    mockListeners.forEach((listener) => listener(next));
  });
}

async function resolveRequest(index: number, allowed: boolean) {
  await act(async () => { requests[index].resolve(billing(allowed)); });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockAuth = { session: { user: { id: 'admin-a' } }, token: 'token-a', isLoading: false };
  mockAppState = 'active';
  mockListeners.clear();
  requests.length = 0;
  setMobileWriteAccess(null);
  mockGet.mockImplementation((_path: string, token: string, options: { signal: AbortSignal }) => new Promise((resolve) => {
    requests.push({ token, signal: options.signal, resolve });
  }));
});

afterEach(() => {
  cleanup();
  setMobileWriteAccess(null);
  jest.useRealTimers();
});

it('バックグラウンドで操作を止め、復帰時の再確認後にだけ操作を戻す', async () => {
  const { result } = renderHook(useMobileAccess, { wrapper });
  expect(result.current.status).toBe('checking');
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  await resolveRequest(0, true);
  expect(result.current).toMatchObject({ status: 'allowed', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).not.toThrow();

  changeAppState('background');
  expect(result.current).toMatchObject({ status: 'checking', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(mockGet).toHaveBeenCalledTimes(1);

  changeAppState('active');
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  await resolveRequest(1, true);
  expect(result.current).toMatchObject({ status: 'allowed', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).not.toThrow();
});

it('同一ユーザーのtoken更新では入力保持フラグを残し、確認中は新旧どちらのtokenも更新できない', async () => {
  const { result, rerender } = renderHook(useMobileAccess, { wrapper });
  await resolveRequest(0, true);

  mockAuth = { ...mockAuth, token: 'token-a-refreshed' };
  rerender();
  expect(result.current).toMatchObject({ userId: 'admin-a', status: 'checking', hasOpened: true });
  expect(requests[1].token).toBe('token-a-refreshed');
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(() => requireMobileWriteAccess('token-a-refreshed')).toThrow();

  await resolveRequest(1, true);
  expect(result.current).toMatchObject({ status: 'allowed', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(() => requireMobileWriteAccess('token-a-refreshed')).not.toThrow();
});

it('アカウント切替で以前の利用権限と入力保持フラグを捨て、遅い旧応答を無視する', async () => {
  const { result, rerender } = renderHook(useMobileAccess, { wrapper });
  await resolveRequest(0, true);
  act(() => result.current.retry());

  mockAuth = { session: { user: { id: 'admin-b' } }, token: 'token-b', isLoading: false };
  rerender();
  expect(requests[1].signal.aborted).toBe(true);
  expect(result.current).toMatchObject({ userId: 'admin-b', status: 'checking', hasOpened: false });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(() => requireMobileWriteAccess('token-b')).toThrow();
  await resolveRequest(1, true);
  expect(result.current).toMatchObject({ userId: 'admin-b', status: 'checking', hasOpened: false });
  await resolveRequest(2, false);
  expect(result.current).toMatchObject({ userId: 'admin-b', status: 'locked', hasOpened: false });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(() => requireMobileWriteAccess('token-b')).toThrow();
});

it('アンマウントで権限と購読を解除し、古い成功応答でも権限を戻さない', async () => {
  const { result, unmount } = renderHook(useMobileAccess, { wrapper });
  await resolveRequest(0, true);
  act(() => result.current.retry());
  unmount();
  expect(mockListeners.size).toBe(0);
  expect(requests[1].signal.aborted).toBe(true);
  expect(() => requireMobileWriteAccess('token-a')).toThrow();

  await resolveRequest(1, true);
  act(() => jest.advanceTimersByTime(5 * 60 * 1000));
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  expect(mockGet).toHaveBeenCalledTimes(2);
});

it('開いたままでも定期確認し、有料契約の終了を反映する', async () => {
  const { result } = renderHook(useMobileAccess, { wrapper });
  await resolveRequest(0, true);
  act(() => jest.advanceTimersByTime(5 * 60 * 1000));
  expect(result.current).toMatchObject({ status: 'checking', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
  await resolveRequest(1, false);
  expect(result.current).toMatchObject({ status: 'locked', hasOpened: true });
  expect(() => requireMobileWriteAccess('token-a')).toThrow();
});
