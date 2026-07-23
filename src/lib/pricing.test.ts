import { describe, expect, it } from "vitest";
import { deriveGlobalPair, samePair } from "./pricing";

describe("deriveGlobalPair", () => {
  it("returns null without variants", () => {
    expect(deriveGlobalPair([])).toBeNull();
  });

  it("returns the single pair for a uniform product", () => {
    const pair = { price_cents: 2490, compare_at_price_cents: 3990 };
    expect(deriveGlobalPair([pair, pair, pair])).toEqual(pair);
  });

  it("picks the most common pair when one colour has a specific price", () => {
    const global = { price_cents: 2490, compare_at_price_cents: null };
    const custom = { price_cents: 2790, compare_at_price_cents: null };
    expect(deriveGlobalPair([global, custom, global])).toEqual(global);
  });

  it("distinguishes pairs by their struck-through price too", () => {
    const promo = { price_cents: 1990, compare_at_price_cents: 2490 };
    const plain = { price_cents: 1990, compare_at_price_cents: null };
    expect(deriveGlobalPair([promo, promo, plain])).toEqual(promo);
  });
});

describe("samePair", () => {
  it("matches identical pairs, null compare_at included", () => {
    expect(
      samePair(
        { price_cents: 2490, compare_at_price_cents: null },
        { price_cents: 2490, compare_at_price_cents: null },
      ),
    ).toBe(true);
  });

  it("rejects a pair differing only by the promo state", () => {
    expect(
      samePair(
        { price_cents: 2490, compare_at_price_cents: 3990 },
        { price_cents: 2490, compare_at_price_cents: null },
      ),
    ).toBe(false);
  });
});
