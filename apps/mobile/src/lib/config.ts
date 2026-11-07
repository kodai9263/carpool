export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  webBaseUrl: process.env.EXPO_PUBLIC_WEB_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

function isServerUrl(value: string) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash &&
      (url.protocol === 'https:' || (__DEV__ && url.protocol === 'http:'));
  } catch {
    return false;
  }
}

export const isAppConfigured = Boolean(
  env.supabaseAnonKey && isServerUrl(env.supabaseUrl) &&
  isServerUrl(env.apiBaseUrl) && isServerUrl(env.webBaseUrl),
);
