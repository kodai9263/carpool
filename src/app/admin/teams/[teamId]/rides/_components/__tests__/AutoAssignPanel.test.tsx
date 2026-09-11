import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import AutoAssignPanel from "../AutoAssignPanel";

const free = { plan: "free" as const, isPro: false, isExempt: false, freeLimit: 3, used: 0, remaining: 3, canUseAutoAssign: true };

test("無料枠が残る間も価格を表示し、購入前に体験できる", () => {
  const upgrade = jest.fn();
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={upgrade} isAssigning={false} error={null} defaultNumberOfCars={2} billingStatus={free} />);
  expect(screen.getByRole("button", { name: "無料で配車案を作る" })).toBeEnabled();
  expect(screen.getByText("お試し残り3回")).toBeInTheDocument();
  expect(screen.getByText("無料は3回まで。再計算も1回として数えます。")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "月300円で続ける" }));
  expect(upgrade).toHaveBeenCalledTimes(1);
});

test("車出し可能な回答がなければ回答依頼を案内し、無料枠を消費させない", () => {
  const request = jest.fn();
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={jest.fn()} onRequestAnswers={request} isAssigning={false} error={null} defaultNumberOfCars={0} billingStatus={free} />);
  expect(screen.getByRole("button", { name: "無料で配車案を作る" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "回答を依頼" }));
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
  expect(screen.getByText("Pro・回数制限なし")).toBeInTheDocument();
  rerender(<AutoAssignPanel {...props} billingStatus={{ ...free, isExempt: true }} />);
  expect(screen.getByText("デモ・回数制限なし")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "月300円で続ける" })).not.toBeInTheDocument();
});


test("条件は折り畳み、変更した内容を要約と配車作成に反映する", () => {
  const assign = jest.fn().mockResolvedValue(undefined);
  render(<AutoAssignPanel onAssign={assign} onUpgradeClick={jest.fn()} isAssigning={false} error={null} defaultNumberOfCars={3} billingStatus={free} />);
  const details = screen.getByText("配車の条件").closest("details");
  expect(details).not.toHaveAttribute("open");
  expect(screen.getByText("3台 ・ 親子の指定なし")).toBeInTheDocument();
  fireEvent.click(screen.getByText("配車の条件"));
  fireEvent.change(screen.getByLabelText("台数"), { target: { value: "2" } });
  fireEvent.click(screen.getByLabelText("親子を別々の車にする"));
  expect(screen.getByText("2台 ・ 親子は別々の車")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "無料で配車案を作る" }));
  expect(assign).toHaveBeenCalledWith({ numberOfCars: 2, separateParentChild: true });
  fireEvent.change(screen.getByLabelText("台数"), { target: { value: "" } });
  expect(screen.getByText("台数は自動計算 ・ 親子は別々の車")).toBeInTheDocument();
});


test("作成しただけの配車案は未保存と明示し、保存操作へ案内する", () => {
  render(<AutoAssignPanel onAssign={jest.fn()} onUpgradeClick={jest.fn()} isAssigning={false} error={null} defaultNumberOfCars={2} billingStatus={free} assignmentSummary={{ children: 8, cars: 2 }} />);
  expect(screen.getByRole("status")).toHaveTextContent("まだ保存されていません");
  expect(screen.getByRole("link", { name: "保存ボタンへ進む" })).toHaveAttribute("href", "#ride-save");
});
