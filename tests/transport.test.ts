import { describe, expect, it, vi } from "vitest";
import { addVoice, stopAll, activeCount } from "../src/app/transport";

describe("transport", () => {
  it("stopAll stops every registered voice and empties the set", () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    addVoice(a, 1000);
    addVoice(b, 1000);
    expect(activeCount()).toBe(2);
    stopAll();
    expect(a.stop).toHaveBeenCalledOnce();
    expect(b.stop).toHaveBeenCalledOnce();
    expect(activeCount()).toBe(0);
  });
  it("stopAll with nothing registered is a no-op", () => {
    expect(() => stopAll()).not.toThrow();
    expect(activeCount()).toBe(0);
  });
  it("a voice auto-deregisters after its duration", () => {
    vi.useFakeTimers();
    const a = { stop: vi.fn() };
    addVoice(a, 500);
    expect(activeCount()).toBe(1);
    vi.advanceTimersByTime(700);
    expect(activeCount()).toBe(0);
    vi.useRealTimers();
  });
});
