import type { RideListResponse } from "@/app/_types/response/rideResponse";
import type { TeamsListResponse } from "@/app/_types/response/teamResponse";
import { api } from "@/utils/api";

export interface GuestDemoEntry {
  path: string;
  teamId?: number;
  rideId?: number;
}

const FALLBACK_PATH = "/admin/teams";

export async function resolveGuestDemoEntry(token: string): Promise<GuestDemoEntry> {
  const teams = (await api.get(
    "/api/admin/teams?perPage=10",
    token,
  )) as TeamsListResponse;

  for (const team of teams.teams) {
    const rides = (await api.get(
      `/api/admin/teams/${team.id}/rides?perPage=20`,
      token,
    )) as RideListResponse;

    const ride =
      rides.rides.find((item) => item.isAssignmentComplete) ??
      rides.rides.find((item) => (item.responseCount ?? 0) > 0) ??
      rides.rides[0];

    if (ride) {
      return {
        path: `/admin/teams/${team.id}/rides/${ride.id}?demo=true`,
        teamId: team.id,
        rideId: ride.id,
      };
    }
  }

  return { path: FALLBACK_PATH };
}
