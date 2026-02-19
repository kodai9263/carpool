export interface Member {
  id: number;
  name: string;
}

export interface MemberFormValues {
  name: string;
  children: {
    name: string;
    grade?: number;
  }[];
}