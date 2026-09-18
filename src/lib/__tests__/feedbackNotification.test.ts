/** @jest-environment node */
import nodemailer from "nodemailer";
import { notifyFeedback } from "../feedbackNotification";

jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));
const sendMail = jest.fn();
const close = jest.fn();
const feedback = {
  id: 42, category: "改善要望", message: "通知を希望します。\nよろしくお願いします。",
  replyEmail: "customer@example.com", createdAt: new Date("2026-09-18T18:04:05Z"),
};
const originalPassword = process.env.CARPOOL_GMAIL_APP_PASSWORD;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CARPOOL_GMAIL_APP_PASSWORD = "test password";
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close });
  sendMail.mockResolvedValue({ accepted: ["carpool.app.2026@gmail.com"] });
});
afterAll(() => {
  if (originalPassword === undefined) delete process.env.CARPOOL_GMAIL_APP_PASSWORD;
  else process.env.CARPOOL_GMAIL_APP_PASSWORD = originalPassword;
});

test("送信先は運営に固定し、投稿者は返信先だけに設定する", async () => {
  await notifyFeedback(feedback);
  expect(sendMail).toHaveBeenCalledTimes(1);
  const email = sendMail.mock.calls[0][0];
  expect(email).toMatchObject({
    to: "carpool.app.2026@gmail.com",
    from: { address: "carpool.app.2026@gmail.com" },
    replyTo: { address: "customer@example.com" },
    subject: "【Carpool】フィードバック：改善要望（#42）",
  });
  expect(email.text).toContain(feedback.message);
  expect(email.text).toContain("2026/09/19");
  expect(email.text).toContain("3:04:05");
  expect(email.text).toContain("customer@example.com");
  expect(close).toHaveBeenCalledTimes(1);
});

test("返信先がなければReply-Toを付けずに通知する", async () => {
  await notifyFeedback({ ...feedback, replyEmail: null });
  expect(sendMail.mock.calls[0][0]).not.toHaveProperty("replyTo");
  expect(sendMail.mock.calls[0][0].text).toContain("返信先：記載なし");
});

test("TLSと待機時間制限を設定し、アプリパスワードの区切り空白を除く", async () => {
  await notifyFeedback(feedback);
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: "carpool.app.2026@gmail.com", pass: "testpassword" },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000, dnsTimeout: 8000,
    disableFileAccess: true, disableUrlAccess: true,
  }));
});

test("設定未完了では外部通信しない", async () => {
  delete process.env.CARPOOL_GMAIL_APP_PASSWORD;
  await expect(notifyFeedback(feedback)).rejects.toThrow("not configured");
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
});

test("送信失敗時も接続を閉じ、再送せずに呼び出し側へ失敗を返す", async () => {
  sendMail.mockRejectedValueOnce(new Error("SMTP unavailable"));
  await expect(notifyFeedback(feedback)).rejects.toThrow("SMTP unavailable");
  expect(close).toHaveBeenCalledTimes(1);
  expect(sendMail).toHaveBeenCalledTimes(1);
});

test("宛先が受け付けられなかった場合は失敗と扱う", async () => {
  sendMail.mockResolvedValueOnce({ accepted: [] });
  await expect(notifyFeedback(feedback)).rejects.toThrow("not accepted");
  expect(close).toHaveBeenCalledTimes(1);
});
