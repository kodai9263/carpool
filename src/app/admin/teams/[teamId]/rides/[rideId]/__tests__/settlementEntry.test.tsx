import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import toast from "react-hot-toast";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";
import { api } from "@/utils/api";

const routerPush = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ teamId: "1", rideId: "2" }),
  useRouter: () => ({ push: routerPush, replace: jest.fn() }),
  notFound: jest.fn(),
}));
jest.mock("@/app/_hooks/useSupabaseSession", () => ({
  useSupabaseSession: () => ({ token: "token", session: { user: { id: "owner", email: "test@example.com" } } }),
}));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));
jest.mock("@/utils/api", () => ({ api: { put: jest.fn(), patch: jest.fn(), post: jest.fn(), get: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_components/GuidedTour", () => ({ __esModule: true, default: () => null }));
jest.mock("../../_components/RideDriverList", () => ({ __esModule: true, default: () => null }));
jest.mock("@/app/admin/_components/BillingReturnNotice", () => ({ BillingReturnNotice: () => null }));
jest.mock("../../_components/RideBasicForm", () => ({
  __esModule: true,
  default: function BasicForm() {
    const { register } = useFormContext();
    return <input aria-label="行き先" {...register("destination")} />;
  },
}));

const ride = {
  id: 2,
  date: "2030-09-15T00:00:00Z",
  destination: "県営球場",
  meetingPlace: "学校",
  separateDirections: false,
  drivers: [],
  children: [],
  availabilityDrivers: [],
  childAvailabilities: [],
  guardians: [],
  deadline: null,
  pin: "1234",
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.open = false; });
  window.history.replaceState(null, "", "/admin/teams/1/rides/2");
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? { autoAssign: { plan: "pro", isPro: true, isExempt: false, canUseAutoAssign: true } } : { ride },
    mutate: jest.fn(), isLoading: false,
  }));
  (api.post as jest.Mock).mockResolvedValue({
    status: "OK",
    created: true,
    settlement: { id: 20 },
  });
});

test("保存済み配車から精算を作成し、同じ精算画面へ移動する", async () => {
  render(<Page />);

  fireEvent.click(screen.getByRole("button", { name: "この配車の精算を始める" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/1/rides/2/settlement",
    { moveFreeTrial: false },
    "token",
  ));
  expect(routerPush).toHaveBeenCalledWith("/admin/teams/1/settlements/20");
  expect(screen.getByText("最初の1遠征は無料。2遠征目から月980円／チームです。")).toBeInTheDocument();
});

test("別遠征で無料体験中なら、確認後に対象をこの遠征へ変更できる", async () => {
  (api.post as jest.Mock)
    .mockRejectedValueOnce({
      status: 402,
      code: "SETTLEMENT_SUBSCRIPTION_REQUIRED",
      reason: "trial_in_use",
      freeTrialSettlementId: 19,
      monthlyPrice: 980,
      message: "無料体験は別の遠征で利用中です。",
    })
    .mockResolvedValueOnce({ status: "OK", created: true, settlement: { id: 20 } });

  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "この配車の精算を始める" }));

  expect(await screen.findByRole("dialog", { name: "無料体験は別の遠征で利用中です" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "利用中の無料精算を見る" })).toHaveAttribute("href", "/admin/teams/1/settlements/19");

  fireEvent.click(screen.getByRole("button", { name: "無料体験をこの遠征へ変更" }));
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith(
    "/api/admin/teams/1/rides/2/settlement",
    { moveFreeTrial: true },
    "token",
  ));
  expect(routerPush).toHaveBeenCalledWith("/admin/teams/1/settlements/20");
});

test("無料体験利用済みなら月980円の案内を表示して精算を作らない", async () => {
  (api.post as jest.Mock).mockRejectedValueOnce({
    status: 402,
    code: "SETTLEMENT_SUBSCRIPTION_REQUIRED",
    reason: "trial_used",
    freeTrialSettlementId: 18,
    monthlyPrice: 980,
    message: "無料体験は利用済みです。",
  });

  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "この配車の精算を始める" }));

  expect(await screen.findByRole("dialog", { name: "無料体験は利用済みです" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "月980円の精算プランを始める" })).toBeEnabled();
  expect(routerPush).not.toHaveBeenCalled();
});

test("配車に未保存の変更があれば精算作成を止める", async () => {
  render(<Page />);
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "未保存の球場" } });

  fireEvent.click(screen.getByRole("button", { name: "この配車の精算を始める" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("配車の変更を先に保存してください。"));
  expect(api.post).not.toHaveBeenCalled();
  expect(routerPush).not.toHaveBeenCalled();
});
