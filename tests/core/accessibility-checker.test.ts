import { describe, it, expect } from "vitest";
import { checkAccessibility } from "../../src/core/accessibility-checker.js";

describe("accessibility-checker", () => {
  it("gives perfect score to accessible card", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "This is a test card",
      body: [
        { type: "TextBlock", text: "Hello", wrap: true },
        { type: "Image", url: "https://example.com/img.png", altText: "A picture" },
        {
          type: "Input.Text",
          id: "name",
          label: "Your name",
        },
      ],
      actions: [
        { type: "Action.Execute", title: "Submit" },
      ],
    });
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it("flags missing speak property", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "TextBlock", text: "Hello", wrap: true }],
    });
    expect(result.issues.some((i) => i.includes("speak"))).toBe(true);
  });

  it("flags missing altText on images", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "Card",
      body: [
        { type: "Image", url: "https://example.com/img.png" },
      ],
    });
    expect(result.issues.some((i) => i.includes("altText"))).toBe(true);
  });

  it("flags missing wrap on TextBlock", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "Card",
      body: [
        { type: "TextBlock", text: "Hello" },
      ],
    });
    expect(result.issues.some((i) => i.includes("wrap"))).toBe(true);
  });

  it("flags missing label on inputs", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "Card",
      body: [
        { type: "Input.Text", id: "name" },
      ],
    });
    expect(result.issues.some((i) => i.includes("label"))).toBe(true);
  });

  it("flags missing id on inputs", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "Card",
      body: [
        { type: "Input.Text", label: "Name" },
      ],
    });
    expect(result.issues.some((i) => i.includes("id"))).toBe(true);
  });

  it("flags actions without titles", () => {
    const result = checkAccessibility({
      type: "AdaptiveCard",
      version: "1.6",
      speak: "Card",
      body: [],
      actions: [
        { type: "Action.Execute" },
      ],
    });
    expect(result.issues.some((i) => i.includes("title"))).toBe(true);
  });
});
