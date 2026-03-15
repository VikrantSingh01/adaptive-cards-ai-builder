import { describe, it, expect } from "vitest";
import { analyzeData, parseCSV } from "../../src/generation/data-analyzer.js";

describe("data-analyzer", () => {
  it("detects array of objects → table", () => {
    const result = analyzeData([
      { name: "Alice", age: 30, dept: "Eng", role: "SWE", level: 63 },
      { name: "Bob", age: 25, dept: "Design", role: "Designer", level: 61 },
    ]);
    expect(result.shape).toBe("array-of-objects");
    expect(result.presentation).toBe("table");
    expect(result.columns).toContain("name");
  });

  it("detects key-value object → facts", () => {
    const result = analyzeData({
      status: "Active",
      priority: "High",
      assignee: "Alice",
    });
    expect(result.shape).toBe("key-value");
    expect(result.presentation).toBe("facts");
  });

  it("detects numeric array → chart", () => {
    const result = analyzeData([
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 150 },
      { month: "Mar", revenue: 200 },
      { month: "Apr", revenue: 180 },
    ]);
    expect(result.shape).toBe("array-of-objects");
    expect(result.presentation).toBe("chart-bar");
  });

  it("detects CSV string", () => {
    const result = analyzeData("Name,Age,Role\nAlice,30,Eng\nBob,25,Design");
    expect(result.shape).toBe("csv");
    expect(result.columns).toEqual(["Name", "Age", "Role"]);
    expect(result.rowCount).toBe(2);
  });

  it("detects flat array → list", () => {
    const result = analyzeData(["apple", "banana", "cherry"]);
    expect(result.shape).toBe("flat-array");
    expect(result.presentation).toBe("list");
  });

  it("parses CSV correctly", () => {
    const rows = parseCSV("Name,Age\nAlice,30\nBob,25");
    expect(rows).toHaveLength(2);
    expect(rows[0].Name).toBe("Alice");
    expect(rows[0].Age).toBe("30");
  });
});
