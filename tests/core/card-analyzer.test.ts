import { describe, it, expect } from "vitest";
import { analyzeCard, findDuplicateIds } from "../../src/core/card-analyzer.js";

describe("card-analyzer", () => {
  it("analyzes a simple card", () => {
    const stats = analyzeCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", text: "Hello" },
        { type: "Image", url: "https://example.com/img.png" },
      ],
    });
    expect(stats.elementCount).toBe(2);
    expect(stats.nestingDepth).toBe(0);
    expect(stats.elementTypes).toContain("TextBlock");
    expect(stats.elementTypes).toContain("Image");
    expect(stats.imageCount).toBe(1);
    expect(stats.inputCount).toBe(0);
    expect(stats.hasTemplating).toBe(false);
    expect(stats.version).toBe("1.6");
  });

  it("counts nested elements correctly", () => {
    const stats = analyzeCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  items: [
                    { type: "TextBlock", text: "Deep" },
                    { type: "Input.Text", id: "name", label: "Name" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(stats.elementCount).toBe(4); // Container + ColumnSet + TextBlock + Input.Text
    expect(stats.nestingDepth).toBe(2);
    expect(stats.inputCount).toBe(1);
  });

  it("detects templating expressions", () => {
    const stats = analyzeCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", text: "${name}" },
      ],
    });
    expect(stats.hasTemplating).toBe(true);
  });

  it("detects $data and $when", () => {
    const stats = analyzeCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          $data: "${items}",
          items: [
            { type: "TextBlock", text: "${title}", $when: "${isVisible}" },
          ],
        },
      ],
    });
    expect(stats.hasTemplating).toBe(true);
  });

  it("counts actions", () => {
    const stats = analyzeCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [],
      actions: [
        { type: "Action.Execute", title: "Submit" },
        { type: "Action.OpenUrl", title: "Open", url: "https://example.com" },
      ],
    });
    expect(stats.actionTypes).toContain("Action.Execute");
    expect(stats.actionTypes).toContain("Action.OpenUrl");
  });

  it("finds duplicate IDs", () => {
    const dupes = findDuplicateIds({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", id: "title", text: "A" },
        { type: "TextBlock", id: "title", text: "B" },
        { type: "TextBlock", id: "unique", text: "C" },
      ],
    });
    expect(dupes).toContain("title");
    expect(dupes).not.toContain("unique");
  });
});
