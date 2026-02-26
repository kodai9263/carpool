export interface Member {
  id: number;
  guardians: {
    id: number;
    name: string;
  }[];
}

export interface MemberFormValues {
  guardians: { name: string }[];
  children: {
    name: string;
    grade?: number;
  }[];
}