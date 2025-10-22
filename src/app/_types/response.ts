export interface TeamsListResponse {
  status: 'OK';
  teams: { id: number; teamName: string }[];
}

export interface CreateTeamResponse {
  status: 'OK';
  message: string;
  id: number;
}

export interface TeamResponse {
  status: 'OK';
  team: {
    id: number;
    teamName: string;
    teamCode: string;
    memberCount: number;
    adminId: number;
  }
}