export type BulkFamily = {
  guardianName: string;
  childName: string;
  grade: number | null;
};

export function bulkFamilyKey(guardianName: string, childName: string): string {
  const normalize = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ");
  return JSON.stringify([normalize(guardianName), normalize(childName)]);
}

export function validateBulkFamilies(input: unknown, maxGrade: number): BulkFamily[] {
  if (maxGrade !== 3 && maxGrade !== 6) throw new Error("チームの学年設定を確認してください");
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw new Error("一度に登録できるのは1〜50家族です");
  }
  const seen = new Set<string>();
  return input.map((value: unknown, index) => {
    if (!value || typeof value !== "object") throw new Error(`${index + 1}行目の入力を確認してください`);
    const row = value as Record<string, unknown>;
    const guardianName = typeof row.guardianName === "string" ? row.guardianName.trim() : "";
    const childName = typeof row.childName === "string" ? row.childName.trim() : "";
    if (!guardianName || guardianName.length > 100 || !childName || childName.length > 100) {
      throw new Error(`${index + 1}行目の保護者名・子ども名は1〜100文字で入力してください`);
    }
    const grade = row.grade;
    if (grade !== null && (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > maxGrade)) {
      throw new Error(`${index + 1}行目の学年は未設定または1〜${maxGrade}年で指定してください`);
    }
    const key = bulkFamilyKey(guardianName, childName);
    if (seen.has(key)) throw new Error(`${index + 1}行目の保護者名と子ども名が重複しています`);
    seen.add(key);
    return { guardianName, childName, grade: grade as number | null };
  });
}
