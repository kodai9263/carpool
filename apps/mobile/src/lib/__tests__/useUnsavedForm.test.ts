import { act, renderHook } from '@testing-library/react';
import { useUnsavedForm } from '../useUnsavedForm';

const mockDispatch = jest.fn();
const mockAlert = jest.fn();
const mockPreventRemove = jest.fn();
// Web側のテストレンダラーと同じReactを使い、mobile側との二重読込を避ける。
jest.mock('react', () => jest.requireActual('../../../../../node_modules/react'));
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }), { virtual: true });
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args) }), { virtual: true });
jest.mock('react-native', () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) }, Platform: { OS: 'ios' } }), { virtual: true });

const action = { type: 'GO_BACK' };
function attemptRemoval() {
  const calls = mockPreventRemove.mock.calls;
  act(() => calls[calls.length - 1][1]({ data: { action } }));
}

beforeEach(() => jest.clearAllMocks());

it('未保存なら確認し、キャンセル時は入力画面を維持する', () => {
  renderHook(() => useUnsavedForm(true, false));
  attemptRemoval();
  expect(mockPreventRemove.mock.calls[0][0]).toBe(true);
  expect(mockDispatch).not.toHaveBeenCalled();
  const buttons = mockAlert.mock.calls[0][2];
  expect(buttons[0].style).toBe('cancel');
  act(() => buttons[1].onPress());
  expect(mockDispatch).toHaveBeenCalledWith(action);
});

it('保存中は破棄を許可しない', () => {
  renderHook(() => useUnsavedForm(true, true));
  attemptRemoval();
  expect(mockAlert.mock.calls[0][0]).toBe('保存中です');
  expect(mockDispatch).not.toHaveBeenCalled();
});

it('保存が成功したあとの次画面への遷移は妨げない', () => {
  const { result } = renderHook(() => useUnsavedForm(true, true));
  act(() => result.current());
  attemptRemoval();
  expect(mockDispatch).toHaveBeenCalledWith(action);
  expect(mockAlert).not.toHaveBeenCalled();
});

it('未変更なら画面の離脱を止めない', () => {
  renderHook(() => useUnsavedForm(false, false));
  expect(mockPreventRemove.mock.calls[0][0]).toBe(false);
});
