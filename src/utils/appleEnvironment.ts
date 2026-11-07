export const APPLE_ACCOUNT_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// サーバー設定だけを使用する。クライアントやユーザー編集可能なmetadataで審査権限を付与しない。
export function getAppleSandboxReviewAccountTokens(): string[] {
  const value = process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS?.trim();
  if (!value) return [];
  const tokens = value.split(',').map((token) => token.trim().toLowerCase());
  // 一部だけを採用せず、設定ミスがあれば検証用の例外をすべて閉じる。
  return tokens.every((token) => APPLE_ACCOUNT_TOKEN_PATTERN.test(token)) ? [...new Set(tokens)] : [];
}

export function isAppleEnvironmentAllowed(
  environment: string | null | undefined,
  accountToken: string | null | undefined,
  primaryEnvironment = process.env.APPLE_IAP_ENVIRONMENT ?? 'Production',
  reviewAccountTokens = getAppleSandboxReviewAccountTokens(),
) {
  if (primaryEnvironment !== 'Production' && primaryEnvironment !== 'Sandbox') return false;
  if (environment === primaryEnvironment) return true;
  return primaryEnvironment === 'Production' && environment === 'Sandbox' &&
    Boolean(accountToken && APPLE_ACCOUNT_TOKEN_PATTERN.test(accountToken) && reviewAccountTokens.includes(accountToken.toLowerCase()));
}
