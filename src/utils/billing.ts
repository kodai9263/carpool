export const FREE_TEAM_LIMIT = 1;
export const PRO_ADDITIONAL_TEAM_PRICE_JPY = 500;

export const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
} as const;

export function isSecondTeamCandidate(teamCount: number) {
  return teamCount >= FREE_TEAM_LIMIT;
}
