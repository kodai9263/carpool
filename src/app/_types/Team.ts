export interface Team {
  id: number;
  teamName: string;
  teamCode: string;
  memberCount: number;
}
export interface TeamFormValues {
  teamName: string;
  teamCode: string;
  pin: string;
  pinConfirm: string;
}
