import { api } from "@/utils/api";
import { resolveGuestDemoEntry } from "@/utils/demoEntry";

jest.mock("@/utils/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedGet = api.get as jest.Mock;

describe("resolveGuestDemoEntry", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("割り当て完了済みの配車を優先する", async () => {
    mockedGet
      .mockResolvedValueOnce({ teams: [{ id: 10, teamName: "デモ" }] })
      .mockResolvedValueOnce({
        rides: [
          { id: 101, responseCount: 3, isAssignmentComplete: false },
          { id: 102, responseCount: 1, isAssignmentComplete: true },
        ],
      });

    await expect(resolveGuestDemoEntry("token")).resolves.toEqual({
      path: "/admin/teams/10/rides/102?demo=true",
      teamId: 10,
      rideId: 102,
    });
  });

  it("配車がないチームを飛ばして次のチームを確認する", async () => {
    mockedGet
      .mockResolvedValueOnce({
        teams: [
          { id: 10, teamName: "空" },
          { id: 20, teamName: "デモ" },
        ],
      })
      .mockResolvedValueOnce({ rides: [] })
      .mockResolvedValueOnce({ rides: [{ id: 201, responseCount: 0 }] });

    await expect(resolveGuestDemoEntry("token")).resolves.toEqual({
      path: "/admin/teams/20/rides/201?demo=true",
      teamId: 20,
      rideId: 201,
    });
  });

  it("デモデータがない場合はチーム一覧へ戻す", async () => {
    mockedGet.mockResolvedValueOnce({ teams: [] });

    await expect(resolveGuestDemoEntry("token")).resolves.toEqual({
      path: "/admin/teams",
    });
  });
});
