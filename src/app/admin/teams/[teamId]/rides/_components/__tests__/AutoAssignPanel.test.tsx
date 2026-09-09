import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import AutoAssignPanel from "../AutoAssignPanel";

const free = { plan: "free" as const, isPro: false, isExempt: false, freeLimit: 3, used: 0, remaining: 3, canUseAutoAssign: true };

test("無料枠が残る間も価格を表示し、購入前に体験できる", () => {
  const upgrade = jest.fn();
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={upgrade} isAssigning={false} error={null} defaultNumberOfCars={2} billingStatus={free} />);
  expect(screen.getByRole("button", { name: "無料で配車案を作る" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "月300円で続ける" }));
  expect(upgrade).toHaveBeenCalledTimes(1);
});

test("車出し可能な回答がなければ回答依頼を案内し、無料枠を消費させない", () => {
  const request = jest.fn();
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={jest.fn()} onRequestAnswers={request} isAssigning={false} error={null} defaultNumberOfCars={0} billingStatus={free} />);
  expect(screen.getByRole("button", { name: "無料で配車案を作る" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "回答依頼をコピー（LINE用）" }));
  expect(request).toHaveBeenCalledTimes(1);
});

test("上限到達後はエラー欄からの再実行も禁止する", () => {
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={jest.fn()} isAssigning={false} error={{ message: "台数不足", minimumCars: 2 }} defaultNumberOfCars={2} billingStatus={{ ...free, used: 3, remaining: 0, canUseAutoAssign: false }} />);
  expect(screen.getByRole("button", { name: "2台で実行する" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "自動割り当てを実行" })).toBeDisabled();
});

test("Proとデモには購入ボタンを出さない", () => {
  const props = { onAssign: jest.fn(), onUpgradeClick: jest.fn(), isAssigning: false, error: null, defaultNumberOfCars: 2 };
  const { rerender } = render(<AutoAssignPanel {...props} billingStatus={{ ...free, plan: "pro", isPro: true }} />);
  expect(screen.queryByRole("button", { name: "月300円で続ける" })).not.toBeInTheDocument();
  rerender(<AutoAssignPanel {...props} billingStatus={{ ...free, isExempt: true }} />);
  expect(screen.queryByRole("button", { name: "月300円で続ける" })).not.toBeInTheDocument();
});
