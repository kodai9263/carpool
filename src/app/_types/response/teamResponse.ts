export interface TeamsListResponse {
  status: 'OK';
  teams: { id: number; teamName: string }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CreateTeamResponse {
  status: 'OK';
  message: string;
  id: number;
}

export interface TeamDetailResponse {
  status: 'OK';
  team: {
    id: number;
    teamName: string;
    teamCode: string;
    memberCount: number;
    adminId: number;
    maxGrade: number;
  }
}

export interface UpdateTeamResponse {
  status: 'OK';
  message: string;
  team: {
    id: number;
    teamName: string;
    teamCode: string;
    memberCount: number;
    adminId: number;
    maxGrade: number;
  }
}