import { bulkFamilyKey, validateBulkFamilies } from "../bulkMembers";
const family = { guardianName: "保護者", childName: "子ども", grade: 1 };
test("名前をtrimし、未設定学年を保持する", () => {
  expect(validateBulkFamilies([{ guardianName: " 保護者 ", childName: " 子ども　", grade: null }], 6)).toEqual([{ guardianName: "保護者", childName: "子ども", grade: null }]);
});
test.each([undefined, [], Array(51).fill(family)])("1〜50家族以外を拒否する", (value) => {
  expect(() => validateBulkFamilies(value, 6)).toThrow();
});
test.each([0, 4, 1.5, "1", undefined, NaN])("中学の不正学年%pを拒否する", (grade) => {
  expect(() => validateBulkFamilies([{ ...family, grade }], 3)).toThrow();
});
test("小学6年・中学3年を受け入れる", () => {
  expect(validateBulkFamilies([{ ...family, grade: 6 }], 6)).toHaveLength(1);
  expect(validateBulkFamilies([{ ...family, grade: 3 }], 3)).toHaveLength(1);
});
test.each(["", " 　", "名".repeat(101)])("空白または長すぎる名前を拒否する", (guardianName) => {
  expect(() => validateBulkFamilies([{ ...family, guardianName }], 6)).toThrow();
});
test("NFKCと空白正規化で入力内重複を検出する", () => {
  expect(() => validateBulkFamilies([
    { ...family, guardianName: "Ａ　Ｂ", childName: "Ｃ" },
    { ...family, guardianName: " A   B ", childName: "C" },
  ], 6)).toThrow(/重複/);
});
test("区切り文字を含む別の名前ペアを衝突させない", () => {
  expect(bulkFamilyKey("a,b", "c")).not.toBe(bulkFamilyKey("a", "b,c"));
});
