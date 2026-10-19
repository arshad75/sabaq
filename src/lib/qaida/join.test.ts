import { describe, expect, it } from "vitest";
import { joinPlan, OVERLAP_S, spokenRange, type Clip } from "./join";

// Shaped like the recordings: quiet lead-in, the spoken name, then a long fading tail.
function clip(): Clip {
  const sampleRate = 1000;
  const samples = new Float32Array(1000);
  samples.fill(0.5, 200, 600);
  samples.fill(0.1, 600, 800);
  return { samples, sampleRate };
}

describe("joining letter names", () => {
  it("cuts a name where its voice falls away, keeping a short release", () => {
    const [from, to] = spokenRange(clip());
    expect(from).toBeCloseTo(0.18);
    expect(to).toBeCloseTo(0.65);
  });

  it("lets the last name fade out naturally", () => {
    const [, to] = spokenRange(clip(), true);
    expect(to).toBeCloseTo(0.815);
  });

  it("starts each name as the one before fades, with no gap", () => {
    const plan = joinPlan([clip(), clip(), clip()]);
    expect(plan.map((p) => p.at)).toEqual([0, expect.closeTo(0.4), expect.closeTo(0.8)]);
    for (let i = 1; i < plan.length; i++) {
      const prevEnd = plan[i - 1].at + plan[i - 1].len;
      expect(prevEnd - plan[i].at).toBeCloseTo(OVERLAP_S);
    }
    // Three trimmed names take about 1.4 s, against 3 s for the clips played whole.
    const last = plan.at(-1)!;
    expect(last.at + last.len).toBeLessThan(1.5);
  });

  it("plays a silent clip whole rather than failing", () => {
    expect(spokenRange({ samples: new Float32Array(100), sampleRate: 1000 })).toEqual([0, 0.1]);
  });
});
