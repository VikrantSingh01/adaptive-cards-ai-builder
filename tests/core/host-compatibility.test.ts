import { describe, it, expect } from "vitest";
import { checkHostCompatibility } from "../../src/core/host-compatibility.js";

describe("host-compatibility", () => {
  it("passes a simple card on all hosts", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.3",
      body: [{ type: "TextBlock", text: "Hello" }],
    };
    const result = checkHostCompatibility(card, "teams");
    expect(result.supported).toBe(true);
  });

  it("flags Carousel on Outlook", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "Carousel", pages: [] }],
    };
    const result = checkHostCompatibility(card, "outlook");
    expect(result.supported).toBe(false);
    expect(
      result.unsupportedElements.some((e) => e.type === "Carousel"),
    ).toBe(true);
  });

  it("flags Table on Webex", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "Table", columns: [], rows: [] }],
    };
    const result = checkHostCompatibility(card, "webex");
    expect(result.supported).toBe(false);
    expect(result.unsupportedElements.some((e) => e.type === "Table")).toBe(
      true,
    );
  });

  it("flags Action.Execute on Webex", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.3",
      body: [],
      actions: [{ type: "Action.Execute", title: "Submit" }],
    };
    const result = checkHostCompatibility(card, "webex");
    expect(result.supported).toBe(false);
    expect(
      result.unsupportedElements.some((e) => e.type === "Action.Execute"),
    ).toBe(true);
  });

  it("flags version incompatibility", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "TextBlock", text: "Hello" }],
    };
    const result = checkHostCompatibility(card, "outlook");
    expect(result.supported).toBe(false);
    expect(
      result.unsupportedElements.some((e) => e.type === "version"),
    ).toBe(true);
  });

  it("flags too many actions", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [],
      actions: Array.from({ length: 7 }, (_, i) => ({
        type: "Action.Execute",
        title: `Action ${i + 1}`,
      })),
    };
    const result = checkHostCompatibility(card, "teams");
    expect(result.supported).toBe(false);
    expect(
      result.unsupportedElements.some((e) => e.type === "action-count"),
    ).toBe(true);
  });

  it("passes everything on generic host", () => {
    const card = {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "Carousel", pages: [] },
        { type: "Table", columns: [], rows: [] },
        { type: "DonutChart" },
      ],
      actions: Array.from({ length: 10 }, (_, i) => ({
        type: "Action.Execute",
        title: `Action ${i + 1}`,
      })),
    };
    const result = checkHostCompatibility(card, "generic");
    expect(result.supported).toBe(true);
  });
});
