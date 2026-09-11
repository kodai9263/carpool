import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";
import { api } from "@/utils/api";

jest.mock("next/navigation", () => ({ useParams: () => ({ teamId: "1", rideId: "2" }), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), notFound: jest.fn() }));
jest.mock("@/app/_hooks/useSupabaseSession", () => ({ useSupabaseSession: () => ({ token: "token", session: { user: { id: "owner", email: "test@example.com" } } }) }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));
jest.mock("@/utils/api", () => ({ api: { put: jest.fn(), get: jest.fn(), post: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_components/GuidedTour", () => ({ __esModule: true, default: () => null }));
jest.mock("../../_components/RideBasicForm", () => ({ __esModule: true, default: function BasicForm() {
  const { register } = useFormContext();
  return <input aria-label="行き先" {...register("destination")} />;
} }));

test("手動で選んだドライバーと子どもを保存し、保存結果の連絡へ進める", async () => {
  window.history.replaceState(null, "", "/admin/teams/1/rides/2#auto-assign");
  sessionStorage.clear();
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.open = false; });
  const candidate = { id: 7, type: "driver", direction: "both", seats: 1, availability: true, comment: null, guardian: { id: 10, name: "確認用保護者" } };
  const child = { id: 3, name: "確認用子ども", currentGrade: 3 };
  const savedDriver = { id: 20, availabilityDriverId: 7, direction: "outbound", type: "driver", seats: 1, availabilityDriver: candidate, rideAssignments: [{ id: 30, child }], escorts: [] };
  let ride = {
    id: 2, date: "2030-09-15T00:00:00Z", destination: "球場", meetingPlace: "学校", separateDirections: false,
    drivers: [] as typeof savedDriver[], availabilityDrivers: [candidate], children: [child],
    childAvailabilities: [{ childId: 3, availability: true, selfDriving: false }], guardians: [], deadline: null, pin: "1234",
  };
  const refresh = jest.fn(async () => {
    ride = { ...ride, drivers: [savedDriver] };
    return { ride };
  });
  (useFetch as jest.Mock).mockImplementation(() => ({ data: { ride }, mutate: refresh, isLoading: false }));
  (api.put as jest.Mock).mockResolvedValue({});
  try {
    const { container } = render(<Page />);
    await waitFor(() => expect(document.activeElement?.id).toBe("manual-assign"));
    expect(screen.queryByText(/自動割り当て/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Proプラン/)).not.toBeInTheDocument();
    expect(useFetch).not.toHaveBeenCalledWith(expect.stringContaining("billing"));
    expect(api.get).not.toHaveBeenCalled();
    const saveButton = screen.getByRole("button", { name: "変更を更新" });
    expect(saveButton.compareDocumentPosition(screen.getByRole("region", { name: "メンバーへの連絡" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ドライバー追加" }));
    fireEvent.change(container.querySelector('[name="drivers.0.availabilityDriverId"]')!, { target: { value: "7" } });
    fireEvent.click(await screen.findByRole("button", { name: "あと1人乗車できます" }));
    await waitFor(() => expect(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')).toBeInTheDocument());
    fireEvent.change(container.querySelector('[name="drivers.0.rideAssignments.0.childId"]')!, { target: { value: "3" } });
    fireEvent.click(saveButton);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/teams/1/rides/2", expect.objectContaining({ drivers: [expect.objectContaining({ availabilityDriverId: 7, rideAssignments: [{ childId: 3 }] })] }), "token"));
    await waitFor(() => expect(screen.getByRole("button", { name: "連絡する文面を確認" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "連絡する文面を確認" }));
    expect(screen.getByLabelText("共有する文面")).toHaveTextContent("球場");
    expect(screen.getByLabelText("共有する文面")).toHaveTextContent("/member/teams/1/rides/2");
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});
