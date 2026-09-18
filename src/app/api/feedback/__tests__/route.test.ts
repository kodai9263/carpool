/** @jest-environment node */
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { notifyFeedback } from "@/lib/feedbackNotification";
import { POST } from "../route";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ auth: { getUser: jest.fn() } })),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    feedback: { create: jest.fn() },
    admin: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/feedbackNotification", () => ({ notifyFeedback: jest.fn() }));

const getUser = (createClient as jest.Mock).mock.results[0].value.auth.getUser as jest.Mock;
const validBody = { category: "改善要望", message: "通知があると助かります" };
const savedFeedback = {
  id: 81,
  ...validBody,
  replyEmail: null,
  adminId: null,
  createdAt: new Date("2026-09-19T03:00:00.000Z"),
};
const request = (body: unknown = validBody, token?: string) =>
  new NextRequest("https://app.example/api/feedback", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.feedback.create as jest.Mock).mockResolvedValue(savedFeedback);
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue(null);
  getUser.mockResolvedValue({ data: { user: null } });
  (notifyFeedback as jest.Mock).mockResolvedValue(undefined);
});

test("未ログインでも保存したフィードバックを一度通知する", async () => {
  const response = await POST(request());

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true });
  expect(prisma.feedback.create).toHaveBeenCalledWith({
    data: { ...validBody, replyEmail: null, adminId: null },
  });
  expect(notifyFeedback).toHaveBeenCalledTimes(1);
  expect(notifyFeedback).toHaveBeenCalledWith(savedFeedback);
  expect(getUser).not.toHaveBeenCalled();
});

test("本文と返信先の前後の空白を取り除いて保存する", async () => {
  await POST(request({ ...validBody, message: "  本文です\n", replyEmail: " person@example.com " }));

  expect(prisma.feedback.create).toHaveBeenCalledWith({
    data: {
      category: validBody.category,
      message: "本文です",
      replyEmail: "person@example.com",
      adminId: null,
    },
  });
});

test.each([undefined, "", "   "])("返信先が空ならnullで保存する (%s)", async (replyEmail) => {
  const response = await POST(request({ ...validBody, replyEmail }));

  expect(response.status).toBe(201);
  expect(prisma.feedback.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ replyEmail: null }),
  });
});

test("認証できた管理者のIDを保存する", async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: "supabase-user-9" } } });
  (prisma.admin.findUnique as jest.Mock).mockResolvedValueOnce({ id: 9 });

  const response = await POST(request(validBody, "test-token"));

  expect(response.status).toBe(201);
  expect(getUser).toHaveBeenCalledWith("test-token");
  expect(prisma.admin.findUnique).toHaveBeenCalledWith({ where: { supabaseUid: "supabase-user-9" } });
  expect(prisma.feedback.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ adminId: 9 }),
  });
  expect(notifyFeedback).toHaveBeenCalledTimes(1);
});

test("期限切れトークンでも匿名フィードバックとして受け付ける", async () => {
  const response = await POST(request(validBody, "expired-token"));

  expect(response.status).toBe(201);
  expect(prisma.admin.findUnique).not.toHaveBeenCalled();
  expect(prisma.feedback.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ adminId: null }),
  });
});

test("保存できなかった場合は通知せず500を返す", async () => {
  (prisma.feedback.create as jest.Mock).mockRejectedValueOnce(new Error("database unavailable"));

  const response = await POST(request());

  expect(response.status).toBe(500);
  expect(notifyFeedback).not.toHaveBeenCalled();
});

test("メール送信が失敗しても保存成功を返し、ログに本文や送信エラーを出さない", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  (notifyFeedback as jest.Mock).mockRejectedValueOnce(new Error("secret-smtp-error"));

  try {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.feedback.create).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("[feedback-notification] delivery_failed", { feedbackId: 81 });
  } finally {
    errorSpy.mockRestore();
  }
});

test("通知処理が完了するまでレスポンスを返さない", async () => {
  let finishNotification!: () => void;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const delivery = new Promise<void>((resolve) => { finishNotification = resolve; });
  (notifyFeedback as jest.Mock).mockImplementationOnce(() => {
    markStarted();
    return delivery;
  });
  let responded = false;
  const responsePromise = POST(request()).then((response) => {
    responded = true;
    return response;
  });

  await started;
  await Promise.resolve();
  expect(responded).toBe(false);
  finishNotification();
  expect((await responsePromise).status).toBe(201);
});

test("壊れたJSONでは保存も通知もしない", async () => {
  const response = await POST(new NextRequest("https://app.example/api/feedback", {
    method: "POST",
    body: "{broken",
  }));

  expect(response.status).toBe(400);
  expect(prisma.feedback.create).not.toHaveBeenCalled();
  expect(notifyFeedback).not.toHaveBeenCalled();
});

test.each([
  ["null", null],
  ["配列", []],
  ["文字列", "feedback"],
  ["数値", 12],
  ["カテゴリ未指定", { message: "本文" }],
  ["不明なカテゴリ", { ...validBody, category: "不明" }],
  ["カテゴリの型違い", { ...validBody, category: 1 }],
  ["本文未指定", { category: "その他" }],
  ["空白だけの本文", { ...validBody, message: " \n " }],
  ["本文の型違い", { ...validBody, message: { text: "本文" } }],
  ["1001文字の本文", { ...validBody, message: "あ".repeat(1001) }],
  ["返信先の型違い", { ...validBody, replyEmail: 12 }],
  ["返信先が配列", { ...validBody, replyEmail: ["person@example.com"] }],
  ["不正な返信先", { ...validBody, replyEmail: "not-an-email" }],
  ["長すぎる返信先", { ...validBody, replyEmail: `${"a".repeat(244)}@example.com` }],
  ["複数の返信先", { ...validBody, replyEmail: "one@example.com,two@example.com" }],
  ["改行を含む返信先", { ...validBody, replyEmail: "person@example.com\r\nBcc: other@example.com" }],
])("不正な入力は保存も通知もしない: %s", async (_label, body) => {
  const response = await POST(request(body));

  expect(response.status).toBe(400);
  expect(prisma.feedback.create).not.toHaveBeenCalled();
  expect(notifyFeedback).not.toHaveBeenCalled();
});

test("上限1000文字の本文は受け付ける", async () => {
  const response = await POST(request({ ...validBody, message: "あ".repeat(1000) }));

  expect(response.status).toBe(201);
  expect(notifyFeedback).toHaveBeenCalledTimes(1);
});
