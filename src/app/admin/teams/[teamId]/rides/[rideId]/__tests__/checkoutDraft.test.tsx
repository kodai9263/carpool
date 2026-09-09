import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";
import { api } from "@/utils/api";
import { rideCheckoutDraftKey, serializeRideCheckoutDraft, parseRideCheckoutDraft } from "@/utils/rideCheckoutDraft";

jest.mock("next/navigation", () => ({ useParams: () => ({ teamId: "1", rideId: "2" }), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), notFound: jest.fn() }));
jest.mock("@/app/_hooks/useSupabaseSession", () => ({ useSupabaseSession: () => ({ token: "token", session: { user: { id: "owner", email: "test@example.com" } } }) }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));
jest.mock("@/utils/api", () => ({ api: { put: jest.fn(), patch: jest.fn() } }));
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
  expect(screen.getByRole("checkbox", { name: "行き帰りを別々に配車する" })).toBeChecked();
  fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "復帰後の修正" } });
  rerender(<Page />);
  expect(screen.getByLabelText("行き先")).toHaveValue("復帰後の修正");
});

test("復帰後の期限保存も下書きへ反映し、次の再読込で古い期限に戻らない", async () => {
  sessionStorage.setItem(key, serializeRideCheckoutDraft(draft));
  const { container } = render(<Page />);
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
