export interface Team {
  id: number;
  teamName: string;
  teamCode: string;
  memberCount: number;
  maxGrade: number;
}
export interface TeamFormValues {
  teamName: string;
  teamCode: string;
  pin: string;
  pinConfirm: string;
  isMiddleSchool: boolean;
}
