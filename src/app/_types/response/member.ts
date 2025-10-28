export interface MemberListResponse {
  status: 'OK';
  members: { id: number; name: string }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CreateMemberResponse {
  status: 'OK';
  message: string;
  memberId: number;
  children: number;
} 

export interface MemberResponse {
  status: 'OK';
  member: { id: number; name: string };
}

export interface UpdateMemberResponse {
  status: 'OK';
  message: string;
  member: { id: number; name: string; children: string[] };
}