import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { UpgradeDialog } from "../UpgradeDialog";
import { api } from "@/utils/api";

jest.mock("@/utils/api", () => ({ api: { post: jest.fn() } }));
jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn();
});

test("未保存入力の保護に失敗したらCheckoutを作らず理由を表示する", async () => {
  render(<UpgradeDialog open onClose={jest.fn()} token="token" returnPath="/admin/teams/1/rides/2" source="ride" onBeforeCheckout={async () => { throw new Error("入力を保存できませんでした"); }} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /月300円/ })); });
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("入力を保存できませんでした");
});

test("入力保存中の二重クリックを無視する", async () => {
  let resolveSave!: () => void;
  const save = jest.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
  (api.post as jest.Mock).mockRejectedValue(new Error("テスト用エラー"));
  render(<UpgradeDialog open onClose={jest.fn()} token="token" returnPath="/admin/teams/1/rides/2" source="ride" onBeforeCheckout={save} />);
  const button = screen.getByRole("button", { name: /月300円/ });
  fireEvent.click(button); fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);
  expect(api.post).not.toHaveBeenCalled();
  await act(async () => { resolveSave(); });
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/api/admin/billing/checkout", { interval: "month", returnPath: "/admin/teams/1/rides/2", source: "ride" }, "token");
});
