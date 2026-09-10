import { act, fireEvent, render, screen } from "@testing-library/react";
import { RideShareDialog } from "../RideShareDialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.open = false; });
});

test("プレビューとLINEに渡す文面を一致させ、別タブを安全に開く", () => {
  const text = "配車のお知らせ\n集合 9:00 & https://example.com/?p=1234";
  render(<RideShareDialog open title="配車を共有" text={text} onCopy={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByLabelText("共有する文面").textContent).toBe(text);
  const link = screen.getByRole("link", { name: "LINEで送る" });
  expect(link).toHaveAttribute("href", `https://line.me/R/share?text=${encodeURIComponent(text)}`);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("コピー処理中の連打を防ぎ、失敗後は再試行できる", async () => {
  let reject!: (reason: Error) => void;
  const copy = jest.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
  render(<RideShareDialog open title="配車を共有" text="保存済み文面" onCopy={copy} onClose={jest.fn()} />);
  const button = screen.getByRole("button", { name: "文面をコピー" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(copy).toHaveBeenCalledTimes(1);
  expect(copy).toHaveBeenCalledWith("保存済み文面");
  await act(async () => { reject(new Error("コピー不可")); });
  expect(screen.getByRole("button", { name: "文面をコピー" })).toBeEnabled();
  expect(screen.getByRole("status")).toHaveTextContent("コピーできませんでした");
});

test("閉じる操作を親へ通知し、open=falseでダイアログを閉じる", () => {
  const close = jest.fn();
  const { rerender } = render(<RideShareDialog open title="配車を共有" text="文面" onCopy={jest.fn()} onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  expect(close).toHaveBeenCalledTimes(1);
  rerender(<RideShareDialog open={false} title="配車を共有" text="文面" onCopy={jest.fn()} onClose={close} />);
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
});


test("コピー成功をダイアログ内で知らせ、文面変更や再表示時に通知をリセットする", async () => {
  const copy = jest.fn().mockResolvedValue(undefined);
  const close = jest.fn();
  const { rerender } = render(<RideShareDialog open title="配車を共有" text="文面1" onCopy={copy} onClose={close} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "文面をコピー" })); });
  expect(screen.getByRole("status")).toHaveTextContent("文面をコピーしました");
  rerender(<RideShareDialog open title="配車を共有" text="文面2" onCopy={copy} onClose={close} />);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "文面をコピー" })); });
  expect(screen.getByRole("status")).toHaveTextContent("文面をコピーしました");
  rerender(<RideShareDialog open={false} title="配車を共有" text="文面2" onCopy={copy} onClose={close} />);
  rerender(<RideShareDialog open title="配車を共有" text="文面2" onCopy={copy} onClose={close} />);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
