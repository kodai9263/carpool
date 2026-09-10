import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BulkMemberForm from "../BulkMemberForm";

function fillRow(index: number, guardianName: string, childName: string, grade = "") {
  const row = within(screen.getByRole("group", { name: `家族 ${index}` }));
  fireEvent.change(row.getByRole("textbox", { name: "保護者名" }), { target: { value: guardianName } });
  fireEvent.change(row.getByRole("textbox", { name: "子ども名" }), { target: { value: childName } });
  fireEvent.change(row.getByRole("combobox", { name: "学年" }), { target: { value: grade } });
}
async function review() {
  fireEvent.click(screen.getByRole("button", { name: "登録内容を確認" }));
  return screen.findByRole("region", { name: "登録内容の確認" });
}

test("確認画面では登録せず、入力に戻っても名前と学年を保持する", async () => {
  const save = jest.fn();
  render(<BulkMemberForm maxGrade={6} onSave={save} />);
  fillRow(1, "田中 母", "田中 太郎", "3");
  await review();
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "1家族を登録します" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "入力に戻る" }));
  const row = within(screen.getByRole("group", { name: "家族 1" }));
  expect(row.getByRole("textbox", { name: "保護者名" })).toHaveValue("田中 母");
  expect(row.getByRole("textbox", { name: "子ども名" })).toHaveValue("田中 太郎");
  expect(row.getByRole("combobox", { name: "学年" })).toHaveValue("3");
  expect(save).not.toHaveBeenCalled();
});

test("空行と空白だけの行を除き、未設定学年をnullとして登録する", async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  render(<BulkMemberForm maxGrade={6} onSave={save} />);
  fillRow(1, "  ", "　");
  fillRow(3, " 山田 母 ", " 山田 花子 ");
  await review();
  fireEvent.click(screen.getByRole("button", { name: "1家族を登録" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith([{ guardianName: "山田 母", childName: "山田 花子", grade: null }]));
});

test.each([
  ["田中 母", "", ""],
  ["", "田中 太郎", ""],
  ["", "", "2"],
])("部分入力（%s / %s / %s）を空行として捨てずエラーにする", async (guardian, child, grade) => {
  const save = jest.fn();
  render(<BulkMemberForm maxGrade={6} onSave={save} />);
  fillRow(1, guardian, child, grade);
  fireEvent.click(screen.getByRole("button", { name: "登録内容を確認" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("保護者名・子ども名");
  expect(screen.queryByRole("region", { name: "登録内容の確認" })).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

test("登録中の連打を無視し、戻る操作も抑止する", async () => {
  let resolve!: () => void;
  const save = jest.fn(() => new Promise<void>((done) => { resolve = done; }));
  render(<BulkMemberForm maxGrade={3} onSave={save} />);
  fillRow(1, "田中 母", "田中 太郎", "3");
  await review();
  const submit = screen.getByRole("button", { name: "1家族を登録" });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "登録中..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "入力に戻る" })).toBeDisabled();
  await act(async () => resolve());
});

test("登録失敗を表示し、同じ確認内容で再試行できる", async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error("接続できませんでした")).mockResolvedValueOnce(undefined);
  render(<BulkMemberForm maxGrade={6} onSave={save} />);
  fillRow(1, "田中 母", "田中 太郎", "1");
  await review();
  fireEvent.click(screen.getByRole("button", { name: "1家族を登録" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("接続できませんでした");
  const retry = screen.getByRole("button", { name: "1家族を登録" });
  expect(retry).toBeEnabled();
  fireEvent.click(retry);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0]);
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test("空行を飛ばしてもエラーには画面上の行番号を表示する", async () => {
  render(<BulkMemberForm maxGrade={6} onSave={jest.fn()} />);
  fillRow(3, "保護者だけ", "");
  fireEvent.click(screen.getByRole("button", { name: "登録内容を確認" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("3行目");
});
