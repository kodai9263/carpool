// 現在の年度を返す
export const getCurrentSchoolYear = (): number => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return month >= 4 ? year : year - 1;
};

// 現在の学年を動的に返す
// grade: 登録時の学年、gradeYear: その学年の年度
export const calcCurrentGrade = (
    grade: number | null,
    gradeYear: number | null,
): number | null => {
    if (grade === null || gradeYear === null) return null;
    const currentSchoolYear = getCurrentSchoolYear();
    return grade + (currentSchoolYear - gradeYear);
};

// 卒業の判定
export const isGraduated = (
    currentGrade: number | null,
    maxGrade: number,
): boolean => {
    if (currentGrade === null) return false;
    return currentGrade > maxGrade;
};