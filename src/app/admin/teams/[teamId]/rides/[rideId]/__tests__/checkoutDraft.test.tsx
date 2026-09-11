import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import toast from "react-hot-toast";
import { trackEvent } from "@/utils/analytics";
import { useFormContext } from "react-hook-form";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";
import { api } from "@/utils/api";
import { rideCheckoutDraftKey, serializeRideCheckoutDraft, parseRideCheckoutDraft } from "@/utils/rideCheckoutDraft";

jest.mock("next/navigation", () => ({ useParams: () => ({ teamId: "1", rideId: "2" }), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), notFound: jest.fn() }));
jest.mock("@/app/_hooks/useSupabaseSession", () => ({ useSupabaseSession: () => ({ token: "token", session: { user: { id: "owner", email: "test@example.com" } } }) }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));
jest.mock("@/utils/api", () => ({ api: { put: jest.fn(), patch: jest.fn(), post: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_components/GuidedTour", () => ({ __esModule: true, default: () => null }));
jest.mock("../../_components/RideDriverList", () => ({ __esModule: true, default: () => null }));
jest.mock("../../_components/RideBasicForm", () => ({ __esModule: true, default: function BasicForm() {
  const { register } = useFormContext();
  return <input aria-label="行き先" {...register("destination")} />;
} }));
jest.mock("@/app/admin/_components/BillingReturnNotice", () => ({ BillingReturnNotice: () => null }));
jest.mock("@/app/admin/_components/UpgradeDialog", () => ({ UpgradeDialog: () => null }));

const key = rideCheckoutDraftKey("owner", "1", "2");
const draft = {
  values: { date: new Date("2030-09-15T00:00:00Z"), destination: "決済前の行き先", meetingPlace: "学校", separateDirections: true, drivers: [] },
  deadline: "2030-09-14", lockAfterDeadline: true,
};
const ride = { id: 2, date: "2030-09-15T00:00:00Z", destination: "保存済み", separateDirections: false, drivers: [], children: [], availabilityDrivers: [], childAvailabilities: [], guardians: [], deadline: null };

beforeEach(() => {
  jest.clearAllMocks();
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.open = false; });
  sessionStorage.clear();
  window.history.replaceState(null, "", "/admin/teams/1/rides/2?checkout=cancel");
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? { autoAssign: { plan: "free", isPro: false, isExempt: false, freeLimit: 3, used: 0, remaining: 3, canUseAutoAssign: true } } : { ride },
    mutate: jest.fn().mockResolvedValue(undefined), isLoading: false,
  }));
  (api.patch as jest.Mock).mockResolvedValue({});
});

test("決済キャンセル後に未保存入力を戻し、バックグラウンド再取得で上書きしない", () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(draft));
  const { rerender } = render(<Page />);
  expect(screen.getByLabelText("行き先")).toHaveValue("決済前の行き先");
  fireEvent.click(screen.getByText(/行き帰りの配車設定/));
  expect(screen.getByRole("checkbox", { name: "行き帰りを別々に配車する" })).toBeChecked();
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "復帰後の修正" } });
  rerender(<Page />);
  expect(screen.getByLabelText("行き先")).toHaveValue("復帰後の修正");
});

test("復帰後の期限保存も下書きへ反映し、次の再読込で古い期限に戻らない", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(draft));
  const { container } = render(<Page />);
  fireEvent.click(screen.getByText("共有の詳細・期限設定"));
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2030-09-13" } });
  fireEvent.click(screen.getByRole("button", { name: "設定" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  await waitFor(() => expect(parseRideCheckoutDraft(sessionStorage.getItem(key))?.deadline).toBe("2030-09-13"));
});

test("初回案内のリンクは読込後に目的のボタンへ移動し、再取得では繰り返さない", async () => {
  window.history.replaceState(null, "", "/admin/teams/1/rides/2#share-request");
  const scroll = jest.fn();
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  let loading = true;
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? undefined : loading ? undefined : { ride },
    mutate: jest.fn(), isLoading: !url.includes("billing") && loading,
  }));
  try {
    const { rerender } = render(<Page />);
    expect(scroll).not.toHaveBeenCalled();
    loading = false;
    rerender(<Page />);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(document.activeElement?.id).toBe("share-request");
    rerender(<Page />);
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
});


test("回答依頼は保存済み期限とPINを含む回答画面のURLを表示し、編集中の値を保存しない", () => {
  const savedRide = { ...ride, deadline: "2030-09-10T00:00:00Z", pin: "1234" };
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? undefined : { ride: savedRide },
    mutate: jest.fn(), isLoading: false,
  }));
  const { container } = render(<Page />);
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "未保存の行き先" } });
  fireEvent.click(screen.getByText("共有の詳細・期限設定"));
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2030-09-13" } });
  fireEvent.click(within(screen.getByRole("region", { name: "メンバーへの連絡" })).getByRole("button", { name: "回答を依頼" }));
  const text = screen.getByLabelText("共有する文面").textContent!;
  expect(text).toContain("/member/teams/1/rides/2/availability");
  expect(text).toContain("PINコード: 1234");
  expect(text).toContain("9月10日まで");
  expect(text).not.toContain("9月13日まで");
  expect(text).toContain("保存済み");
  expect(text).not.toContain("未保存の行き先");
  expect(api.put).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  expect(screen.getByLabelText("行き先")).toHaveValue("未保存の行き先");
});

test("決定連絡は配車確認画面へ案内し、プレビューだけで更新を実行しない", () => {
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? undefined : { ride: { ...ride, pin: "1234" } },
    mutate: jest.fn(), isLoading: false,
  }));
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "配車決定を連絡" }));
  const text = screen.getByLabelText("共有する文面").textContent!;
  expect(text).toContain("/member/teams/1/rides/2");
  expect(text).not.toContain("/availability");
  expect(api.put).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});

test("期限確認のリンクは折りたたみを開いてから目的箇所へ移動する", async () => {
  window.history.replaceState(null, "", "/admin/teams/1/rides/2#answer-deadline");
  const original = HTMLElement.prototype.scrollIntoView;
  const scroll = jest.fn(function (this: HTMLElement) {
    expect(this.closest("details")).toHaveAttribute("open");
  });
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    render(<Page />);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(document.activeElement?.id).toBe("answer-deadline");
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
});


test("予定を閉じても編集値を保持し、要約に未保存の変更を表示する", () => {
  const { container } = render(<Page />);
  const details = container.querySelector('[data-guide="admin-ride-basic"]')!;
  expect(details).not.toHaveAttribute("open");
  fireEvent.click(within(details as HTMLElement).getByText("編集"));
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "変更した球場" } });
  fireEvent.click(within(details as HTMLElement).getByText("閉じる"));
  expect(details).not.toHaveAttribute("open");
  expect(details.querySelector("summary")).toHaveTextContent("変更した球場");
  expect(details.querySelector("summary")).toHaveTextContent("未保存の変更あり");
  expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(within(details as HTMLElement).getByText("編集"));
  expect(screen.getByLabelText("行き先")).toHaveValue("変更した球場");
});

test("日付の入力エラーでは閉じた予定欄を開く", async () => {
  (useFetch as jest.Mock).mockImplementation((url: string) => ({
    data: url.includes("billing") ? undefined : { ride },
    mutate: jest.fn(), isLoading: false,
  }));
  sessionStorage.setItem(key, serializeRideCheckoutDraft({ ...draft, values: { ...draft.values, date: null } }));
  const { container } = render(<Page />);
  const details = container.querySelector('[data-guide="admin-ride-basic"]')!;
  expect(details).not.toHaveAttribute("open");
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(details).toHaveAttribute("open"));
  expect(api.put).not.toHaveBeenCalled();
});


const assignedDraft = {
  ...draft,
  values: { ...draft.values, drivers: [{ availabilityDriverId: 7, type: "driver", direction: "outbound" as const, seats: 2, rideAssignments: [{ childId: 3 }], escorts: [] }] },
};

test("保存と再取得を待ってから最新の内容の連絡を案内し、再編集で案内を隠す", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(assignedDraft));
  let currentRide = { ...ride, pin: "1234", drivers: [{ rideAssignments: [{ child: { id: 3 } }], escorts: [] }] };
  let finishRefresh!: (value: { ride: typeof currentRide }) => void;
  const refresh = jest.fn(() => new Promise<{ ride: typeof currentRide }>((resolve) => { finishRefresh = resolve; }));
  (useFetch as jest.Mock).mockImplementation((url: string) => ({ data: url.includes("billing") ? undefined : { ride: currentRide }, mutate: refresh, isLoading: false }));
  (api.put as jest.Mock).mockResolvedValue({});
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button", { name: "連絡する文面を確認" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "配車決定を連絡" })).toBeDisabled();
  currentRide = { ...currentRide, destination: "決済前の行き先" };
  finishRefresh({ ride: currentRide });
  await waitFor(() => expect(screen.getByRole("button", { name: "連絡する文面を確認" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "連絡する文面を確認" }));
  expect(screen.getByLabelText("共有する文面")).toHaveTextContent("決済前の行き先");
  expect(trackEvent).toHaveBeenCalledWith("ride_saved", { team_id: "1", ride_id: "2" });
  expect(trackEvent).not.toHaveBeenCalledWith("share_text_copied", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "再編集" } });
  expect(screen.queryByRole("button", { name: "連絡する文面を確認" })).not.toBeInTheDocument();
});

test("保存後の再取得失敗を保存失敗と扱わず、古い内容の決定連絡を止める", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(assignedDraft));
  const refresh = jest.fn().mockRejectedValue(new Error("fetch failed"));
  (useFetch as jest.Mock).mockImplementation((url: string) => ({ data: url.includes("billing") ? undefined : { ride }, mutate: refresh, isLoading: false }));
  (api.put as jest.Mock).mockResolvedValue({});
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("配車の保存は完了しました")));
  expect(screen.queryByRole("button", { name: "連絡する文面を確認" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "配車決定を連絡" })).toBeDisabled();
  expect(api.put).toHaveBeenCalledTimes(1);
});

test("保存失敗時は共有案内も保存イベントも出さない", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(assignedDraft));
  (api.put as jest.Mock).mockRejectedValue(new Error("save failed"));
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "連絡する文面を確認" })).not.toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalledWith("ride_saved", expect.anything());
  } finally { alertSpy.mockRestore(); errorSpy.mockRestore(); }
});

test.each(["share-final", "ride-save"])("案内先 #%s は読込後にフォーカスを移す", async (target) => {
  window.history.replaceState(null, "", `/admin/teams/1/rides/2#${target}`);
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  try {
    render(<Page />);
    await waitFor(() => expect(document.activeElement?.id).toBe(target));
  } finally { HTMLElement.prototype.scrollIntoView = original; }
});


test("送信した割当が保存結果にない場合は、共有案内を表示しない", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(assignedDraft));
  const refresh = jest.fn().mockResolvedValue({ ride });
  (useFetch as jest.Mock).mockImplementation((url: string) => ({ data: url.includes("billing") ? undefined : { ride }, mutate: refresh, isLoading: false }));
  (api.put as jest.Mock).mockResolvedValue({});
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "変更を更新" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "変更を更新" })).toBeEnabled());
  expect(screen.queryByRole("button", { name: "連絡する文面を確認" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "配車決定を連絡" })).toBeEnabled();
});
