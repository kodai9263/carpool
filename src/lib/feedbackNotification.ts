import nodemailer from "nodemailer";

const CARPOOL_EMAIL = "carpool.app.2026@gmail.com";

type FeedbackNotification = {
  id: number;
  category: string;
  message: string;
  replyEmail: string | null;
  createdAt: Date;
};

export async function notifyFeedback(feedback: FeedbackNotification): Promise<void> {
  const password = process.env.CARPOOL_GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!password) throw Object.assign(new Error("Feedback notification is not configured"), { code: "EMISSINGCONFIG" });

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: CARPOOL_EMAIL, pass: password },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
    dnsTimeout: 8000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    const result = await transport.sendMail({
      from: { name: "Carpool フィードバック通知", address: CARPOOL_EMAIL },
      to: CARPOOL_EMAIL,
      ...(feedback.replyEmail ? { replyTo: { address: feedback.replyEmail } } : {}),
      subject: `【Carpool】フィードバック：${feedback.category}（#${feedback.id}）`,
      text: [
        "Carpoolにフィードバックが届きました。",
        "",
        `受付番号：${feedback.id}`,
        `受付日時：${new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium",
        }).format(feedback.createdAt)}（日本時間）`,
        `カテゴリ：${feedback.category}`,
        `返信先：${feedback.replyEmail ?? "記載なし"}`,
        "",
        "【内容】",
        feedback.message,
        "",
        feedback.replyEmail
          ? "返信ボタンから、記載された返信先へ返信できます。"
          : "返信先の記載がないため、このメールから投稿者への返信はできません。",
      ].join("\n"),
    });
    if (!result.accepted.length) throw new Error("Feedback notification was not accepted");
  } finally {
    transport.close();
  }
}
