import { describe, it, expect } from "vitest";
import { handleValidateCard } from "../../src/tools/validate-card.js";

describe("validate_card tool", () => {
  it("validates a complete, accessible card", () => {
    const result = handleValidateCard({
      card: {
        type: "AdaptiveCard",
        version: "1.6",
        speak: "Flight status update",
        body: [
          {
            type: "TextBlock",
            text: "Flight Status",
            size: "large",
            weight: "bolder",
            wrap: true,
            style: "heading",
          },
          {
            type: "FactSet",
            facts: [
              { title: "Flight", value: "AA 123" },
              { title: "Status", value: "On Time" },
            ],
          },
          {
            type: "Image",
            url: "https://example.com/plane.png",
            altText: "Airplane icon",
          },
        ],
        actions: [
          {
            type: "Action.OpenUrl",
            title: "Track Flight",
            url: "https://example.com/track",
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.stats.elementCount).toBe(3);
    expect(result.accessibility.score).toBe(100);
    expect(result.hostCompatibility.supported).toBe(true);
  });

  it("detects errors in invalid card", () => {
    const result = handleValidateCard({
      card: {
        type: "NotACard",
        version: "abc",
        body: "not-an-array",
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("checks host compatibility when specified", () => {
    const result = handleValidateCard({
      card: {
        type: "AdaptiveCard",
        version: "1.6",
        body: [{ type: "Carousel", pages: [] }],
      },
      host: "outlook",
    });
    // Should warn about Carousel on Outlook
    expect(
      result.errors.some((e) => e.rule === "host-compatibility"),
    ).toBe(true);
  });

  it("strict mode fails on warnings", () => {
    const result = handleValidateCard({
      card: {
        type: "AdaptiveCard",
        version: "1.6",
        body: [{ type: "Carousel", pages: [] }],
      },
      host: "outlook",
      strictMode: true,
    });
    expect(result.valid).toBe(false);
  });
});
