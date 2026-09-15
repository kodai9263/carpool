import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Page from "../page";
import { useFetch } from "@/app/_hooks/useFetch";

jest.mock("next/navigation", () => ({ useParams: () => ({ teamId: "10" }) }));
jest.mock("@/app/_hooks/useFetch", () => ({ useFetch: jest.fn() }));

test("精算一覧に状態、確定額、未入力を区別して表示する", () => {
  (useFetch as jest.Mock).mockReturnValue({
    data: {
      status: "OK",
      settlements: [
        { id: 1, rideId: 11, sourceDate: "2026-09-20T00:00:00.000Z", sourceDestination: "県営球場", status: "pending", version: 2, currentRevisionNumber: 1, totalAmount: 9_000 },
        { id: 2, rideId: 12, sourceDate: "2026-09-21T00:00:00.000Z", sourceDestination: "市営球場", status: "draft", version: 0, currentRevisionNumber: null, totalAmount: null },
      ],
    },
    isLoading: false,
    error: undefined,
  });

  render(<Page />);

  expect(screen.getByText("精算待ち")).toBeInTheDocument();
  expect(screen.getByText("9,000円")).toBeInTheDocument();
  expect(screen.getByText("下書き")).toBeInTheDocument();
  expect(screen.getByText("未入力")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /県営球場/ })).toHaveAttribute("href", "/admin/teams/10/settlements/1");
});
