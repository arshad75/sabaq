import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { VoiceGuide } from "./VoiceGuide";
import { setPrefs } from "@/lib/prefs";

const spoken: string[] = [];

beforeEach(() => {
  spoken.length = 0;
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    lang = "";
    rate = 1;
    voice = null;
    constructor(public text: string) {}
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => [{ lang: "en-GB", localService: true, default: true, name: "Test" }],
      speak: (u: { text: string }) => spoken.push(u.text),
      cancel: () => {},
      resume: () => {},
      paused: false,
      speaking: false,
      pending: false,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => setPrefs({ buttonVoices: true }));
});

function renderPage() {
  return render(
    <div>
      <VoiceGuide />
      <button type="button">Next page</button>
      <a href="/join" aria-label="Join a lesson">
        icon
      </a>
      <figure data-no-say>
        <button type="button">Line 2, word 1</button>
      </figure>
      <button type="button">Surah 1, ayah 2, word 3, current position</button>
    </div>,
  );
}

describe("VoiceGuide", () => {
  it("reads buttons and links aloud, but leaves Qaida letters and long labels alone", () => {
    const { getByText, getByLabelText } = renderPage();
    getByText("Next page").click();
    getByLabelText("Join a lesson").addEventListener("click", (e) => e.preventDefault());
    getByLabelText("Join a lesson").click();
    getByText("Line 2, word 1").click();
    getByText(/Surah 1, ayah 2/).click();
    expect(spoken).toEqual(["Next page", "Join a lesson"]);
  });

  it("stays quiet when the setting is off", () => {
    act(() => setPrefs({ buttonVoices: false }));
    const { getByText } = renderPage();
    getByText("Next page").click();
    expect(spoken).toEqual([]);
  });
});
