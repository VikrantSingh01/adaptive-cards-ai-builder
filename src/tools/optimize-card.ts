/**
 * optimize_card tool handler
 */

import type { OptimizeCardInput, OptimizeCardOutput, OptimizationGoal } from "../types/index.js";
import { analyzeCard } from "../core/card-analyzer.js";
import { checkAccessibility } from "../core/accessibility-checker.js";

interface Change {
  description: string;
  before: string;
  after: string;
}

/**
 * Optimize an Adaptive Card for accessibility, performance, compactness, modernity, or readability
 */
export function handleOptimizeCard(input: OptimizeCardInput): OptimizeCardOutput {
  const { card, goals = ["accessibility", "performance", "modern"], host } = input;

  // Capture before metrics
  const statsBefore = analyzeCard(card);
  const accessBefore = checkAccessibility(card);

  // Deep clone the card for mutation
  const optimized = JSON.parse(JSON.stringify(card)) as Record<string, unknown>;
  const changes: Change[] = [];

  // Apply each optimization goal in order
  for (const goal of goals) {
    switch (goal) {
      case "accessibility":
        optimizeAccessibility(optimized, changes);
        break;
      case "performance":
        optimizePerformance(optimized, changes);
        break;
      case "compact":
        optimizeCompact(optimized, changes);
        break;
      case "modern":
        optimizeModern(optimized, changes);
        break;
      case "readability":
        optimizeReadability(optimized, changes);
        break;
    }
  }

  // Capture after metrics
  const statsAfter = analyzeCard(optimized);
  const accessAfter = checkAccessibility(optimized);

  return {
    card: optimized,
    changes,
    improvement: {
      accessibilityBefore: accessBefore.score,
      accessibilityAfter: accessAfter.score,
      elementCountBefore: statsBefore.elementCount,
      elementCountAfter: statsAfter.elementCount,
      nestingDepthBefore: statsBefore.nestingDepth,
      nestingDepthAfter: statsAfter.nestingDepth,
    },
  };
}

// ─── Accessibility Optimizations ──────────────────────────────────────────────

function optimizeAccessibility(card: Record<string, unknown>, changes: Change[]): void {
  // Add speak property if missing
  if (!card.speak) {
    const speakText = extractSpeakText(card);
    if (speakText) {
      card.speak = speakText;
      changes.push({
        description: "Added 'speak' property for screen reader accessibility",
        before: "speak: (missing)",
        after: `speak: "${truncate(speakText, 80)}"`,
      });
    }
  }

  // Walk body elements
  if (Array.isArray(card.body)) {
    walkAndFixAccessibility(card.body, "$.body", changes);
  }

  // Walk actions
  if (Array.isArray(card.actions)) {
    for (let i = 0; i < card.actions.length; i++) {
      const action = card.actions[i] as Record<string, unknown>;
      if (action && typeof action === "object" && !action.title) {
        const verb = (action.verb as string) || (action.type as string) || "Action";
        const title = formatActionTitle(verb);
        action.title = title;
        changes.push({
          description: `Added title to action at $.actions[${i}]`,
          before: "title: (missing)",
          after: `title: "${title}"`,
        });
      }
    }
  }
}

function walkAndFixAccessibility(
  elements: unknown[],
  parentPath: string,
  changes: Change[],
): void {
  if (!Array.isArray(elements)) return;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") continue;
    const path = `${parentPath}[${i}]`;
    const type = el.type as string;

    if (type === "Image" && !el.altText) {
      const altText = deriveAltText(el);
      el.altText = altText;
      changes.push({
        description: `Added altText to Image at ${path}`,
        before: "altText: (missing)",
        after: `altText: "${altText}"`,
      });
    }

    if (type === "TextBlock" && el.wrap !== true) {
      el.wrap = true;
      changes.push({
        description: `Added wrap:true to TextBlock at ${path}`,
        before: "wrap: (missing or false)",
        after: "wrap: true",
      });
    }

    if (type && type.startsWith("Input.") && !el.label) {
      const label = deriveInputLabel(el);
      el.label = label;
      changes.push({
        description: `Added label to ${type} at ${path}`,
        before: "label: (missing)",
        after: `label: "${label}"`,
      });
    }

    // Recurse into containers
    if (Array.isArray(el.items)) {
      walkAndFixAccessibility(el.items as unknown[], `${path}.items`, changes);
    }
    if (Array.isArray(el.columns)) {
      for (let c = 0; c < (el.columns as unknown[]).length; c++) {
        const col = (el.columns as Record<string, unknown>[])[c];
        if (col && Array.isArray(col.items)) {
          walkAndFixAccessibility(col.items as unknown[], `${path}.columns[${c}].items`, changes);
        }
      }
    }
    if (Array.isArray(el.rows)) {
      for (let r = 0; r < (el.rows as unknown[]).length; r++) {
        const row = (el.rows as Record<string, unknown>[])[r];
        if (row && Array.isArray(row.cells)) {
          for (let ce = 0; ce < (row.cells as unknown[]).length; ce++) {
            const cell = (row.cells as Record<string, unknown>[])[ce];
            if (cell && Array.isArray(cell.items)) {
              walkAndFixAccessibility(
                cell.items as unknown[],
                `${path}.rows[${r}].cells[${ce}].items`,
                changes,
              );
            }
          }
        }
      }
    }
    if (Array.isArray(el.actions)) {
      for (let a = 0; a < (el.actions as unknown[]).length; a++) {
        const act = (el.actions as Record<string, unknown>[])[a];
        if (act && typeof act === "object" && !act.title) {
          const verb = (act.verb as string) || (act.type as string) || "Action";
          const title = formatActionTitle(verb);
          act.title = title;
          changes.push({
            description: `Added title to action at ${path}.actions[${a}]`,
            before: "title: (missing)",
            after: `title: "${title}"`,
          });
        }
      }
    }
  }
}

// ─── Performance Optimizations ────────────────────────────────────────────────

function optimizePerformance(card: Record<string, unknown>, changes: Change[]): void {
  if (Array.isArray(card.body)) {
    card.body = flattenSingleChildContainers(card.body as unknown[], "$.body", changes);
    removeEmptyArrays(card.body as unknown[], "$.body", changes);
  }
}

function flattenSingleChildContainers(
  elements: unknown[],
  parentPath: string,
  changes: Change[],
): unknown[] {
  const result: unknown[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") {
      result.push(el);
      continue;
    }
    const path = `${parentPath}[${i}]`;

    // Flatten Container with single child and no special properties
    if (
      el.type === "Container" &&
      Array.isArray(el.items) &&
      el.items.length === 1 &&
      !el.style &&
      !el.backgroundImage &&
      !el.selectAction &&
      !el.bleed &&
      !el.$when &&
      !el.$data &&
      !el.id
    ) {
      const child = el.items[0] as Record<string, unknown>;
      changes.push({
        description: `Flattened single-child Container at ${path}`,
        before: `Container { items: [${child.type || "element"}] }`,
        after: `${child.type || "element"} (unwrapped)`,
      });
      // Recurse into the promoted child
      if (Array.isArray(child.items)) {
        child.items = flattenSingleChildContainers(child.items as unknown[], `${path}.items`, changes);
      }
      result.push(child);
      continue;
    }

    // Recurse into containers
    if (Array.isArray(el.items)) {
      el.items = flattenSingleChildContainers(el.items as unknown[], `${path}.items`, changes);
    }
    if (Array.isArray(el.columns)) {
      for (let c = 0; c < (el.columns as unknown[]).length; c++) {
        const col = (el.columns as Record<string, unknown>[])[c];
        if (col && Array.isArray(col.items)) {
          col.items = flattenSingleChildContainers(
            col.items as unknown[],
            `${path}.columns[${c}].items`,
            changes,
          );
        }
      }
    }

    result.push(el);
  }

  return result;
}

function removeEmptyArrays(elements: unknown[], parentPath: string, changes: Change[]): void {
  if (!Array.isArray(elements)) return;

  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") continue;
    const path = `${parentPath}[${i}]`;

    // Remove ActionSets with empty actions
    if (el.type === "ActionSet" && Array.isArray(el.actions) && el.actions.length === 0) {
      elements.splice(i, 1);
      changes.push({
        description: `Removed empty ActionSet at ${path}`,
        before: "ActionSet { actions: [] }",
        after: "(removed)",
      });
      continue;
    }

    // Remove Containers with empty items
    if (el.type === "Container" && Array.isArray(el.items) && el.items.length === 0) {
      elements.splice(i, 1);
      changes.push({
        description: `Removed empty Container at ${path}`,
        before: "Container { items: [] }",
        after: "(removed)",
      });
      continue;
    }

    // Remove ImageSets with empty images
    if (el.type === "ImageSet" && Array.isArray(el.images) && el.images.length === 0) {
      elements.splice(i, 1);
      changes.push({
        description: `Removed empty ImageSet at ${path}`,
        before: "ImageSet { images: [] }",
        after: "(removed)",
      });
      continue;
    }

    // Recurse
    if (Array.isArray(el.items)) {
      removeEmptyArrays(el.items as unknown[], `${path}.items`, changes);
    }
    if (Array.isArray(el.columns)) {
      for (let c = 0; c < (el.columns as unknown[]).length; c++) {
        const col = (el.columns as Record<string, unknown>[])[c];
        if (col && Array.isArray(col.items)) {
          removeEmptyArrays(col.items as unknown[], `${path}.columns[${c}].items`, changes);
        }
      }
    }
  }
}

// ─── Compact Optimizations ────────────────────────────────────────────────────

function optimizeCompact(card: Record<string, unknown>, changes: Change[]): void {
  if (Array.isArray(card.body)) {
    removeExcessiveSpacing(card.body as unknown[], "$.body", changes);
    mergeAdjacentTextBlocks(card.body as unknown[], "$.body", changes);
    reducePadding(card.body as unknown[], "$.body", changes);
  }
}

function removeExcessiveSpacing(elements: unknown[], parentPath: string, changes: Change[]): void {
  if (!Array.isArray(elements)) return;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") continue;
    const path = `${parentPath}[${i}]`;

    // Replace extraLarge spacing with medium
    if (el.spacing === "extraLarge") {
      changes.push({
        description: `Reduced excessive spacing at ${path}`,
        before: 'spacing: "extraLarge"',
        after: 'spacing: "medium"',
      });
      el.spacing = "medium";
    }

    // Replace large spacing with default
    if (el.spacing === "large") {
      changes.push({
        description: `Reduced spacing at ${path}`,
        before: 'spacing: "large"',
        after: 'spacing: "default"',
      });
      el.spacing = "default";
    }

    // Recurse
    if (Array.isArray(el.items)) {
      removeExcessiveSpacing(el.items as unknown[], `${path}.items`, changes);
    }
    if (Array.isArray(el.columns)) {
      for (let c = 0; c < (el.columns as unknown[]).length; c++) {
        const col = (el.columns as Record<string, unknown>[])[c];
        if (col && Array.isArray(col.items)) {
          removeExcessiveSpacing(col.items as unknown[], `${path}.columns[${c}].items`, changes);
        }
      }
    }
  }
}

function mergeAdjacentTextBlocks(elements: unknown[], parentPath: string, changes: Change[]): void {
  if (!Array.isArray(elements)) return;

  for (let i = elements.length - 1; i > 0; i--) {
    const curr = elements[i] as Record<string, unknown>;
    const prev = elements[i - 1] as Record<string, unknown>;
    if (!curr || !prev || typeof curr !== "object" || typeof prev !== "object") continue;

    // Merge adjacent plain TextBlocks with same styling (no special properties)
    if (
      curr.type === "TextBlock" &&
      prev.type === "TextBlock" &&
      !curr.size && !prev.size &&
      !curr.weight && !prev.weight &&
      !curr.color && !prev.color &&
      !curr.style && !prev.style &&
      !curr.id && !prev.id &&
      curr.isSubtle === prev.isSubtle &&
      typeof curr.text === "string" &&
      typeof prev.text === "string" &&
      !curr.text.includes("${") &&
      !prev.text.includes("${")
    ) {
      const mergedText = `${prev.text}\n\n${curr.text}`;
      changes.push({
        description: `Merged adjacent TextBlocks at ${parentPath}[${i - 1}] and ${parentPath}[${i}]`,
        before: `TextBlock("${truncate(prev.text, 30)}") + TextBlock("${truncate(curr.text, 30)}")`,
        after: `TextBlock("${truncate(mergedText, 60)}")`,
      });
      prev.text = mergedText;
      elements.splice(i, 1);
    }
  }

  // Recurse into remaining elements
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") continue;
    const path = `${parentPath}[${i}]`;

    if (Array.isArray(el.items)) {
      mergeAdjacentTextBlocks(el.items as unknown[], `${path}.items`, changes);
    }
    if (Array.isArray(el.columns)) {
      for (let c = 0; c < (el.columns as unknown[]).length; c++) {
        const col = (el.columns as Record<string, unknown>[])[c];
        if (col && Array.isArray(col.items)) {
          mergeAdjacentTextBlocks(col.items as unknown[], `${path}.columns[${c}].items`, changes);
        }
      }
    }
  }
}

function reducePadding(elements: unknown[], parentPath: string, changes: Change[]): void {
  if (!Array.isArray(elements)) return;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as Record<string, unknown>;
    if (!el || typeof el !== "object") continue;
    const path = `${parentPath}[${i}]`;

    // Remove padding spacing from containers that don't need it
    if (el.type === "Container" && el.spacing === "padding") {
      changes.push({
        description: `Reduced padding spacing on Container at ${path}`,
        before: 'spacing: "padding"',
        after: 'spacing: "default"',
      });
      el.spacing = "default";
    }

    // Recurse
    if (Array.isArray(el.items)) {
      reducePadding(el.items as unknown[], `${path}.items`, changes);
    }
  }
}

// ─── Modern Optimizations ─────────────────────────────────────────────────────

function optimizeModern(card: Record<string, unknown>, changes: Change[]): void {
  // Upgrade version to 1.6 if lower
  const currentVersion = card.version as string;
  if (currentVersion && parseFloat(currentVersion) < 1.6) {
    changes.push({
      description: "Upgraded card version to 1.6",
      before: `version: "${currentVersion}"`,
      after: 'version: "1.6"',
    });
    card.version = "1.6";
  }

  // Replace Action.Submit with Action.Execute
  replaceSubmitWithExecute(card, "$", changes);

  // Add style:"heading" to the first TextBlock if missing
  if (Array.isArray(card.body) && card.body.length > 0) {
    const first = card.body[0] as Record<string, unknown>;
    if (
      first &&
      typeof first === "object" &&
      first.type === "TextBlock" &&
      !first.style &&
      (first.size === "medium" || first.size === "large" || first.weight === "bolder")
    ) {
      first.style = "heading";
      changes.push({
        description: 'Added style:"heading" to first TextBlock for semantic structure',
        before: "style: (missing)",
        after: 'style: "heading"',
      });
    }
  }
}

function replaceSubmitWithExecute(obj: unknown, path: string, changes: Change[]): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      replaceSubmitWithExecute(obj[i], `${path}[${i}]`, changes);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  if (record.type === "Action.Submit") {
    const dataPayload = record.data as Record<string, unknown> | undefined;
    changes.push({
      description: `Replaced Action.Submit with Action.Execute at ${path}`,
      before: "Action.Submit",
      after: "Action.Execute",
    });
    record.type = "Action.Execute";
    // Move data to Action.Execute's data property and add a verb if possible
    if (dataPayload && typeof dataPayload === "object" && dataPayload.msteams) {
      // Extract verb from msteams data
      const msteams = dataPayload.msteams as Record<string, unknown>;
      if (msteams.type === "messageBack" && msteams.value) {
        record.verb = "submit";
      }
    }
    if (!record.verb) {
      record.verb = "submit";
    }
  }

  // Recurse into all object values
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      replaceSubmitWithExecute(value, path, changes);
    }
  }
}

// ─── Readability Optimizations ────────────────────────────────────────────────

function optimizeReadability(card: Record<string, unknown>, changes: Change[]): void {
  if (!Array.isArray(card.body)) return;

  const body = card.body as Record<string, unknown>[];
  let separatorsAdded = 0;

  // Add separators between major sections (containers, column sets, fact sets, tables)
  const sectionTypes = new Set([
    "Container",
    "ColumnSet",
    "FactSet",
    "Table",
    "ImageSet",
    "ActionSet",
    "Carousel",
  ]);

  for (let i = 1; i < body.length; i++) {
    const curr = body[i];
    const prev = body[i - 1];
    if (!curr || !prev || typeof curr !== "object" || typeof prev !== "object") continue;

    const currType = curr.type as string;
    const prevType = prev.type as string;

    // Add separator between sections if not already present
    if (
      (sectionTypes.has(currType) || sectionTypes.has(prevType)) &&
      curr.separator !== true
    ) {
      curr.separator = true;
      separatorsAdded++;
    }
  }

  if (separatorsAdded > 0) {
    changes.push({
      description: `Added separators between ${separatorsAdded} section boundary(ies) for visual clarity`,
      before: "separator: (missing)",
      after: "separator: true",
    });
  }

  // Ensure spacing between body-level elements is at least "default"
  let spacingFixed = 0;
  for (let i = 1; i < body.length; i++) {
    const el = body[i];
    if (!el || typeof el !== "object") continue;
    if (el.spacing === "none") {
      // Only fix if it's a top-level element and not a subtitle
      const prevEl = body[i - 1] as Record<string, unknown> | undefined;
      const isSubtitle =
        el.type === "TextBlock" &&
        el.isSubtle === true &&
        prevEl?.type === "TextBlock";
      if (!isSubtitle) {
        el.spacing = "default";
        spacingFixed++;
      }
    }
  }

  if (spacingFixed > 0) {
    changes.push({
      description: `Fixed ${spacingFixed} element(s) with spacing:"none" at top level`,
      before: 'spacing: "none"',
      after: 'spacing: "default"',
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSpeakText(card: Record<string, unknown>): string {
  const texts: string[] = [];

  function walk(elements: unknown[]): void {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (!el || typeof el !== "object") continue;
      const element = el as Record<string, unknown>;
      if (element.type === "TextBlock" && typeof element.text === "string") {
        // Skip templating expressions for speak text
        if (!element.text.includes("${")) {
          texts.push(element.text);
        }
      }
      if (Array.isArray(element.items)) walk(element.items);
      if (Array.isArray(element.columns)) {
        for (const col of element.columns) {
          const column = col as Record<string, unknown>;
          if (Array.isArray(column.items)) walk(column.items);
        }
      }
    }
  }

  if (Array.isArray(card.body)) walk(card.body);
  return texts.slice(0, 3).join(". ");
}

function deriveAltText(el: Record<string, unknown>): string {
  // Try to derive from url filename
  if (typeof el.url === "string") {
    const urlStr = el.url as string;
    const filename = urlStr.split("/").pop()?.split("?")[0] || "";
    const name = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    if (name && name.length > 2 && !name.includes("${")) {
      return `Image: ${name}`;
    }
  }
  return "Decorative image";
}

function deriveInputLabel(el: Record<string, unknown>): string {
  // Derive label from id or placeholder
  if (typeof el.id === "string" && el.id.length > 0) {
    return el.id
      .replace(/([A-Z])/g, " $1")
      .replace(/[-_]/g, " ")
      .replace(/^\w/, (c: string) => c.toUpperCase())
      .trim();
  }
  if (typeof el.placeholder === "string") {
    return el.placeholder.replace(/\.\.\.$/, "").replace(/^Enter\s+/i, "").trim() || "Input";
  }
  const type = (el.type as string) || "Input";
  return type.replace("Input.", "");
}

function formatActionTitle(verb: string): string {
  return verb
    .replace("Action.", "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
