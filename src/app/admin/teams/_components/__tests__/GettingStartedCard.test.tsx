import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { GettingStartedContent, getGettingStartedAction } from "../GettingStartedCard";
import type { GettingStartedResponse } from "@/app/_types/response/gettingStartedResponse";

jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));

const empty: GettingStartedResponse = { memberCount: 0, childCount: 0, ride: null, hasTriedAutoAssign: false };
const ride = { id: 8, date: "2026-09-12T00:00:00.000Z", destination: "体育館", driverCount: 0, isAnswerLocked: false };

describe("初回の次の手順", () => {
  it("家族なしは新規登録、子どものみ不足なら既存家族一覧へ進む", () => {
    expect(getGettingStartedAction("4", empty).href).toBe("/admin/teams/4/members/new");
    expect(getGettingStartedAction("4", { ...empty, memberCount: 1 }).href).toBe("/admin/teams/4/members");
  });
  it("次の日程がなければ配車を作成する", () => {
    expect(getGettingStartedAction("4", { ...empty, memberCount: 1, childCount: 1 }).href).toBe("/admin/teams/4/rides/new");
  });
  it("回答なしは依頼、ロック中は期限、候補ありは自動割り当てへ進む", () => {
    const data = { ...empty, memberCount: 1, childCount: 1, ride };
    expect(getGettingStartedAction("4", data).href).toContain("/8#share-request");
    expect(getGettingStartedAction("4", { ...data, ride: { ...ride, isAnswerLocked: true } }).href).toContain("/8#answer-deadline");
    expect(getGettingStartedAction("4", { ...data, ride: { ...ride, driverCount: 1 } }).href).toContain("/8#auto-assign");
  });
  it("現在の手順と対象日程が表示され、主操作は1つだけ", () => {
    render(<GettingStartedContent teamId="4" data={{ ...empty, memberCount: 1, childCount: 1, ride }} />);
    expect(screen.getByRole("link", { name: "回答依頼へ進む" })).toHaveAttribute("href", "/admin/teams/4/rides/8#share-request");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("回答を集める").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/対象：9\/12 · 体育館/)).toBeInTheDocument();
  });
  it("試用済みは初回案内を繰り返さない", () => {
    render(<GettingStartedContent teamId="4" data={{ ...empty, hasTriedAutoAssign: true }} />);
    expect(screen.queryByRole("region", { name: "はじめての配車" })).not.toBeInTheDocument();
  });
});
