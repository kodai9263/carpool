import { createPrivateKey } from "node:crypto";
import type { AppleBillingConfig } from "./types";
import { APPLE_ACCOUNT_TOKEN_PATTERN, getAppleSandboxReviewAccountTokens } from "@/utils/appleEnvironment";
export { APPLE_ACCOUNT_TOKEN_PATTERN } from "@/utils/appleEnvironment";

// 秘密鍵を含む設定はサーバー専用。APIにはproducts等の公開項目だけを明示して返す。
export function getAppleBillingConfig(): AppleBillingConfig | null {
  if (process.env.APPLE_IAP_ENABLED !== "true") return null;
  const environment = process.env.APPLE_IAP_ENVIRONMENT || "Production";
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim() ?? "";
  const appId = process.env.APPLE_APP_ID?.trim() ?? "";
  const subscriptionGroupId = process.env.APPLE_SUBSCRIPTION_GROUP_ID?.trim() ?? "";
  const monthly = process.env.APPLE_PRO_MONTHLY_PRODUCT_ID?.trim() ?? "";
  const yearly = process.env.APPLE_PRO_YEARLY_PRODUCT_ID?.trim() ?? "";
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim() ?? "";
  const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim() ?? "";
  const privateKey = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ?? "";
  const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]{1,254}$/;
  if ((environment !== "Production" && environment !== "Sandbox")
    || !identifier.test(bundleId) || !bundleId.includes(".")
    || !/^\d{1,16}$/.test(appId) || !Number.isSafeInteger(Number(appId)) || Number(appId) <= 0
    || !/^\d{1,32}$/.test(subscriptionGroupId)
    || !identifier.test(monthly) || !identifier.test(yearly) || monthly === yearly
    || !/^[A-Z0-9]{10}$/.test(keyId) || !APPLE_ACCOUNT_TOKEN_PATTERN.test(issuerId)) return null;
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") return null;
  } catch { return null; }
  return { environment, sandboxReviewAccountTokens: getAppleSandboxReviewAccountTokens(), bundleId, appAppleId: Number(appId), subscriptionGroupId,
    products: { monthly, yearly }, keyId, issuerId, privateKey };
}
