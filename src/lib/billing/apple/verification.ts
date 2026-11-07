import {
  APIError, APIException, AppStoreServerAPIClient, Environment, SignedDataVerifier, Status,
  VerificationException, VerificationStatus,
  type JWSTransactionDecodedPayload, type JWSRenewalInfoDecodedPayload,
} from "@apple/app-store-server-library";
import roots from "./rootCertificates.json";
import { APPLE_ACCOUNT_TOKEN_PATTERN, getAppleBillingConfig } from "./config";
import { isAppleEnvironmentAllowed } from "@/utils/appleEnvironment";
import {
  AppleBillingError, type AppleBillingConfig, type VerifiedAppleNotification,
  type VerifiedAppleSubscription,
} from "./types";

const TRANSACTION_ID = /^\d{1,64}$/;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function invalid(): never { throw new AppleBillingError("invalid_purchase"); }
function validDate(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value < 8_640_000_000_000_000;
}
function requireJws(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length > 100_000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) invalid();
}

function requireConfig() {
  const config = getAppleBillingConfig();
  if (!config) throw new AppleBillingError("not_configured");
  return config;
}

function createClients(config: AppleBillingConfig) {
  const environment = config.environment === "Production" ? Environment.PRODUCTION : Environment.SANDBOX;
  // Apple公式CAから取得した公開DER証明書。オンライン失効確認も無効化しない。
  // https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
  const verifier = new SignedDataVerifier(roots.map((root) => Buffer.from(root, "base64")), true,
    environment, config.bundleId, config.appAppleId);
  const client = new AppStoreServerAPIClient(config.privateKey, config.keyId, config.issuerId, config.bundleId, environment);
  return { config, verifier, client };
}

// 未検証payloadは接続先の選択にだけ使う。権限は必ずこの後のApple署名・所有者検証で判断する。
function sandboxHint(jws: string, notification = false): boolean {
  requireJws(jws);
  try {
    const payload = JSON.parse(Buffer.from(jws.split('.')[1], 'base64url').toString('utf8'));
    return (notification ? payload?.data?.environment : payload?.environment) === 'Sandbox';
  } catch { return false; }
}

function sandboxAllowed(config: AppleBillingConfig, owner: string) {
  return isAppleEnvironmentAllowed('Sandbox', owner, config.environment, config.sandboxReviewAccountTokens);
}

function requireAllowedOwner(config: AppleBillingConfig, environment: string, owner: string) {
  if (!isAppleEnvironmentAllowed(environment, owner, config.environment, config.sandboxReviewAccountTokens)) invalid();
}

type Clients = ReturnType<typeof createClients>;

// Apple署名を検証した値だけを受け取る。クライアントのJSONはこの関数に渡さない。
export function normalizeVerifiedAppleTransaction(
  value: JWSTransactionDecodedPayload, config: AppleBillingConfig, now = Date.now(),
): Omit<VerifiedAppleSubscription, "status" | "gracePeriodExpiresAt"> {
  if (value.bundleId !== config.bundleId || value.environment !== config.environment
    || value.subscriptionGroupIdentifier !== config.subscriptionGroupId
    || !value.productId || !Object.values(config.products).includes(value.productId)
    || value.type !== "Auto-Renewable Subscription" || value.inAppOwnershipType !== "PURCHASED"
    || !value.transactionId || !TRANSACTION_ID.test(value.transactionId)
    || !value.originalTransactionId || !TRANSACTION_ID.test(value.originalTransactionId)
    || !value.appAccountToken || !APPLE_ACCOUNT_TOKEN_PATTERN.test(value.appAccountToken)
    || !validDate(value.expiresDate) || !validDate(value.purchaseDate) || !validDate(value.signedDate)
    || value.purchaseDate > value.expiresDate || value.purchaseDate > now + FUTURE_TOLERANCE_MS
    || value.signedDate > now + FUTURE_TOLERANCE_MS
    || (value.revocationDate !== undefined && (!validDate(value.revocationDate) || value.revocationDate > now + FUTURE_TOLERANCE_MS))) invalid();
  return {
    environment: config.environment, originalTransactionId: value.originalTransactionId,
    transactionId: value.transactionId, productId: value.productId,
    appAccountToken: value.appAccountToken.toLowerCase(), expiresAt: new Date(value.expiresDate),
    revokedAt: value.revocationDate === undefined ? null : new Date(value.revocationDate),
    signedAt: new Date(value.signedDate), isUpgraded: value.isUpgraded === true,
  };
}

async function decodeTransaction(jws: string, { verifier, config }: Clients) {
  requireJws(jws);
  return normalizeVerifiedAppleTransaction(await verifier.verifyAndDecodeTransaction(jws), config);
}

function requireOwner(actual: string, expected: string) {
  if (!APPLE_ACCOUNT_TOKEN_PATTERN.test(expected) || actual !== expected.toLowerCase()) {
    throw new AppleBillingError("account_mismatch");
  }
}

function renewalDetails(
  value: JWSRenewalInfoDecodedPayload, transaction: ReturnType<typeof normalizeVerifiedAppleTransaction>,
  config: AppleBillingConfig,
) {
  if (value.environment !== config.environment || value.originalTransactionId !== transaction.originalTransactionId
    || value.productId !== transaction.productId || !validDate(value.signedDate)
    || value.signedDate > Date.now() + FUTURE_TOLERANCE_MS
    || (value.appAccountToken !== undefined && value.appAccountToken.toLowerCase() !== transaction.appAccountToken)
    || (value.gracePeriodExpiresDate !== undefined && !validDate(value.gracePeriodExpiresDate))) invalid();
  return {
    signedAt: new Date(Math.max(transaction.signedAt.getTime(), value.signedDate)),
    gracePeriodExpiresAt: value.gracePeriodExpiresDate === undefined ? null : new Date(value.gracePeriodExpiresDate),
  };
}

async function currentSubscription(
  original: ReturnType<typeof normalizeVerifiedAppleTransaction>, expectedOwner: string, clients: Clients,
): Promise<VerifiedAppleSubscription> {
  requireOwner(original.appAccountToken, expectedOwner);
  const { client, config, verifier } = clients;
  // 古い有効なJWSを再送しても返金・失効を取り消せないよう、必ずAppleの現在状態を取得する。
  const response = await client.getAllSubscriptionStatuses(original.originalTransactionId);
  if (response.environment !== config.environment || response.bundleId !== config.bundleId
    || (config.environment === "Production" && response.appAppleId !== config.appAppleId)
    || (response.appAppleId !== undefined && response.appAppleId !== config.appAppleId)) invalid();
  const matching = (response.data ?? []).filter((group) => group.subscriptionGroupIdentifier === config.subscriptionGroupId)
    .flatMap((group) => group.lastTransactions ?? [])
    .filter((item) => item.originalTransactionId === original.originalTransactionId);
  if (matching.length !== 1) throw new AppleBillingError("verification_unavailable");
  const item = matching[0];
  if (!item.signedTransactionInfo) invalid();
  const current = await decodeTransaction(item.signedTransactionInfo, clients);
  if (current.originalTransactionId !== original.originalTransactionId) invalid();
  requireOwner(current.appAccountToken, expectedOwner);
  let dates = { signedAt: current.signedAt, gracePeriodExpiresAt: null as Date | null };
  if (item.signedRenewalInfo) {
    requireJws(item.signedRenewalInfo);
    dates = renewalDetails(await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo), current, config);
  }
  const statuses: Record<number, VerifiedAppleSubscription["status"]> = {
    [Status.ACTIVE]: "active", [Status.EXPIRED]: "expired", [Status.BILLING_RETRY]: "billing_retry",
    [Status.BILLING_GRACE_PERIOD]: "grace_period", [Status.REVOKED]: "revoked",
  };
  if (item.status === undefined || !Object.hasOwn(statuses, item.status)) invalid();
  const status = current.revokedAt ? "revoked" : statuses[item.status];
  if (status === "grace_period" && !dates.gracePeriodExpiresAt) invalid();
  return { ...current, ...dates, status };
}

async function verified<T>(work: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AppleBillingError("verification_unavailable")), 15_000);
      }),
    ]);
  } catch (error) {
    if (error instanceof AppleBillingError) throw error;
    if (error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) invalid();
    // SDKの例外にはリクエスト情報が含まれ得るため、クライアントへ渡さず共通の文言にする。
    throw new AppleBillingError("verification_unavailable");
  } finally { clearTimeout(timer); }
}

export function verifyApplePurchase(
  input: { signedTransaction?: string; transactionId?: string }, expectedAppAccountToken: string,
): Promise<VerifiedAppleSubscription> {
  return verified(async () => {
    const config = requireConfig();
    let clients = createClients(config);
    let jws = input.signedTransaction;
    if (jws && config.environment === 'Production' && sandboxHint(jws)) {
      if (!sandboxAllowed(config, expectedAppAccountToken)) invalid();
      clients = createClients({ ...config, environment: 'Sandbox' });
    }
    if (!jws) {
      if (!input.transactionId || !TRANSACTION_ID.test(input.transactionId)) invalid();
      let result;
      try { result = await clients.client.getTransactionInfo(input.transactionId); }
      catch (error) {
        // AppleがProductionに取引なしと回答した場合だけ、許可された審査アカウントを再確認する。
        if (config.environment !== 'Production' || !sandboxAllowed(config, expectedAppAccountToken)
          || !(error instanceof APIException) || error.apiError !== APIError.TRANSACTION_ID_NOT_FOUND) throw error;
        clients = createClients({ ...config, environment: 'Sandbox' });
        result = await clients.client.getTransactionInfo(input.transactionId);
      }
      jws = result.signedTransactionInfo;
      if (!jws) invalid();
    }
    const transaction = await decodeTransaction(jws, clients);
    requireAllowedOwner(config, transaction.environment, expectedAppAccountToken);
    if (input.transactionId !== undefined && input.transactionId !== transaction.transactionId) invalid();
    return currentSubscription(transaction, expectedAppAccountToken, clients);
  });
}

export function verifyAppleNotification(signedPayload: string): Promise<VerifiedAppleNotification> {
  return verified(async () => {
    requireJws(signedPayload);
    const config = requireConfig();
    const sandbox = config.environment === 'Production' && sandboxHint(signedPayload, true);
    if (sandbox && config.sandboxReviewAccountTokens.length === 0) invalid();
    const clients = createClients(sandbox ? { ...config, environment: 'Sandbox' } : config);
    const notification = await clients.verifier.verifyAndDecodeNotification(signedPayload);
    if (!notification.notificationUUID || !APPLE_ACCOUNT_TOKEN_PATTERN.test(notification.notificationUUID)
      || !notification.notificationType || !validDate(notification.signedDate)
      || notification.signedDate > Date.now() + FUTURE_TOLERANCE_MS) invalid();
    const signedTransaction = notification.data?.signedTransactionInfo;
    let transaction: VerifiedAppleSubscription | null = null;
    if (signedTransaction) {
      const original = await decodeTransaction(signedTransaction, clients);
      requireAllowedOwner(config, original.environment, original.appAccountToken);
      transaction = await currentSubscription(original, original.appAccountToken, clients);
    }
    return { notificationId: notification.notificationUUID, notificationType: notification.notificationType,
      signedAt: new Date(notification.signedDate), transaction };
  });
}
