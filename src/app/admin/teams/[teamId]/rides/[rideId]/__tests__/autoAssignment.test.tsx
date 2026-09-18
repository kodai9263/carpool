import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import toast from "react-hot-toast";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";
import { api } from "@/utils/api";
import type { AutoAssignBillingStatus } from "@/utils/billingServer";

jest.mock("next/navigation", () => ({ useParams: () => ({ teamId: "1", rideId: "2" }), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), notFound: jest.fn() }));
jest.mock("@/app/_hooks/useSupabaseSession", () => ({ useSupabaseSession: () => ({ token: "token", session: { user: { id: "owner", email: "test@example.com" } } }) }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));
jest.mock("@/utils/api", () => ({ api: { put: jest.fn(), patch: jest.fn(), post: jest.fn(), get: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_components/GuidedTour", () => ({ __esModule: true, default: () => null }));
jest.mock("@/app/admin/_components/BillingReturnNotice", () => ({ BillingReturnNotice: () => null }));
jest.mock("../../_components/RideBasicForm", () => ({ __esModule: true, default: function BasicForm() {
  const { register } = useFormContext();
  return <input aria-label="行き先" {...register("destination")} />;
} }));

const candidate = { id: 7, type: "driver", direction: "both", seats: 1, availability: true, comment: null, guardian: { id: 10, name: "運転する保護者" } };
const children = [{ id: 3, name: "自動案の子ども", currentGrade: 3 }, { id: 4, name: "調整後の子ども", currentGrade: 2 }];
const proposedDriver = { availabilityDriverId: 7, type: "driver", direction: "outbound", seats: 1, rideAssignments: [{ childId: 3 }], escorts: [] };
const savedDriver = { id: 20, ...proposedDriver, availabilityDriver: candidate, rideAssignments: [{ id: 30, child: children[1] }] };
const initialRide = {
  id: 2, date: "2030-09-15T00:00:00Z", destination: "球場", meetingPlace: "学校", separateDirections: false,
  drivers: [] as typeof savedDriver[], availabilityDrivers: [candidate], children,
  childAvailabilities: children.map((child) => ({ childId: child.id, availability: true, selfDriving: false })),
  guardians: [], deadline: null, pin: "1234",
};
const proStatus: AutoAssignBillingStatus = { plan: "pro", isPro: true, isExempt: false, freeLimit: 3, used: 3, remaining: 0, canUseAutoAssign: true };
const freeStatus: AutoAssignBillingStatus = { plan: "free", isPro: false, isExempt: false, freeLimit: 3, used: 2, remaining: 1, canUseAutoAssign: true };
const exhaustedStatus: AutoAssignBillingStatus = { ...freeStatus, used: 3, remaining: 0, canUseAutoAssign: false };
const autoAssignUrl = "/api/admin/teams/1/rides/2/auto-assign";

let currentRide: typeof initialRide;
let billingStatus: AutoAssignBillingStatus;
let refreshRide: jest.Mock;
let refreshBilling: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/admin/teams/1/rides/2");
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.open = false; });
  currentRide = { ...initialRide, drivers: [] };
  billingStatus = { ...proStatus };
  refreshRide = jest.fn(async () => ({ ride: currentRide }));
  refreshBilling = jest.fn(async (updated?: { autoAssign: typeof proStatus }) => {
    if (updated) billingStatus = updated.autoAssign;
    return { status: "OK", billing: { plan: billingStatus.plan, isPro: billingStatus.isPro }, autoAssign: billingStatus };
  });
  (useFetch as jest.Mock).mockImplementation((url: string) => {
    if (url === "/api/admin/billing/status") return { data: { status: "OK", billing: { plan: billingStatus.plan, isPro: billingStatus.isPro }, autoAssign: billingStatus }, mutate: refreshBilling, isLoading: false };
    if (url === "/api/admin/teams/1/rides/2") return { data: { ride: currentRide }, mutate: refreshRide, isLoading: false };
    throw new Error(`未定義の取得先: ${url}`);
  });
  (api.post as jest.Mock).mockResolvedValue({ drivers: [proposedDriver] });
  (api.put as jest.Mock).mockResolvedValue({});
});

test("Proの自動案は未保存で反映し、手動調整した内容を保存・再取得して連絡へ進める", async () => {
  refreshRide.mockImplementation(async () => {
    currentRide = { ...currentRide, drivers: [savedDriver] };
    return { ride: currentRide };
  });
  const { container } = render(<Page />);
  expect(screen.getByText("Pro・回数制限なし")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "自動割り当てを実行" }));
  await waitFor(() => expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toHaveValue("3"));
  expect(api.post).toHaveBeenCalledWith(autoAssignUrl, { numberOfCars: 1, separateParentChild: false }, "token");
  expect(screen.getByText(/まだ保存されていません/)).toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
  expect(refreshRide).not.toHaveBeenCalled();
  fireEvent.change(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')!, { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/teams/1/rides/2", expect.objectContaining({ drivers: [expect.objectContaining({ availabilityDriverId: 7, rideAssignments: [{ childId: 4 }] })] }), "token"));
  await waitFor(() => expect(refreshRide).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("button", { name: "連絡する文面を確認" })).toBeVisible();
  expect(screen.queryByText(/まだ保存されていません/)).not.toBeInTheDocument();
  expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toHaveValue("4");
});

test("未保存の自動案があると精算開始を止める", async () => {
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "自動割り当てを実行" }));
  await screen.findByText(/まだ保存されていません/);
  fireEvent.click(screen.getByRole("button", { name: "この配車の精算を始める" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("配車の変更を先に保存してください。"));
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.put).not.toHaveBeenCalled();
});

test("無料上限では自動割り当てを呼ばず、Proの案内を開ける", () => {
  billingStatus = exhaustedStatus ;
  render(<Page />);
  expect(screen.getByText("お試し残り0回")).toBeInTheDocument();
  const assignButton = screen.getByRole("button", { name: "自動割り当てを実行" });
  expect(assignButton).toBeDisabled();
  fireEvent.click(assignButton);
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /月.*円で続ける/ }));
  expect(screen.getByRole("dialog", { name: /Pro/ })).toBeVisible();
  expect(api.post).not.toHaveBeenCalled();
});

test("APIの402で残回数を最新化し、編集中の入力を維持する", async () => {
  billingStatus = freeStatus ;
  (api.post as jest.Mock).mockRejectedValue({ status: 402, message: "無料利用の上限に達しました。", billing: exhaustedStatus });
  render(<Page />);
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "編集中の球場" } });
  fireEvent.click(screen.getByRole("button", { name: "無料で配車案を作る" }));
  await screen.findByText("無料利用の上限に達しました。");
  expect(refreshBilling).toHaveBeenCalledWith(expect.objectContaining({ autoAssign: exhaustedStatus }), { revalidate: false });
  expect(screen.getByText("お試し残り0回")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "自動割り当てを実行" })).toBeDisabled();
  expect(screen.getByLabelText("行き先")).toHaveValue("編集中の球場");
  expect(api.put).not.toHaveBeenCalled();
});

test("無料の最後の1回で作成した案を保持し、再実行は上限で止める", async () => {
  billingStatus = freeStatus;
  (api.post as jest.Mock).mockResolvedValue({ drivers: [proposedDriver], billing: exhaustedStatus });
  const { container } = render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "無料で配車案を作る" }));
  await screen.findByText("お試し残り0回");
  expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toHaveValue("3");
  expect(screen.getByRole("button", { name: "自動割り当てを実行" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "変更を更新" })).toBeEnabled();
  expect(refreshBilling).toHaveBeenCalledWith(expect.objectContaining({ autoAssign: exhaustedStatus }), { revalidate: false });
  expect(api.put).not.toHaveBeenCalled();
});

test("プランの再取得に失敗しても作成済みの配車案を保存できる", async () => {
  refreshBilling.mockRejectedValue(new Error("プラン取得失敗"));
  const { container } = render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "自動割り当てを実行" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("プラン情報を更新できませんでした")));
  expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toHaveValue("3");
  expect(screen.queryByText("自動割り当てに失敗しました。")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
});

test("自動割り当て失敗でも既存の手動割り当てと入力を保持する", async () => {
  currentRide = { ...currentRide, drivers: [savedDriver] };
  (api.post as jest.Mock).mockRejectedValue({ message: "座席が不足しています。", minimumCars: 2 });
  const { container } = render(<Page />);
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "保持する行き先" } });
  fireEvent.click(screen.getByRole("button", { name: "自動割り当てを実行" }));
  await screen.findByText("座席が不足しています。");
  expect(screen.getByLabelText("行き先")).toHaveValue("保持する行き先");
  expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toHaveValue("4");
  expect(screen.getByRole("button", { name: "2台で実行する" })).toBeEnabled();
  expect(api.put).not.toHaveBeenCalled();
});

test("往復設定が未保存なら自動割り当てを呼ばない", async () => {
  render(<Page />);
  fireEvent.click(screen.getByText(/行き帰りの配車設定/));
  fireEvent.click(screen.getByRole("checkbox", { name: "行き帰りを別々に配車する" }));
  fireEvent.click(screen.getByRole("button", { name: "自動割り当てを実行" }));
  await waitFor(() => expect(screen.getByText(/行き帰り.*保存/)).toBeInTheDocument());
  expect(api.post).not.toHaveBeenCalled();
  expect(api.put).not.toHaveBeenCalled();
});

test("生成中は二重実行と保存を止める", async () => {
  let finishAssign!: (value: { drivers: typeof proposedDriver[] }) => void;
  (api.post as jest.Mock).mockImplementation(() => new Promise((resolve) => { finishAssign = resolve; }));
  render(<Page />);
  const button = screen.getByRole("button", { name: "自動割り当てを実行" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "変更を更新" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  expect(api.put).not.toHaveBeenCalled();
  await act(async () => finishAssign({ drivers: [proposedDriver] }));
  expect(screen.getByRole("button", { name: "変更を更新" })).toBeEnabled();
});

test("保存中は新しい自動案を作らない", async () => {
  let finishSave!: (value: object) => void;
  (api.put as jest.Mock).mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<Page />);
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "保存する球場" } });
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
  const button = screen.getByRole("button", { name: /自動割り当てを実行|配車案を作成中/ });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(api.post).not.toHaveBeenCalled();
  await act(async () => finishSave({}));
});
