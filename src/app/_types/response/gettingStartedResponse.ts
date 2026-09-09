export interface GettingStartedResponse {
  memberCount: number;
  childCount: number;
  ride: {
    id: number;
    date: string;
    destination: string;
    driverCount: number;
    isAnswerLocked: boolean;
  } | null;
  hasTriedAutoAssign: boolean;
}
