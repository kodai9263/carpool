export type TeamDraft = { teamName: string; pin: string; isMiddleSchool: boolean };
export type FamilyDraft = {
  guardians: { name: string }[];
  children: { name: string; grade?: number }[];
};
export type MemberListResponse = {
  members: { id: number; guardians: { id: number; name: string }[]; children: { id: number; name: string }[] }[];
  page: number;
  total: number;
  totalPages: number;
};

export function teamDraftError(draft: TeamDraft): string | null {
  if (!draft.teamName.trim()) return 'チーム名を入力してください。';
  if (!/^\d{4,}$/.test(draft.pin.trim())) return '共有PINは4桁以上の数字で入力してください。';
  return null;
}

export function familyDraftError(draft: FamilyDraft, maxGrade: number): string | null {
  if (!draft.guardians.length || draft.guardians.some((guardian) => !guardian.name.trim())) return '保護者名を入力してください。使わない入力欄は取り除けます。';
  const names = new Set<string>();
  for (const child of draft.children) {
    const name = child.name.trim();
    if (!name && child.grade !== undefined) return '学年を選んだ子どもの名前を入力してください。';
    if (!name) continue;
    if (names.has(name)) return '同じ名前の子どもが重複しています。入力内容を確認してください。';
    names.add(name);
    if (child.grade !== undefined && (!Number.isInteger(child.grade) || child.grade < 1 || child.grade > maxGrade)) return 'チームの対象学年から選んでください。';
  }
  return null;
}

export function familyRequest(draft: FamilyDraft): FamilyDraft {
  return {
    guardians: draft.guardians.map(({ name }) => ({ name: name.trim() })),
    children: draft.children.filter(({ name }) => name.trim()).map(({ name, grade }) => ({ name: name.trim(), grade })),
  };
}
