import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SettlementDetailResponse, SettlementDraft } from "@/app/_types/settlement";
import { api } from "@/utils/api";
import Page from "../page";

const mutate = jest.fn();
const useFetch = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ teamId: "10", settlementId: "20" }),
}));

jest.mock("@/app/_hooks/useFetch", () => ({
  useFetch: (...args: unknown[]) => useFetch(...args),
}));

jest.mock("@/app/_hooks/useSupabaseSession", () => ({
  useSupabaseSession: () => ({ token: "test-token" }),
}));

jest.mock("@/utils/api", () => ({
  api: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const draft: SettlementDraft = {
  allocationMethod: "equal",
  sourceFingerprint: "source-v1",
  families: [
    {
      memberId: 1,
      memberName: "田中家",
      isIncluded: true,
      children: [
        { childId: 11, childName: "太郎", isSelected: true, sourceStatus: "assigned" },
        { childId: 12, childName: "花子", isSelected: false, sourceStatus: "unassigned" },
      ],
    },
    {
      memberId: 2,
      memberName: "佐藤家",
      isIncluded: true,
      children: [
        { childId: 21, childName: "一郎", isSelected: true, sourceStatus: "assigned" },
      ],
    },
  ],
  expenses: [
    { id: "expense-1", category: "toll", description: "往復", amount: 3000, payerMemberId: 1 },
  ],
};

const calculation = {
  totalCost: 3000,
  totalWeight: 2,
  teamAdvanceAmount: 0,
  families: [
    { memberId: 1, weight: 1, burdenAmount: 1500, advanceAmount: 3000, receivedNetAmount: 0, remainingAmount: -1500 },
    { memberId: 2, weight: 1, burdenAmount: 1500, advanceAmount: 0, receivedNetAmount: 0, remainingAmount: 1500 },
  ],
  isComplete: false,
};

function response(status: "draft" | "pending" = "draft", version = 1): SettlementDetailResponse {
  const revision = status === "draft" ? null : {
    revision: 1,
    snapshot: { ...draft, source: { rideId: 30, date: "2026-09-20T00:00:00.000Z", destination: "○○球場" }, calculation },
    totalAmount: 3000,
    correctionReason: null,
    createdAt: "2026-09-13T10:00:00.000Z",
  };
  return {
    status: "OK",
    settlement: {
      id: 20,
      teamId: 10,
      rideId: 30,
      sourceDate: "2026-09-20T00:00:00.000Z",
      sourceDestination: "○○球場",
      status,
      version,
      currentRevisionNumber: revision?.revision ?? null,
      voidReason: null,
      sourceChanged: false,
      draft: status === "draft" ? draft : null,
      currentRevision: revision,
      revisions: revision ? [revision] : [],
      movements: [],
      calculation: status === "draft" ? null : calculation,
      access: {
        state: status === "draft" ? "free_trial" : "history",
        canEdit: true,
        freeTrialSettlementId: 20,
        freeTrialConsumed: status !== "draft",
        monthlyPrice: 980,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useFetch.mockReturnValue({ data: response(), error: undefined, isLoading: false, mutate });
  (api.patch as jest.Mock).mockResolvedValue(response("draft", 2));
  (api.post as jest.Mock).mockResolvedValue(response("pending", 3));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

test("スマホ向けの入力順で家庭・子ども・費用を編集して確認計算できる", () => {
  render(<Page />);

  expect(screen.getByRole("heading", { name: "○○球場" })).toBeInTheDocument();
  expect(screen.getByText("この遠征は無料体験の対象です")).toBeInTheDocument();
  expect(screen.getByLabelText("田中家")).toBeChecked();
  expect(screen.getByLabelText("太郎")).toBeChecked();

  fireEvent.click(screen.getByLabelText("花子"));
  fireEvent.click(screen.getByRole("button", { name: "確認計算" }));

  expect(screen.getAllByText("3,000円").length).toBeGreaterThan(0);
  expect(screen.getByText("対象家庭と立替額を確認しました")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /この金額で確定/ })).toBeDisabled();
});

test("別遠征で無料体験中の下書きは編集を止め、対象変更を選べる", async () => {
  const blocked = response();
  blocked.settlement.access = {
    state: "subscription_required",
    canEdit: false,
    freeTrialSettlementId: 19,
    freeTrialConsumed: false,
    monthlyPrice: 980,
  };
  useFetch.mockReturnValue({ data: blocked, error: undefined, isLoading: false, mutate });
  (api.post as jest.Mock).mockResolvedValue(response());

  render(<Page />);

  expect(screen.getByText("無料体験は別の遠征で利用中です")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "確認計算" })).not.toBeInTheDocument();
  expect(screen.getByText(/月980円／チームの精算プランが必要です。/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "無料体験をこの遠征へ変更" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/10/rides/30/settlement",
    { moveFreeTrial: true },
    "test-token",
  ));
});

test("精算プラン契約中は無料対象外の下書きも編集できる", () => {
  const subscribed = response();
  subscribed.settlement.access = {
    state: "subscribed",
    canEdit: true,
    freeTrialSettlementId: 19,
    freeTrialConsumed: true,
    monthlyPrice: 980,
    subscriptionStatus: "active",
  };
  useFetch.mockReturnValue({ data: subscribed, error: undefined, isLoading: false, mutate });

  render(<Page />);

  expect(screen.getByText("精算プランを利用中です")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "確認計算" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "支払い管理を開く" })).toBeEnabled();
});

test("その他交通費は説明がなければ計算しない", () => {
  render(<Page />);

  fireEvent.change(screen.getByLabelText("種別"), { target: { value: "other" } });
  fireEvent.change(screen.getByLabelText("説明（必須）"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "確認計算" }));

  expect(screen.getByRole("alert")).toHaveTextContent("その他交通費の説明を入力してください");
  expect(screen.queryByText("対象家庭と立替額を確認しました")).not.toBeInTheDocument();
});

test("下書きをversion付きで保存する", async () => {
  render(<Page />);

  fireEvent.change(screen.getByLabelText("金額（円）"), { target: { value: "4000" } });
  fireEvent.click(screen.getByRole("button", { name: "下書き保存" }));

  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
  expect(api.patch).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20",
    expect.objectContaining({
      version: 1,
      draft: expect.objectContaining({ expenses: expect.arrayContaining([expect.objectContaining({ amount: 4000 })]) }),
    }),
    "test-token",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("下書きを保存しました");
});

test("金額0円やその他説明の入力途中でも下書き保存できる", async () => {
  render(<Page />);

  fireEvent.change(screen.getByLabelText("種別"), { target: { value: "other" } });
  fireEvent.change(screen.getByLabelText("金額（円）"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("説明（必須）"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "下書き保存" }));

  await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20",
    expect.objectContaining({
      version: 1,
      draft: expect.objectContaining({
        expenses: expect.arrayContaining([expect.objectContaining({ category: "other", amount: 0, description: "" })]),
      }),
    }),
    "test-token",
  ));
  expect(api.post).not.toHaveBeenCalled();
});

test("最新の下書きを保存してから確定する", async () => {
  render(<Page />);

  fireEvent.click(screen.getByRole("button", { name: "確認計算" }));
  fireEvent.click(screen.getByLabelText("対象家庭と立替額を確認しました"));
  fireEvent.click(screen.getByRole("button", { name: /この金額で確定/ }));

  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  expect(api.patch).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20",
    expect.objectContaining({ version: 1 }),
    "test-token",
  );
  expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20/confirm",
    { version: 2, correctionReason: "", acceptSourceChanges: false },
    "test-token",
  );
});

test("確定後は家庭別の全額記録と連絡文コピーができる", async () => {
  useFetch.mockReturnValue({ data: response("pending", 3), error: undefined, isLoading: false, mutate });
  render(<Page />);

  expect(screen.getByText("1,500円を受け取る")).toBeInTheDocument();
  expect(screen.getByText("1,500円を支払う")).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "返金を記録" })[0]);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20/movements",
    expect.objectContaining({ version: 3, memberId: 1, type: "refund", amount: 1500 }),
    "test-token",
  ));

  fireEvent.click(screen.getAllByRole("button", { name: "連絡文コピー" })[1]);
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("佐藤家の負担額1,500円")));
});

test("確定後は残額の一部だけを受領記録できる", async () => {
  useFetch.mockReturnValue({ data: response("pending", 3), error: undefined, isLoading: false, mutate });
  render(<Page />);

  fireEvent.change(screen.getByLabelText("佐藤家の記録額"), { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("button", { name: "受領を記録" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20/movements",
    expect.objectContaining({ version: 3, memberId: 2, type: "receipt", amount: 1000 }),
    "test-token",
  ));
});

test("確定版から訂正用下書きを作成する", async () => {
  const current = response("pending", 3);
  const amended = response("pending", 4);
  amended.settlement.draft = draft;
  useFetch.mockReturnValue({ data: current, error: undefined, isLoading: false, mutate });
  (api.post as jest.Mock).mockResolvedValue(amended);
  render(<Page />);

  fireEvent.click(screen.getByRole("button", { name: "訂正する" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    "/api/admin/teams/10/settlements/20/amend",
    { version: 3 },
    "test-token",
  ));
});

test("配車変更後は再取込か現在対象の確認まで確定させない", () => {
  const changed = response("draft", 1);
  changed.settlement.sourceChanged = true;
  useFetch.mockReturnValue({ data: changed, error: undefined, isLoading: false, mutate });
  render(<Page />);

  fireEvent.click(screen.getByRole("button", { name: "確認計算" }));
  fireEvent.click(screen.getByLabelText("対象家庭と立替額を確認しました"));
  expect(screen.getByRole("button", { name: "この金額で確定" })).toBeDisabled();

  fireEvent.click(screen.getByLabelText("現在の精算対象を確認し、このまま使う"));
  expect(screen.getByRole("button", { name: "この金額で確定" })).toBeEnabled();
});
