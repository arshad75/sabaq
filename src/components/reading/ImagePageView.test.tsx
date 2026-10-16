import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImagePageView } from "./ImagePageView";

afterEach(cleanup);

describe("ImagePageView (Qaida)", () => {
  it("shows the licensed page image with attribution", () => {
    render(<ImagePageView page={7} />);
    const img = screen.getByRole("img", { name: "Noorani Qaida page 7" });
    expect(img.getAttribute("src")).toContain("/qaida/07.webp");
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toBeTruthy();
  });

  it("reports taps as fractions of the page size", () => {
    const onPointTap = vi.fn();
    render(<ImagePageView page={1} onPointTap={onPointTap} />);
    const area = screen.getByTestId("qaida-page");
    area.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 600 }) as DOMRect;
    fireEvent.click(area, { clientX: 200, clientY: 350 });
    expect(onPointTap).toHaveBeenCalledWith({ x: 0.25, y: 0.5 });
  });

  it("labels marks and the student's position without relying on colour", () => {
    const onPinTap = vi.fn();
    render(
      <ImagePageView
        page={1}
        position={{ x: 0.5, y: 0.5 }}
        pins={[{ id: "m1", point: { x: 0.2, y: 0.3 }, markType: "slip" }]}
        onPinTap={onPinTap}
      />,
    );
    expect(screen.getByRole("img", { name: "Current position" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark: Memorisation slip" }));
    expect(onPinTap).toHaveBeenCalledWith("m1");
  });
});
