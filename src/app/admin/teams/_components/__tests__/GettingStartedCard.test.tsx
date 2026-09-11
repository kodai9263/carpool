import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import GettingStartedCard, { GettingStartedContent, getGettingStartedAction } from "../GettingStartedCard";
import { useFetch } from "@/app/_hooks/useFetch";
import type { GettingStartedResponse } from "@/app/_types/response/gettingStartedResponse";

jest.mock("@/utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));

const empty: GettingStartedResponse = { memberCount: 0, childCount: 0, ride: null };
const ride = { id: 8, date: "2026-09-12T00:00:00.000Z", destination: "体育館", driverCount: 0, isAnswerLocked: false, hasSavedAssignments: false };

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
  it("割り当ての保存前はガイドを表示し、保存まで案内する", () => {
    render(<GettingStartedContent teamId="4" data={{ ...empty, memberCount: 1, childCount: 1, ride: { ...ride, driverCount: 1 } }} />);
    expect(screen.getByRole("region", { name: "次の配車の準備" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "配車を割り当てる" })).toHaveAttribute("href", "/admin/teams/4/rides/8#auto-assign");
    expect(screen.getByText(/「変更を更新」で保存/)).toBeInTheDocument();
  });
  it("一部の保存を全員分の完成とは扱わず、確認と結果連絡へ案内する", () => {
    render(<GettingStartedContent teamId="4" data={{ ...empty, memberCount: 1, childCount: 1, ride: { ...ride, hasSavedAssignments: true, isAnswerLocked: true } }} />);
    expect(screen.getByRole("link", { name: "配車を確認して連絡する" })).toHaveAttribute("href", "/admin/teams/4/rides/8#share-final");
    expect(screen.getByText("結果を連絡").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/乗せ忘れや行き帰り/)).toBeInTheDocument();
    expect(screen.queryByText("完了")).not.toBeInTheDocument();
  });
});


describe("配車画面の家族登録案内", () => {
  it.each([[0, 0, "家族を登録する"], [1, 0, "家族一覧を開く"]])("家族%s件・子ども%s人なら必要な登録先へ案内する", (memberCount, childCount, label) => {
    (useFetch as jest.Mock).mockReturnValue({ data: { ...empty, memberCount, childCount }, mutate: jest.fn() });
    render(<GettingStartedCard teamId="4" familyRegistrationOnly />);
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });
  it("登録済みなら大きな初回案内を出さず家族への入口を残す", () => {
    (useFetch as jest.Mock).mockReturnValue({ data: { ...empty, memberCount: 1, childCount: 1 }, mutate: jest.fn() });
    render(<GettingStartedCard teamId="4" familyRegistrationOnly />);
    expect(screen.queryByRole("region", { name: "次の配車の準備" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "家族を追加・確認" })).toHaveAttribute("href", "/admin/teams/4/members");
  });
  it("読込失敗を未登録と判定せず再読み込みを案内する", () => {
    (useFetch as jest.Mock).mockReturnValue({ error: new Error("fetch failed"), mutate: jest.fn() });
    render(<GettingStartedCard teamId="4" familyRegistrationOnly />);
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "家族を登録する" })).not.toBeInTheDocument();
  });
});
