import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImagePageView } from "./ImagePageView";
import { cellCenter, qaidaCells } from "@/lib/qaida/layout";

afterEach(cleanup);

describe("ImagePageView (Qaida)", () => {
  it("shows the licensed page image with attribution", () => {
    render(<ImagePageView page={7} />);
    const img = screen.getByRole("img", { name: "Noorani Qaida page 7" });
    expect(img.getAttribute("src")).toContain("/qaida/07.webp");
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toBeTruthy();
  });

  it("makes every detected word a button, in reading order, that reports its own box", () => {
    const onPointTap = vi.fn();
    render(<ImagePageView page={1} onPointTap={onPointTap} />);
    const cells = qaidaCells(1);
    expect(screen.getAllByRole("button", { name: /^Line \d+, word \d+/ })).toHaveLength(cells.length);

    // Page 1's letter grid: line 2 holds four letters, read right to left.
    const second = cells.find((c) => c.line === 2 && c.word === 2)!;
    const first = cells.find((c) => c.line === 2 && c.word === 1)!;
    expect(first.x0).toBeGreaterThan(second.x0);
    fireEvent.click(screen.getByRole("button", { name: "Line 2, word 2" }));
    expect(onPointTap).toHaveBeenCalledWith(cellCenter(second));
    // Taps between words do nothing when the page has word boxes.
    fireEvent.click(screen.getByTestId("qaida-page"));
    expect(onPointTap).toHaveBeenCalledTimes(1);
  });

  it("highlights the student's word and marked words, with labels rather than colour alone", () => {
    const onPinTap = vi.fn();
    const onPointTap = vi.fn();
    const cells = qaidaCells(1);
    const here = cells.find((c) => c.line === 2 && c.word === 1)!;
    const marked = cells.find((c) => c.line === 3 && c.word === 2)!;
    render(
      <ImagePageView
        page={1}
        position={cellCenter(here)}
        pins={[{ id: "m1", point: cellCenter(marked), markType: "slip", label: "1" }]}
        onPointTap={onPointTap}
        onPinTap={onPinTap}
      />,
    );
    expect(screen.getByRole("button", { name: "Line 2, word 1, current position" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Mark: Memorisation slip (#1)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Line 3, word 2, marked Memorisation slip (#1)" }));
    expect(onPinTap).toHaveBeenCalledWith("m1");
    expect(onPointTap).not.toHaveBeenCalled();
  });
});
