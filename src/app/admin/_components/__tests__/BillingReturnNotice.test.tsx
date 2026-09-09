import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { BillingReturnNotice } from "../BillingReturnNotice";

jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
const get = jest.fn();
global.fetch = jest.fn(async (...args: unknown[]) => ({ ok: true, json: () => get(...args) })) as jest.Mock;

beforeEach(() => { jest.useFakeTimers(); get.mockReset(); window.history.replaceState({}, "", "/admin/profile?checkout=success&session_id=cs_test"); });
afterEach(() => { jest.useRealTimers(); });

test("URLのsuccessだけでは完了にせず、検証が有効になるまで再購入を止める", async () => {
  get.mockResolvedValueOnce({ state: "pending", isPro: false }).mockResolvedValueOnce({ state: "active", isPro: true });
  const confirmed = jest.fn(); const pending = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  await act(async () => {});
  expect(confirmed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(confirmed).toHaveBeenCalledTimes(1);
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(screen.getByText(/Proプランが有効/)).toBeInTheDocument();
});

test("30秒経過後は再取得を止め、再確認導線と購入ロックを残す", async () => {
  get.mockResolvedValue({ state: "pending", isPro: false });
  const pending = jest.fn(); const confirmed = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  await act(async () => {});
  for (let count = 0; count < 15; count += 1) { await act(async () => { jest.advanceTimersByTime(2000); }); }
  expect(screen.getByRole("button", { name: "支払い状況を再確認" })).toBeInTheDocument();
  const calls = get.mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(get).toHaveBeenCalledTimes(calls);
  expect(confirmed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
});

test("session_id欠落時は成功扱いせず再購入も止める", () => {
  window.history.replaceState({}, "", "/admin/profile?checkout=success");
  const confirmed = jest.fn(); const pending = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  expect(get).not.toHaveBeenCalled();
  expect(confirmed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenCalledWith(true);
  expect(screen.getByText(/確認情報がありません/)).toBeInTheDocument();
});

test("確認APIの失敗時は再購入を解除せず再確認を案内する", async () => {
  get.mockRejectedValue(new Error("network"));
  const pending = jest.fn(); const confirmed = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  await act(async () => {});
  expect(screen.getByRole("button", { name: "支払い状況を再確認" })).toBeInTheDocument();
  expect(confirmed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
});

test("失効が確認できた場合だけ申込みを再開できる", async () => {
  get.mockResolvedValue({ state: "expired", isPro: false });
  const pending = jest.fn(); const confirmed = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  await act(async () => {});
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(confirmed).not.toHaveBeenCalled();
  expect(screen.getByText(/お支払いの完了を確認できませんでした/)).toBeInTheDocument();
});

test("通信が応答しなくても30秒で中断し再確認を出す", async () => {
  (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
  const confirmed = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} />);
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(screen.getByRole("button", { name: "支払い状況を再確認" })).toBeInTheDocument();
  const options = (global.fetch as jest.Mock).mock.calls.at(-1)[1];
  expect(options.signal.aborted).toBe(true);
  expect(confirmed).not.toHaveBeenCalled();
});

test("管理者情報の更新が終わるまで購入ロックを保持する", async () => {
  get.mockResolvedValue({ state: "active", isPro: true });
  let resolve!: () => void;
  const confirmed = jest.fn(() => new Promise<void>((done) => { resolve = done; }));
  const pending = jest.fn();
  render(<BillingReturnNotice token="token" onConfirmed={confirmed} onPendingChange={pending} />);
  await act(async () => {});
  expect(pending).toHaveBeenLastCalledWith(true);
  expect(screen.queryByText(/Proプランが有効/)).not.toBeInTheDocument();
  await act(async () => { resolve(); });
  expect(pending).toHaveBeenLastCalledWith(false);
});
