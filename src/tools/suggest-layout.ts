/**
 * suggest_layout tool handler
 */

import type { SuggestLayoutInput, SuggestLayoutOutput, LayoutSuggestion } from "../types/index.js";
import { scorePatterns } from "../generation/layout-patterns.js";
import { getHostSupport } from "../core/host-compatibility.js";

/**
 * Suggest the best layout pattern for a given description and constraints
 */
export function handleSuggestLayout(input: SuggestLayoutInput): SuggestLayoutOutput {
  const { description, constraints } = input;

  const scored = scorePatterns(description);

  if (scored.length === 0 || scored[0].score === 0) {
    // No strong match — return a generic suggestion
    return {
      suggestion: {
        pattern: "notification",
        elements: ["TextBlock", "ActionSet"],
        layout: "Simple vertical layout with a title, body text, and optional actions. Best for general-purpose content.",
        rationale:
          "No specific layout pattern strongly matched your description. The notification pattern is the most versatile starting point. Refine your description with keywords like 'table', 'form', 'dashboard', 'approval', 'list', 'profile', 'chart', or 'gallery' for more targeted suggestions.",
      },
      alternatives: buildAlternatives(scored.slice(0, 3), constraints),
    };
  }

  const best = scored[0];
  const pattern = best.pattern;

  // Check host compatibility if specified
  let hostWarning = "";
  if (constraints?.targetHost) {
    const support = getHostSupport(constraints.targetHost);
    const unsupportedInPattern = pattern.elements.filter((el) =>
      support.unsupportedElements.includes(el),
    );
    if (unsupportedInPattern.length > 0) {
      hostWarning = ` Note: ${unsupportedInPattern.join(", ")} not supported on ${constraints.targetHost}. Alternative elements will be needed.`;
    }
  }

  // Build layout description
  const layout = buildLayoutDescription(pattern.name, pattern.elements, pattern.dataShape);

  // Build rationale
  const rationale = buildRationale(pattern, description, constraints) + hostWarning;

  const suggestion: LayoutSuggestion = {
    pattern: pattern.name,
    elements: pattern.elements,
    layout,
    rationale,
    similarExample: pattern.example,
  };

  // Build alternatives from the next best matches (excluding the top pick)
  const altCandidates = scored
    .slice(1)
    .filter((s) => s.score > 0)
    .slice(0, 3);

  const alternatives = buildAlternatives(altCandidates, constraints);

  return { suggestion, alternatives };
}

// ─── Layout Description Builder ──────────────────────────────────────────────

function buildLayoutDescription(
  patternName: string,
  elements: string[],
  dataShape: string,
): string {
  const descriptions: Record<string, string> = {
    notification:
      "Vertical stack: heading TextBlock at the top, body TextBlock below, optional action buttons at the bottom. Best for alerts, announcements, and simple messages.",
    approval:
      "Header section with emphasis background, requester info in a two-column layout (avatar + name), FactSet for request details, and approve/reject/comment actions at the bottom.",
    "data-table":
      "Title heading followed by a Table element with header row and data rows. Grid lines and accent styling for readability. Best for structured tabular data.",
    facts:
      "Title heading followed by a FactSet displaying key-value pairs. Clean and compact layout for metadata, properties, or summary information.",
    "image-gallery":
      "Title heading followed by an ImageSet displaying multiple images in a grid. Supports configurable image sizes. Best for photo collections and portfolios.",
    dashboard:
      "Title heading followed by a ColumnSet with metric columns. Each column shows a KPI value. Optionally includes charts below the metrics row.",
    "input-form":
      "Title heading, optional description, followed by input fields (text, choice, date, toggle). Submit action at the bottom. Fields include labels for accessibility.",
    "status-update":
      "Two-column header (icon + title/subtitle), followed by FactSet with status details. Compact layout for activity feeds and progress tracking.",
    list:
      "Title heading followed by repeated item containers. Each item has a primary text and optional secondary text. Separators between items.",
    profile:
      "Two-column header (large avatar + name/role/org), followed by FactSet for contact details, and action button to view full profile.",
    chart:
      "Title heading followed by a chart element (BarChart, LineChart, PieChart, or DonutChart). Data-driven visualization for analytics and reporting.",
  };

  const base = descriptions[patternName] || `Layout using ${elements.join(", ")} elements.`;
  const dataNote =
    dataShape === "array"
      ? " Expects array-shaped data."
      : dataShape === "key-value"
        ? " Expects key-value pair data."
        : dataShape === "single-object"
          ? " Expects a single data object."
          : "";

  return base + dataNote;
}

// ─── Rationale Builder ──────────────────────────────────────────────────────

function buildRationale(
  pattern: { name: string; description: string; dataShape: string; intent: string[] },
  description: string,
  constraints?: SuggestLayoutInput["constraints"],
): string {
  const parts: string[] = [];

  parts.push(
    `The "${pattern.name}" pattern is recommended because it aligns with your described use case.`,
  );
  parts.push(`This pattern is designed for ${pattern.intent.join(" and ")} scenarios.`);

  if (pattern.dataShape !== "any") {
    parts.push(`It works best with ${pattern.dataShape} data.`);
  }

  if (constraints?.interactive === true) {
    if (pattern.intent.includes("form") || pattern.intent.includes("approval")) {
      parts.push("This pattern supports user interaction through input fields and action buttons.");
    } else {
      parts.push(
        "For interactive scenarios, consider adding Action.Execute buttons or input fields to this layout.",
      );
    }
  }

  if (constraints?.interactive === false) {
    parts.push("This pattern can be used in display-only mode by omitting action buttons.");
  }

  if (constraints?.maxWidth && constraints.maxWidth < 400) {
    parts.push(
      "For narrow widths, consider reducing column count or switching to a single-column vertical layout.",
    );
  }

  return parts.join(" ");
}

// ─── Alternatives Builder ────────────────────────────────────────────────────

function buildAlternatives(
  candidates: Array<{ pattern: { name: string; description: string; elements: string[]; dataShape: string }; score: number }>,
  constraints?: SuggestLayoutInput["constraints"],
): Array<{ pattern: string; tradeoff: string }> {
  return candidates.map(({ pattern }) => {
    const tradeoff = buildTradeoff(pattern, constraints);
    return {
      pattern: pattern.name,
      tradeoff,
    };
  });
}

function buildTradeoff(
  pattern: { name: string; description: string; elements: string[]; dataShape: string },
  constraints?: SuggestLayoutInput["constraints"],
): string {
  const tradeoffs: Record<string, string> = {
    notification:
      "Simpler layout with less structure, but very fast to render and universally supported across all hosts.",
    approval:
      "Rich interactive layout with approve/reject actions, but more complex and heavier than a simple display card.",
    "data-table":
      "Best for tabular data, but Table element requires v1.5+ and is not supported on all hosts (e.g., Webex).",
    facts:
      "Compact key-value display, but limited to simple label-value pairs without nested data.",
    "image-gallery":
      "Visual-first layout for images, but requires image URLs and may be heavy on bandwidth.",
    dashboard:
      "Great for KPI metrics overview, but can feel cramped on narrow screens with many columns.",
    "input-form":
      "Enables data collection, but requires Action.Execute/Submit handling on the backend.",
    "status-update":
      "Compact activity/status display, but may not accommodate large amounts of detail text.",
    list:
      "Clean repeated-item layout, but lacks visual richness compared to ColumnSet or Carousel approaches.",
    profile:
      "Person-centric layout with avatar, but requires profile image URL and structured person data.",
    chart:
      "Data visualization with charts, but chart elements are Teams-specific extensions (v1.6+) and not portable.",
  };

  let base = tradeoffs[pattern.name] || `${pattern.description}. Uses ${pattern.elements.join(", ")}.`;

  // Add host-specific tradeoff note
  if (constraints?.targetHost) {
    const support = getHostSupport(constraints.targetHost);
    const unsupported = pattern.elements.filter((el) =>
      support.unsupportedElements.includes(el),
    );
    if (unsupported.length > 0) {
      base += ` Warning: ${unsupported.join(", ")} not supported on ${constraints.targetHost}.`;
    }
  }

  return base;
}
