/**
 * Data Analyzer — Detect data shape and recommend optimal card presentation
 */

import type { DataPresentation } from "../types/index.js";

export interface DataAnalysis {
  shape: "array-of-objects" | "key-value" | "flat-array" | "nested-object" | "csv" | "unknown";
  presentation: DataPresentation;
  columns?: string[];
  rowCount?: number;
  hasNumericValues?: boolean;
  hasDateValues?: boolean;
  hasImageUrls?: boolean;
  summary: string;
}

/**
 * Analyze data and recommend the best presentation type
 */
export function analyzeData(data: unknown): DataAnalysis {
  // CSV string
  if (typeof data === "string") {
    return analyzeCSV(data);
  }

  // Array of objects → table or list
  if (Array.isArray(data)) {
    return analyzeArray(data);
  }

  // Single object → facts or nested
  if (data && typeof data === "object") {
    return analyzeObject(data as Record<string, unknown>);
  }

  return {
    shape: "unknown",
    presentation: "auto",
    summary: "Unable to determine data shape",
  };
}

function analyzeCSV(csv: string): DataAnalysis {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    return {
      shape: "csv",
      presentation: "facts",
      rowCount: lines.length,
      summary: `CSV with ${lines.length} line(s) — treating as key-value`,
    };
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rowCount = lines.length - 1;
  const hasNumeric = lines.slice(1).some((line) => {
    const vals = line.split(",");
    return vals.some((v) => !isNaN(Number(v.trim())));
  });

  return {
    shape: "csv",
    presentation: rowCount > 5 ? "table" : "facts",
    columns: headers,
    rowCount,
    hasNumericValues: hasNumeric,
    summary: `CSV with ${headers.length} columns and ${rowCount} rows`,
  };
}

function analyzeArray(arr: unknown[]): DataAnalysis {
  if (arr.length === 0) {
    return {
      shape: "flat-array",
      presentation: "list",
      rowCount: 0,
      summary: "Empty array",
    };
  }

  // Array of objects?
  if (arr.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    const objects = arr as Record<string, unknown>[];
    const firstObj = objects[0];
    const columns = Object.keys(firstObj);
    const rowCount = arr.length;

    // Check for image URLs
    const hasImageUrls = columns.some((col) => {
      const val = String(firstObj[col] || "");
      return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(val) || col.toLowerCase().includes("image") || col.toLowerCase().includes("url");
    });

    // Check for numeric values (chart candidate)
    const numericCols = columns.filter((col) =>
      objects.every((obj) => typeof obj[col] === "number" || !isNaN(Number(obj[col]))),
    );
    const hasNumeric = numericCols.length > 0;

    // Check for date values
    const hasDate = columns.some((col) => {
      const val = String(firstObj[col] || "");
      return !isNaN(Date.parse(val)) && val.length > 5;
    });

    // Determine best presentation
    let presentation: DataPresentation = "table";
    if (hasImageUrls && columns.length <= 3) {
      presentation = "carousel";
    } else if (hasNumeric && columns.length <= 3 && rowCount >= 3) {
      presentation = "chart-bar";
    } else if (rowCount <= 6 && columns.length <= 2) {
      presentation = "facts";
    } else if (columns.length <= 2 && !hasNumeric) {
      presentation = "list";
    }

    return {
      shape: "array-of-objects",
      presentation,
      columns,
      rowCount,
      hasNumericValues: hasNumeric,
      hasDateValues: hasDate,
      hasImageUrls,
      summary: `Array of ${rowCount} objects with ${columns.length} fields: ${columns.join(", ")}`,
    };
  }

  // Flat array of primitives
  return {
    shape: "flat-array",
    presentation: "list",
    rowCount: arr.length,
    summary: `Array of ${arr.length} items`,
  };
}

function analyzeObject(obj: Record<string, unknown>): DataAnalysis {
  const keys = Object.keys(obj);

  // Check if all values are primitives → key-value / facts
  const allPrimitive = keys.every((k) => {
    const v = obj[k];
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  });

  if (allPrimitive) {
    const hasNumeric = keys.some((k) => typeof obj[k] === "number");
    return {
      shape: "key-value",
      presentation: "facts",
      columns: keys,
      hasNumericValues: hasNumeric,
      summary: `Object with ${keys.length} key-value pairs: ${keys.join(", ")}`,
    };
  }

  // Nested object — check for arrays inside
  const arrayKeys = keys.filter((k) => Array.isArray(obj[k]));
  if (arrayKeys.length > 0) {
    return {
      shape: "nested-object",
      presentation: "table",
      columns: keys,
      summary: `Nested object with ${keys.length} keys, ${arrayKeys.length} array(s): ${arrayKeys.join(", ")}`,
    };
  }

  return {
    shape: "nested-object",
    presentation: "facts",
    columns: keys,
    summary: `Nested object with ${keys.length} keys`,
  };
}

/**
 * Parse CSV string into array of objects
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}
