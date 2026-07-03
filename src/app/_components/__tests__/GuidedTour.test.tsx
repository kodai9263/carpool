import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GuidedTour, { type GuidedTourStep } from "../GuidedTour";

const steps = [
  {
    target: "first-target",
    title: "最初の案内",
    body: "ここを確認します。",
  },
] satisfies GuidedTourStep[];

const multiStepGuide = [
  ...steps,
  {
    target: "second-target",
    title: "次の案内",
    body: "次の操作を確認します。",
  },
] satisfies GuidedTourStep[];

const inputHandoffGuide = [
  ...steps,
  {
    target: "select-target",
    title: "選択の案内",
    body: "ここを選択します。",
    primaryLabel: "選択する",
    primaryAction: "dismiss",
  },
  {
    target: "final-target",
    title: "最後の案内",
    body: "最後を確認します。",
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

  it("moves to a requested target while the guide is open", async () => {
    const { rerender } = render(
      <>
        <div data-guide="first-target">最初の対象</div>
        <div data-guide="second-target">次の対象</div>
        <GuidedTour storageKey="guided-tour-test" steps={multiStepGuide} />
      </>
    );
    mockTargetRect(screen.getByText("最初の対象"));
    mockTargetRect(screen.getByText("次の対象"));

    fireEvent.click(screen.getByRole("button", { name: "使い方" }));

    expect(await screen.findByText("最初の案内")).toBeInTheDocument();

    rerender(
      <>
        <div data-guide="first-target">最初の対象</div>
        <div data-guide="second-target">次の対象</div>
        <GuidedTour
          storageKey="guided-tour-test"
          steps={multiStepGuide}
          focusRequest={{ target: "second-target", requestId: 1 }}
        />
      </>
    );
    mockTargetRect(screen.getByText("最初の対象"));
    mockTargetRect(screen.getByText("次の対象"));

    expect(await screen.findByText("次の案内")).toBeInTheDocument();
  });

  it("opens a requested target even when the guide is closed", async () => {
    render(
      <>
        <div data-guide="second-target">次の対象</div>
        <GuidedTour
          storageKey="guided-tour-test"
          steps={multiStepGuide}
          focusRequest={{ target: "second-target", requestId: 1 }}
        />
      </>
    );
    mockTargetRect(screen.getByText("次の対象"));

    expect(await screen.findByRole("dialog", { name: "使い方ガイド" })).toBeInTheDocument();
    expect(screen.getByText("次の案内")).toBeInTheDocument();
  });

  it("dismisses to the requested input target instead of moving to the next step", async () => {
    render(
      <>
        <div data-guide="select-target">
          <label htmlFor="driver-select">ドライバー</label>
          <select id="driver-select">
            <option>ドライバーを選択</option>
          </select>
        </div>
        <div data-guide="final-target">最後の対象</div>
        <GuidedTour
          storageKey="guided-tour-test"
          steps={inputHandoffGuide}
          focusRequest={{ target: "select-target", requestId: 1 }}
        />
      </>
    );
    mockTargetRect(screen.getByLabelText("ドライバー"));
    mockTargetRect(screen.getByText("最後の対象"));

    expect(await screen.findByText("選択の案内")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "選択する" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "使い方ガイド" })).not.toBeInTheDocument();
    });
    expect(screen.queryByText("最後の案内")).not.toBeInTheDocument();
    expect(screen.getByLabelText("ドライバー")).toHaveFocus();
    expect(window.localStorage.getItem("guided-tour-test")).toBeNull();
  });
});
