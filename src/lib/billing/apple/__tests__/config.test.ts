/** @jest-environment node */
import { generateKeyPairSync, X509Certificate } from "node:crypto";
import { Environment, SignedDataVerifier } from "@apple/app-store-server-library";
import { getAppleBillingConfig } from "../config";
import roots from "../rootCertificates.json";

const originalEnv = process.env;
const key = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
beforeEach(() => {
  process.env = { ...originalEnv, APPLE_IAP_ENABLED: "true", APPLE_IAP_ENVIRONMENT: "Production",
    APPLE_BUNDLE_ID: "test.carpool.app", APPLE_APP_ID: "123456789", APPLE_SUBSCRIPTION_GROUP_ID: "1234",
    APPLE_PRO_MONTHLY_PRODUCT_ID: "test.pro.monthly", APPLE_PRO_YEARLY_PRODUCT_ID: "test.pro.yearly",
    APPLE_IAP_KEY_ID: "ABCDEFGHIJ", APPLE_IAP_ISSUER_ID: "11111111-1111-4111-8111-111111111111", APPLE_IAP_PRIVATE_KEY: key };
});
afterEach(() => { process.env = originalEnv; });

test("必要設定とP256鍵が揃った場合だけ有効になる", () => {
  expect(getAppleBillingConfig()).toMatchObject({ environment: "Production", products: { monthly: "test.pro.monthly", yearly: "test.pro.yearly" } });
  delete process.env.APPLE_IAP_ENVIRONMENT;
  expect(getAppleBillingConfig()?.environment).toBe("Production");
});

test('審査用UUIDは明示されたサーバー設定だけを採用し不正な一覧は閉じる', () => {
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA,11111111-1111-4111-8111-111111111111';
  expect(getAppleBillingConfig()?.sandboxReviewAccountTokens).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111']);
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS += ',invalid';
  expect(getAppleBillingConfig()?.sandboxReviewAccountTokens).toEqual([]);
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = '*';
  expect(getAppleBillingConfig()?.sandboxReviewAccountTokens).toEqual([]);
});

test.each(["APPLE_IAP_ENABLED", "APPLE_BUNDLE_ID", "APPLE_APP_ID", "APPLE_SUBSCRIPTION_GROUP_ID",
  "APPLE_PRO_MONTHLY_PRODUCT_ID", "APPLE_PRO_YEARLY_PRODUCT_ID", "APPLE_IAP_KEY_ID", "APPLE_IAP_ISSUER_ID", "APPLE_IAP_PRIVATE_KEY"])(
  "%sが欠けた状態で購入を開放しない", (name) => { delete process.env[name]; expect(getAppleBillingConfig()).toBeNull(); },
);

test("未知の環境や同じ商品ID、不正な秘密鍵を許可しない", () => {
  process.env.APPLE_IAP_ENVIRONMENT = "Xcode";
  expect(getAppleBillingConfig()).toBeNull();
  process.env.APPLE_IAP_ENVIRONMENT = "Sandbox";
  expect(getAppleBillingConfig()?.environment).toBe("Sandbox");
  process.env.APPLE_PRO_YEARLY_PRODUCT_ID = process.env.APPLE_PRO_MONTHLY_PRODUCT_ID;
  expect(getAppleBillingConfig()).toBeNull();
  process.env.APPLE_PRO_YEARLY_PRODUCT_ID = "test.pro.yearly";
  process.env.APPLE_IAP_PRIVATE_KEY = "not-a-key";
  expect(getAppleBillingConfig()).toBeNull();
});

test("公式Apple G3ルート証明書を固定し、任意の証明書を設定で信頼しない", () => {
  const certificate = new X509Certificate(Buffer.from(roots[0], "base64"));
  expect(certificate.fingerprint256).toBe("63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79");
});

test("実際のApple SDKでもApple証明書を持たない偽造JWSを拒否する", async () => {
  const verifier = new SignedDataVerifier(roots.map((root) => Buffer.from(root, "base64")), true,
    Environment.PRODUCTION, "test.carpool.app", 123456789);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const forged = `${encode({ alg: "ES256", x5c: [] })}.${encode({ bundleId: "test.carpool.app", environment: "Production" })}.AA`;
  await expect(verifier.verifyAndDecodeTransaction(forged)).rejects.toThrow();
});
