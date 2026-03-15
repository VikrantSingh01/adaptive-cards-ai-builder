import { describe, it, expect } from "vitest";
import { validateCard } from "../../src/core/schema-validator.js";

describe("schema-validator", () => {
  it("validates a minimal valid card", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "TextBlock", text: "Hello" }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing type", () => {
    const result = validateCard({ version: "1.6" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "required-type")).toBe(true);
  });

  it("rejects missing version", () => {
    const result = validateCard({ type: "AdaptiveCard" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "required-version")).toBe(true);
  });

  it("rejects invalid version format", () => {
    const result = validateCard({ type: "AdaptiveCard", version: "1.6.0" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "version-format")).toBe(true);
  });

  it("validates a card with all element types", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", text: "Title", size: "large", weight: "bolder" },
        { type: "Image", url: "https://example.com/img.png", altText: "test" },
        {
          type: "Container",
          items: [{ type: "TextBlock", text: "Nested" }],
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [{ type: "TextBlock", text: "Col 1" }],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [{ title: "Key", value: "Value" }],
        },
        {
          type: "Table",
          columns: [{ width: 1 }],
          rows: [],
        },
      ],
      actions: [
        { type: "Action.Execute", title: "Submit", verb: "submit" },
        { type: "Action.OpenUrl", title: "Open", url: "https://example.com" },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("warns on unknown element types", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "FancyWidget", text: "test" }],
    });
    // Unknown types are warnings, not errors
    expect(result.valid).toBe(true);
    expect(result.errors.some((e) => e.rule === "unknown-element-type")).toBe(
      true,
    );
  });

  it("rejects invalid TextBlock properties", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "Hi",
          size: "huge",
          weight: "bold",
          color: "pink",
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("validates Action.ShowCard with nested card", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "TextBlock", text: "Main" }],
      actions: [
        {
          type: "Action.ShowCard",
          title: "Show",
          card: {
            type: "AdaptiveCard",
            version: "1.6",
            body: [{ type: "TextBlock", text: "Sub" }],
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("requires url for Action.OpenUrl", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [],
      actions: [{ type: "Action.OpenUrl", title: "Open" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "required-property")).toBe(
      true,
    );
  });

  it("requires text for TextBlock", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "TextBlock" }],
    });
    expect(result.valid).toBe(false);
  });

  it("requires url for Image", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [{ type: "Image" }],
    });
    expect(result.valid).toBe(false);
  });

  it("validates FactSet facts", () => {
    const result = validateCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "FactSet",
          facts: [{ title: "", value: "" }],
        },
      ],
    });
    // Empty strings fail the required check
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
