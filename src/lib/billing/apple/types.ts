export type AppleEnvironment = "Production" | "Sandbox";

export interface AppleBillingConfig {
  environment: AppleEnvironment;
  sandboxReviewAccountTokens: string[];
  bundleId: string;
  appAppleId: number;
  subscriptionGroupId: string;
  products: { monthly: string; yearly: string };
  keyId: string;
  issuerId: string;
  privateKey: string;
}

export interface VerifiedAppleSubscription {
  environment: AppleEnvironment;
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  appAccountToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
  signedAt: Date;
  status: "active" | "expired" | "billing_retry" | "grace_period" | "revoked";
  isUpgraded: boolean;
  gracePeriodExpiresAt: Date | null;
}

export interface VerifiedAppleNotification {
  notificationId: string;
  notificationType: string;
  signedAt: Date;
  transaction: VerifiedAppleSubscription | null;
}

export type AppleBillingErrorCode = "not_configured" | "invalid_purchase" | "account_mismatch" | "verification_unavailable";

export class AppleBillingError extends Error {
  readonly status: 400 | 403 | 503;

  constructor(readonly code: AppleBillingErrorCode) {
    const messages: Record<AppleBillingErrorCode, string> = {
      not_configured: "アプリ内購入の準備が完了していません。",
      invalid_purchase: "この購入情報を確認できませんでした。",
      account_mismatch: "この購入は別のCarpoolアカウントに紐付いています。購入時のアカウントでログインしてください。",
      verification_unavailable: "Appleの購入確認を完了できませんでした。時間をおいて、購入の復元をお試しください。",
    };
    super(messages[code]);
    this.name = "AppleBillingError";
    this.status = code === "account_mismatch" ? 403 : code === "invalid_purchase" ? 400 : 503;
  }
}
