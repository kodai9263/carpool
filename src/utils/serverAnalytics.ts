type ServerAnalyticsValue = string | number | boolean | null | undefined;

type ServerAnalyticsParams = Record<string, ServerAnalyticsValue>;

type AnalyticsRequest = {
  cookies: {
    get(name: string): { value: string } | undefined;
  };
};

const measurementId = process.env.GA4_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GA_ID;
const apiSecret = process.env.GA4_MEASUREMENT_API_SECRET;
const excludedAdminIds = process.env.ANALYTICS_EXCLUDED_ADMIN_IDS ?? "4";

const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

function cleanParams(params: ServerAnalyticsParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );
}

function getGaClientId(request?: AnalyticsRequest) {
  const gaCookie = request?.cookies.get("_ga")?.value;
  if (!gaCookie) return undefined;

  const parts = gaCookie.split(".");
  if (parts.length >= 4) {
    return `${parts[2]}.${parts[3]}`;
  }

  return gaCookie;
}

function buildClientId(adminId?: number) {
  return adminId ? `server.admin.${adminId}` : "server.admin.unknown";
}

function isExcludedAdmin(adminId?: number) {
  if (!adminId) return false;

  return excludedAdminIds
    .split(",")
    .map((id) => Number(id.trim()))
    .some((id) => Number.isInteger(id) && id === adminId);
}

export async function trackServerEvent(
  eventName: string,
  params: ServerAnalyticsParams = {},
  options: { adminId?: number; request?: AnalyticsRequest; timeoutMs?: number } = {},
) {
  if (isExcludedAdmin(options.adminId)) return;
  if (!measurementId || !apiSecret) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 1500);

  try {
    const url = new URL(GA4_ENDPOINT);
    url.searchParams.set("measurement_id", measurementId);
    url.searchParams.set("api_secret", apiSecret);

    const eventParams = cleanParams({
      ...params,
      source: params.source ?? "server_api",
      engagement_time_msec: 1,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: getGaClientId(options.request) ?? buildClientId(options.adminId),
        user_id: options.adminId ? `admin_${options.adminId}` : undefined,
        events: [{ name: eventName, params: eventParams }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`GA4 server event failed: ${eventName} (${response.status})`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`GA4 server event timed out: ${eventName}`);
      return;
    }
    console.warn(`GA4 server event error: ${eventName}`);
  } finally {
    clearTimeout(timeout);
  }
}
