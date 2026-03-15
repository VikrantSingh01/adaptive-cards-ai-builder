/**
 * Card Assembler — Deterministic card construction from patterns and data
 * This is the fallback when no LLM API key is available.
 */

import type { CardIntent, DataPresentation, HostApp } from "../types/index.js";
import { analyzeData, parseCSV } from "./data-analyzer.js";
import { findPatternByIntent, findPatternByName, scorePatterns } from "./layout-patterns.js";

interface AssembleOptions {
  title?: string;
  content?: string;
  data?: unknown;
  intent?: CardIntent;
  presentation?: DataPresentation;
  host?: HostApp;
  version?: string;
}

/**
 * Assemble a card from content description and optional data
 */
export function assembleCard(options: AssembleOptions): Record<string, unknown> {
  const { content, data, intent, presentation, version = "1.6" } = options;

  // If we have structured data, build a data-driven card
  if (data) {
    return assembleDataCard(data, {
      title: options.title || extractTitle(content || ""),
      presentation,
      version,
    });
  }

  // If we have an intent, use the matching pattern
  if (intent) {
    const pattern = findPatternByIntent(intent);
    if (pattern) {
      return fillPattern(pattern.template as Record<string, unknown>, options);
    }
  }

  // Score patterns against the content description
  if (content) {
    const scored = scorePatterns(content);
    if (scored.length > 0 && scored[0].score > 0) {
      return fillPattern(
        scored[0].pattern.template as Record<string, unknown>,
        options,
      );
    }
  }

  // Default: simple notification card
  return buildSimpleCard(options);
}

/**
 * Assemble a data-driven card
 */
function assembleDataCard(
  data: unknown,
  opts: { title: string; presentation?: DataPresentation; version: string },
): Record<string, unknown> {
  const analysis = analyzeData(data);
  const pres = opts.presentation === "auto" || !opts.presentation
    ? analysis.presentation
    : opts.presentation;

  switch (pres) {
    case "table":
      return buildTableCard(data, opts.title, opts.version, analysis);
    case "facts":
      return buildFactsCard(data, opts.title, opts.version);
    case "chart-bar":
      return buildChartCard(data, opts.title, opts.version, "BarChart");
    case "chart-line":
      return buildChartCard(data, opts.title, opts.version, "LineChart");
    case "chart-pie":
      return buildChartCard(data, opts.title, opts.version, "PieChart");
    case "chart-donut":
      return buildChartCard(data, opts.title, opts.version, "DonutChart");
    case "list":
      return buildListCard(data, opts.title, opts.version);
    case "carousel":
      return buildCarouselCard(data, opts.title, opts.version);
    default:
      return buildTableCard(data, opts.title, opts.version, analysis);
  }
}

function buildTableCard(
  data: unknown,
  title: string,
  version: string,
  analysis: ReturnType<typeof analyzeData>,
): Record<string, unknown> {
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = analysis.columns || [];

  if (typeof data === "string") {
    rows = parseCSV(data);
    if (rows.length > 0) columns = Object.keys(rows[0]);
  } else if (Array.isArray(data)) {
    rows = data as Record<string, unknown>[];
    if (rows.length > 0) columns = Object.keys(rows[0]);
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Find first array value
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        rows = obj[key] as Record<string, unknown>[];
        if (rows.length > 0) columns = Object.keys(rows[0]);
        break;
      }
    }
  }

  return {
    type: "AdaptiveCard",
    version,
    body: [
      {
        type: "TextBlock",
        text: title || "Data",
        size: "medium",
        weight: "bolder",
        wrap: true,
        style: "heading",
      },
      {
        type: "Table",
        firstRowAsHeader: true,
        showGridLines: true,
        gridStyle: "accent",
        columns: columns.map((col) => ({
          width: 1,
        })),
        rows: [
          // Header row
          {
            type: "TableRow",
            cells: columns.map((col) => ({
              type: "TableCell",
              items: [
                {
                  type: "TextBlock",
                  text: col,
                  weight: "bolder",
                  wrap: true,
                },
              ],
            })),
          },
          // Data rows
          ...rows.slice(0, 20).map((row) => ({
            type: "TableRow",
            cells: columns.map((col) => ({
              type: "TableCell",
              items: [
                {
                  type: "TextBlock",
                  text: String(row[col] ?? ""),
                  wrap: true,
                },
              ],
            })),
          })),
        ],
      },
    ],
  };
}

function buildFactsCard(
  data: unknown,
  title: string,
  version: string,
): Record<string, unknown> {
  let facts: Array<{ title: string; value: string }> = [];

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    facts = Object.entries(obj)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .map(([k, v]) => ({
        title: formatLabel(k),
        value: String(v),
      }));
  } else if (Array.isArray(data)) {
    const arr = data as Record<string, unknown>[];
    if (arr.length > 0) {
      const keys = Object.keys(arr[0]);
      if (keys.length === 2) {
        facts = arr.map((item) => ({
          title: String(item[keys[0]] ?? ""),
          value: String(item[keys[1]] ?? ""),
        }));
      } else {
        facts = arr.map((item, i) => ({
          title: String(item[keys[0]] || `Item ${i + 1}`),
          value: keys.slice(1).map((k) => String(item[k] ?? "")).join(", "),
        }));
      }
    }
  }

  return {
    type: "AdaptiveCard",
    version,
    body: [
      {
        type: "TextBlock",
        text: title || "Details",
        size: "medium",
        weight: "bolder",
        wrap: true,
        style: "heading",
      },
      {
        type: "FactSet",
        facts: facts.slice(0, 20),
      },
    ],
  };
}

function buildChartCard(
  data: unknown,
  title: string,
  version: string,
  chartType: string,
): Record<string, unknown> {
  // Build chart data from array
  const chartData: Array<{ x: string; y: number }> = [];

  if (Array.isArray(data)) {
    const arr = data as Record<string, unknown>[];
    if (arr.length > 0) {
      const keys = Object.keys(arr[0]);
      const labelKey = keys[0];
      const valueKey = keys.find((k) => typeof arr[0][k] === "number") || keys[1];

      for (const item of arr) {
        chartData.push({
          x: String(item[labelKey] ?? ""),
          y: Number(item[valueKey] ?? 0),
        });
      }
    }
  }

  return {
    type: "AdaptiveCard",
    version,
    body: [
      {
        type: "TextBlock",
        text: title || "Chart",
        size: "medium",
        weight: "bolder",
        wrap: true,
        style: "heading",
      },
      {
        type: chartType,
        title: title || "Chart",
        data: chartData,
      },
    ],
  };
}

function buildListCard(
  data: unknown,
  title: string,
  version: string,
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [];

  if (Array.isArray(data)) {
    for (const item of data.slice(0, 20)) {
      if (typeof item === "string") {
        items.push({
          type: "TextBlock",
          text: `- ${item}`,
          wrap: true,
        });
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const keys = Object.keys(obj);
        const primary = String(obj[keys[0]] ?? "");
        const secondary = keys.length > 1 ? String(obj[keys[1]] ?? "") : "";

        items.push({
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: primary,
                  weight: "bolder",
                  wrap: true,
                },
                ...(secondary
                  ? [
                      {
                        type: "TextBlock",
                        text: secondary,
                        isSubtle: true,
                        spacing: "none",
                        wrap: true,
                      },
                    ]
                  : []),
              ],
            },
          ],
          separator: items.length > 0,
        });
      }
    }
  }

  return {
    type: "AdaptiveCard",
    version,
    body: [
      {
        type: "TextBlock",
        text: title || "List",
        size: "medium",
        weight: "bolder",
        wrap: true,
        style: "heading",
      },
      ...items,
    ],
  };
}

function buildCarouselCard(
  data: unknown,
  title: string,
  version: string,
): Record<string, unknown> {
  const pages: Array<Record<string, unknown>> = [];

  if (Array.isArray(data)) {
    for (const item of data.slice(0, 10)) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const keys = Object.keys(obj);
        const imageKey = keys.find(
          (k) =>
            k.toLowerCase().includes("image") ||
            k.toLowerCase().includes("url") ||
            k.toLowerCase().includes("src"),
        );
        const titleKey = keys.find(
          (k) => k.toLowerCase().includes("title") || k.toLowerCase().includes("name"),
        ) || keys[0];

        const pageItems: Record<string, unknown>[] = [];

        if (imageKey && obj[imageKey]) {
          pageItems.push({
            type: "Image",
            url: String(obj[imageKey]),
            altText: String(obj[titleKey] ?? "Image"),
            size: "large",
          });
        }

        pageItems.push({
          type: "TextBlock",
          text: String(obj[titleKey] ?? ""),
          weight: "bolder",
          wrap: true,
        });

        pages.push({
          type: "CarouselPage",
          items: pageItems,
        });
      }
    }
  }

  return {
    type: "AdaptiveCard",
    version,
    body: [
      {
        type: "TextBlock",
        text: title || "Gallery",
        size: "medium",
        weight: "bolder",
        wrap: true,
        style: "heading",
      },
      {
        type: "Carousel",
        pages,
      },
    ],
  };
}

function buildSimpleCard(options: AssembleOptions): Record<string, unknown> {
  const body: Record<string, unknown>[] = [];

  if (options.title || options.content) {
    body.push({
      type: "TextBlock",
      text: options.title || extractTitle(options.content || ""),
      size: "medium",
      weight: "bolder",
      wrap: true,
      style: "heading",
    });
  }

  if (options.content) {
    body.push({
      type: "TextBlock",
      text: options.content,
      wrap: true,
    });
  }

  return {
    type: "AdaptiveCard",
    version: options.version || "1.6",
    body,
  };
}

function fillPattern(
  template: Record<string, unknown>,
  options: AssembleOptions,
): Record<string, unknown> {
  // Deep clone the template
  const card = JSON.parse(JSON.stringify(template));

  // Replace placeholders with actual values
  const replacements: Record<string, string> = {
    "{{title}}": options.title || extractTitle(options.content || "Untitled"),
    "{{body}}": options.content || "",
    "{{description}}": options.content || "",
    "{{subtitle}}": "",
    "{{requesterName}}": "",
    "{{avatarUrl}}": "https://adaptivecards.io/content/cats/1.png",
    "{{iconUrl}}": "https://adaptivecards.io/content/pending.png",
    "{{status}}": "Status",
    "{{name}}": "",
    "{{role}}": "",
    "{{organization}}": "",
    "{{profileUrl}}": "https://example.com",
  };

  function replaceInObj(obj: unknown): unknown {
    if (typeof obj === "string") {
      for (const [placeholder, value] of Object.entries(replacements)) {
        obj = (obj as string).replace(placeholder, value);
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceInObj);
    }
    if (obj && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[key] = replaceInObj(value);
      }
      return result;
    }
    return obj;
  }

  const filled = replaceInObj(card) as Record<string, unknown>;
  if (options.version) {
    filled.version = options.version;
  }
  return filled;
}

function extractTitle(content: string): string {
  // Extract first sentence or first N words as title
  const firstSentence = content.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length <= 60) return firstSentence;
  return firstSentence.slice(0, 57) + "...";
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
