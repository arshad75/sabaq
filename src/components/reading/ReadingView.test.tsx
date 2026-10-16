import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReadingView } from "./ReadingView";
import { MarkChip } from "@/components/ui/Indicators";
import type { QuranPage } from "@/lib/quran/types";

afterEach(cleanup);

const page: QuranPage = {
  page: 7,
  lines: [
    {
      lineNumber: 1,
      surahStart: 3,
      words: [
        { page: 7, surah: 3, ayah: 1, wordIndex: 1, key: "3:1:1", text: "TOKEN_A" },
        { page: 7, surah: 3, ayah: 1, wordIndex: 2, key: "3:1:2", text: "TOKEN_B" },
      ],
      ayahEnds: [{ afterWordKey: "3:1:2", ayah: 1 }],
    },
  ],
};

describe("ReadingView", () => {
  it("renders exactly the words it is given, right-to-left", () => {
    const { container } = render(<ReadingView page={page} />);
    expect(screen.getByText("TOKEN_A")).toBeTruthy();
    expect(screen.getByText("TOKEN_B")).toBeTruthy();
    expect(container.querySelector('[dir="rtl"][lang="ar"]')).not.toBeNull();
    expect(screen.getByRole("img", { name: "End of ayah 1" })).toBeTruthy();
  });

  it("makes words tappable and reports the tapped word", () => {
    const onTap = vi.fn();
    render(<ReadingView page={page} onWordTap={onTap} />);
    screen.getByRole("button", { name: /TOKEN_B/ }).click();
    expect(onTap).toHaveBeenCalledWith(expect.objectContaining({ key: "3:1:2" }));
  });

  it("announces marks and the current position, not only by colour", () => {
    render(
      <ReadingView page={page} positionKey="3:1:1" marks={new Map([["3:1:2", { markType: "tajweed" }]])} onWordTap={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /TOKEN_A.*current position/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /TOKEN_B.*marked Tajweed rule/ })).toBeTruthy();
  });

  it("shows the placeholder notice when the source is a placeholder", () => {
    render(<ReadingView page={page} isPlaceholder />);
    expect(screen.getByText(/not Quran text/)).toBeTruthy();
  });
});

describe("MarkChip", () => {
  it("pairs colour with an icon and a text label", () => {
    const { container } = render(<MarkChip type="slip" />);
    expect(screen.getByText("Slip")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
