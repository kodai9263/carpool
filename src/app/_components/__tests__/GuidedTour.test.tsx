import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GuidedTour, { type GuidedTourStep } from "../GuidedTour";

const steps = [
  {
    target: "first-target",
    title: "最初の案内",
    body: "ここを確認します。",
  },
] satisfies GuidedTourStep[];

const mockTargetRect = (element: Element) => {
  element.getBoundingClientRect = jest.fn(() => ({
    top: 100,
    left: 40,
    right: 260,
    bottom: 180,
    width: 220,
    height: 80,
    x: 40,
    y: 100,
    toJSON: () => ({}),
  }));
};

describe("GuidedTour", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Element.prototype.scrollIntoView = jest.fn();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    };
  });

  it("opens manually and stores completion", async () => {
    render(
      <>
        <div data-guide="first-target">対象</div>
        <GuidedTour storageKey="guided-tour-test" steps={steps} />
      </>
    );
    mockTargetRect(screen.getByText("対象"));

    fireEvent.click(screen.getByRole("button", { name: "使い方" }));

    expect(await screen.findByRole("dialog", { name: "使い方ガイド" })).toBeInTheDocument();
    expect(screen.getByText("最初の案内")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "完了" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("guided-tour-test")).toBe("done");
    });
  });

  it("does not auto start after completion", async () => {
    window.localStorage.setItem("guided-tour-test", "done");

    render(
      <>
        <div data-guide="first-target">対象</div>
        <GuidedTour storageKey="guided-tour-test" steps={steps} autoStart />
      </>
    );
    mockTargetRect(screen.getByText("対象"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "使い方ガイド" })).not.toBeInTheDocument();
    });
  });
});
