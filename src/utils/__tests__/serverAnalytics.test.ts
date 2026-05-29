describe("trackServerEvent", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GA4_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.GA4_MEASUREMENT_API_SECRET;
    delete process.env.ANALYTICS_EXCLUDED_ADMIN_IDS;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  async function loadTracker() {
    return import("../serverAnalytics");
  }

  it("does not send when Measurement Protocol env vars are missing", async () => {
    const { trackServerEvent } = await loadTracker();

    await trackServerEvent("team_created", { team_id: 1 }, { adminId: 10 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not send events for the demo admin by default", async () => {
    process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    process.env.GA4_MEASUREMENT_API_SECRET = "secret";
    const { trackServerEvent } = await loadTracker();

    await trackServerEvent("team_created", { team_id: 167 }, { adminId: 4 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("supports excluding additional admin ids with an environment variable", async () => {
    process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    process.env.GA4_MEASUREMENT_API_SECRET = "secret";
    process.env.ANALYTICS_EXCLUDED_ADMIN_IDS = "4, 10";
    const { trackServerEvent } = await loadTracker();

    await trackServerEvent("team_created", { team_id: 1 }, { adminId: 10 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends a GA4 Measurement Protocol event with the GA client id when available", async () => {
    process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    process.env.GA4_MEASUREMENT_API_SECRET = "secret";
    const { trackServerEvent } = await loadTracker();

    await trackServerEvent(
      "member_created",
      { team_id: 2, member_id: 7, empty: undefined, source: "server_test" },
      {
        adminId: 10,
        request: {
          cookies: {
            get: (name: string) => (name === "_ga" ? { value: "GA1.1.111.222" } : undefined),
          },
        },
      },
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain("measurement_id=G-TEST123");
    expect(String(url)).toContain("api_secret=secret");

    const body = JSON.parse(String(init.body));
    expect(body.client_id).toBe("111.222");
    expect(body.user_id).toBe("admin_10");
    expect(body.events).toEqual([
      {
        name: "member_created",
        params: {
          team_id: 2,
          member_id: 7,
          source: "server_test",
          engagement_time_msec: 1,
        },
      },
    ]);
  });
});
