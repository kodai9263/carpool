import { render, screen, waitFor } from "@testing-library/react";
import { SettlementBillingReturnNotice } from "../SettlementBillingReturnNotice";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.history.replaceState({}, "", "/");
  jest.clearAllMocks();
});

test("Checkout成功後に契約を再確認して精算を再開する", async () => {
  window.history.replaceState(
    {},
    "",
    "/admin/teams/2/rides/9?settlement_checkout=success&settlement_session_id=cs_test_1",
  );
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ state: "active", active: true, subscriptionStatus: "active" }),
  }) as jest.Mock;
  const onActive = jest.fn();

  render(<SettlementBillingReturnNotice teamId={2} token="token" onActive={onActive} />);

  expect(screen.getByRole("status")).toHaveTextContent("お支払いと精算プランの反映を確認しています");
  await waitFor(() => expect(onActive).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenCalledWith(
    "/api/admin/teams/2/settlement-billing/checkout?session_id=cs_test_1",
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("精算プランが有効になりました");
});

test("Checkout取消では契約確認を送らず再申込できると案内する", () => {
  window.history.replaceState({}, "", "/admin/teams/2/settlements?settlement_checkout=cancel");
  global.fetch = jest.fn() as jest.Mock;

  render(<SettlementBillingReturnNotice teamId={2} token="token" onActive={jest.fn()} />);

  expect(screen.getByRole("status")).toHaveTextContent("申込みを再開できます");
  expect(global.fetch).not.toHaveBeenCalled();
});
