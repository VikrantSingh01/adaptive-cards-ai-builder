/**
 * transform_card tool handler
 */

import type { TransformCardInput, TransformCardOutput, HostApp } from "../types/index.js";
import { checkHostCompatibility, getHostSupport } from "../core/host-compatibility.js";
import { analyzeCard } from "../core/card-analyzer.js";

/**
 * Transform an Adaptive Card: upgrade/downgrade version, apply host config, or flatten structure
 */
export function handleTransformCard(input: TransformCardInput): TransformCardOutput {
  const { card, transform, targetVersion, targetHost } = input;

  const result = JSON.parse(JSON.stringify(card)) as Record<string, unknown>;
  const changes: string[] = [];
  const warnings: string[] = [];

  switch (transform) {
    case "upgrade-version":
      upgradeVersion(result, targetVersion || "1.6", changes, warnings);
      break;
    case "downgrade-version":
      downgradeVersion(result, targetVersion || "1.3", changes, warnings);
      break;
    case "apply-host-config":
      applyHostConfig(result, targetHost || "teams", changes, warnings);
      break;
    case "flatten":
      flattenCard(result, changes, warnings);
      break;
  }

  return { card: result, changes, warnings };
}

// ─── Upgrade Version ──────────────────────────────────────────────────────────

function upgradeVersion(
  card: Record<string, unknown>,
  targetVersion: string,
  changes: string[],
  warnings: string[],
): void {
  const currentVersion = card.version as string || "1.0";
  const current = parseFloat(currentVersion);
  const target = parseFloat(targetVersion);

  if (current >= target) {
    warnings.push(`Card is already at version ${currentVersion}, target is ${targetVersion}`);
    return;
  }

  card.version = targetVersion;
  changes.push(`Upgraded version from ${currentVersion} to ${targetVersion}`);

  // Replace Action.Submit with Action.Execute (available from v1.4+)
  if (target >= 1.4) {
    replaceActionsInTree(card, "Action.Submit", "Action.Execute", changes, (action) => {
      if (!action.verb) {
        action.verb = "submit";
      }
    });
  }

  // Add style:"heading" to first TextBlock (v1.5+ feature)
  if (target >= 1.5 && Array.isArray(card.body) && card.body.length > 0) {
    const first = card.body[0] as Record<string, unknown>;
    if (first?.type === "TextBlock" && !first.style) {
      if (first.size === "medium" || first.size === "large" || first.weight === "bolder") {
        first.style = "heading";
        changes.push("Added style:\"heading\" to first TextBlock");
      }
    }
  }

  // Suggest Table usage if ColumnSet-based tables detected (v1.5+ feature)
  if (target >= 1.5) {
    const tabularColumnSets = detectTabularColumnSets(card);
    if (tabularColumnSets > 0) {
      warnings.push(
        `Found ${tabularColumnSets} ColumnSet(s) that may work better as Table elements (available in v1.5+). Consider converting manually.`,
      );
    }
  }
}

// ─── Downgrade Version ────────────────────────────────────────────────────────

function downgradeVersion(
  card: Record<string, unknown>,
  targetVersion: string,
  changes: string[],
  warnings: string[],
): void {
  const currentVersion = card.version as string || "1.6";
  const current = parseFloat(currentVersion);
  const target = parseFloat(targetVersion);

  if (current <= target) {
    warnings.push(`Card is already at version ${currentVersion}, target is ${targetVersion}`);
    return;
  }

  card.version = targetVersion;
  changes.push(`Downgraded version from ${currentVersion} to ${targetVersion}`);

  // v1.5+ features to downgrade
  if (target < 1.5) {
    // Replace Table with ColumnSet equivalent
    if (Array.isArray(card.body)) {
      card.body = replaceTablesWithColumnSets(card.body as unknown[], changes, warnings);
    }

    // Remove style:"heading" (v1.5 feature)
    removePropertyFromTextBlocks(card, "style", changes);
  }

  // v1.6+ features to downgrade
  if (target < 1.6) {
    // Replace Carousel with single-view Container
    if (Array.isArray(card.body)) {
      card.body = replaceCarousels(card.body as unknown[], changes, warnings);
    }
  }

  // v1.4+ features to downgrade
  if (target < 1.4) {
    // Replace Action.Execute with Action.Submit
    replaceActionsInTree(card, "Action.Execute", "Action.Submit", changes, (action) => {
      // Move verb to data
      if (action.verb) {
        if (!action.data || typeof action.data !== "object") {
          action.data = {};
        }
        (action.data as Record<string, unknown>).verb = action.verb;
        delete action.verb;
      }
    });
  }

  // Remove unsupported element types for the target version
  if (Array.isArray(card.body)) {
    const v15Elements = new Set(["Table", "CodeBlock"]);
    const v16Elements = new Set(["Carousel", "TabSet", "Rating", "ProgressBar", "ProgressRing", "Spinner", "Badge", "Icon", "CompoundButton", "List"]);
    const chartElements = new Set(["BarChart", "LineChart", "PieChart", "DonutChart"]);

    const toRemove = new Set<string>();
    if (target < 1.5) v15Elements.forEach((e) => toRemove.add(e));
    if (target < 1.6) v16Elements.forEach((e) => toRemove.add(e));
    if (target < 1.6) chartElements.forEach((e) => toRemove.add(e));

    if (toRemove.size > 0) {
      card.body = removeUnsupportedElements(card.body as unknown[], toRemove, changes, warnings);
    }
  }
}

// ─── Apply Host Config ────────────────────────────────────────────────────────

function applyHostConfig(
  card: Record<string, unknown>,
  host: HostApp,
  changes: string[],
  warnings: string[],
): void {
  const support = getHostSupport(host);
  const compatibility = checkHostCompatibility(card, host);

  if (compatibility.supported) {
    changes.push(`Card is already compatible with ${host}`);
    return;
  }

  // Downgrade version if needed
  const cardVersion = parseFloat(card.version as string || "1.6");
  const maxVersion = parseFloat(support.maxVersion);
  if (cardVersion > maxVersion) {
    changes.push(`Downgraded version from ${card.version} to ${support.maxVersion} for ${host} compatibility`);
    card.version = support.maxVersion;
  }

  // Remove unsupported elements
  const unsupportedEls = new Set(support.unsupportedElements);
  if (unsupportedEls.size > 0 && Array.isArray(card.body)) {
    card.body = removeUnsupportedElements(card.body as unknown[], unsupportedEls, changes, warnings);
  }

  // Replace unsupported actions
  const unsupportedActions = new Set(support.unsupportedActions);
  if (unsupportedActions.size > 0) {
    replaceUnsupportedActions(card, unsupportedActions, host, changes, warnings);
  }

  // Trim actions to max allowed
  if (Array.isArray(card.actions) && card.actions.length > support.maxActions) {
    const removed = card.actions.length - support.maxActions;
    card.actions = card.actions.slice(0, support.maxActions);
    changes.push(`Trimmed actions from ${removed + support.maxActions} to ${support.maxActions} (${host} max)`);
    warnings.push(`${removed} action(s) were removed to meet ${host} limit of ${support.maxActions}`);
  }

  // Handle specific element replacements
  if (unsupportedEls.has("Table") && Array.isArray(card.body)) {
    card.body = replaceTablesWithColumnSets(card.body as unknown[], changes, warnings);
  }

  if (unsupportedEls.has("Carousel") && Array.isArray(card.body)) {
    card.body = replaceCarousels(card.body as unknown[], changes, warnings);
  }

  // Apply version-specific downgrades
  if (maxVersion < 1.5) {
    removePropertyFromTextBlocks(card, "style", changes);
  }

  // Replace Action.Execute with Action.Submit for hosts that don't support it
  if (unsupportedActions.has("Action.Execute")) {
    replaceActionsInTree(card, "Action.Execute", "Action.Submit", changes, (action) => {
      if (action.verb) {
        if (!action.data || typeof action.data !== "object") {
          action.data = {};
        }
        (action.data as Record<string, unknown>).verb = action.verb;
        delete action.verb;
      }
    });
  }

  // Add host-specific notes as warnings
  for (const note of support.notes) {
    warnings.push(`[${host}] ${note}`);
  }
}

// ─── Flatten ──────────────────────────────────────────────────────────────────

function flattenCard(
  card: Record<string, unknown>,
  changes: string[],
  warnings: string[],
): void {
  const statsBefore = analyzeCard(card);

  if (Array.isArray(card.body)) {
    card.body = flattenElements(card.body as unknown[], changes);
  }

  const statsAfter = analyzeCard(card);

  if (statsBefore.nestingDepth !== statsAfter.nestingDepth) {
    changes.push(
      `Reduced nesting depth from ${statsBefore.nestingDepth} to ${statsAfter.nestingDepth}`,
    );
  }

  if (statsBefore.elementCount !== statsAfter.elementCount) {
    changes.push(
      `Reduced element count from ${statsBefore.elementCount} to ${statsAfter.elementCount}`,
    );
  }

  if (changes.length === 0) {
    warnings.push("Card structure is already flat — no changes needed");
  }
}

function flattenElements(elements: unknown[], changes: string[]): unknown[] {
  const result: unknown[] = [];

  for (const el of elements) {
    if (!el || typeof el !== "object") {
      result.push(el);
      continue;
    }

    const element = el as Record<string, unknown>;

    // Flatten Container with single child and no significant properties
    if (
      element.type === "Container" &&
      Array.isArray(element.items) &&
      element.items.length === 1 &&
      !element.style &&
      !element.backgroundImage &&
      !element.selectAction &&
      !element.bleed &&
      !element.id &&
      !element.$when &&
      !element.$data &&
      !element.minHeight
    ) {
      const child = element.items[0] as Record<string, unknown>;
      // Preserve separator/spacing from the container onto the child
      if (element.separator && !child.separator) {
        child.separator = element.separator;
      }
      if (element.spacing && !child.spacing) {
        child.spacing = element.spacing;
      }
      changes.push(`Unwrapped single-child Container (child type: ${child.type || "unknown"})`);
      // Recursively flatten the child
      const flattened = flattenElements([child], changes);
      result.push(...flattened);
      continue;
    }

    // Flatten Container whose items are all simple elements (no nesting benefit)
    if (
      element.type === "Container" &&
      Array.isArray(element.items) &&
      element.items.length > 1 &&
      !element.style &&
      !element.backgroundImage &&
      !element.selectAction &&
      !element.bleed &&
      !element.id &&
      !element.$when &&
      !element.$data &&
      !element.minHeight &&
      allSimpleElements(element.items as unknown[])
    ) {
      const items = element.items as Record<string, unknown>[];
      // Transfer separator to first item
      if (element.separator && items.length > 0 && !items[0].separator) {
        items[0].separator = element.separator;
      }
      if (element.spacing && items.length > 0 && !items[0].spacing) {
        items[0].spacing = element.spacing;
      }
      changes.push(`Flattened Container with ${items.length} simple children`);
      result.push(...items);
      continue;
    }

    // Recurse into container items
    if (Array.isArray(element.items)) {
      element.items = flattenElements(element.items as unknown[], changes);
    }

    // Recurse into ColumnSet columns
    if (Array.isArray(element.columns)) {
      for (const col of element.columns as Record<string, unknown>[]) {
        if (col && Array.isArray(col.items)) {
          col.items = flattenElements(col.items as unknown[], changes);
        }
      }
    }

    result.push(element);
  }

  return result;
}

function allSimpleElements(elements: unknown[]): boolean {
  const simpleTypes = new Set(["TextBlock", "Image", "RichTextBlock"]);
  return elements.every((el) => {
    if (!el || typeof el !== "object") return false;
    const element = el as Record<string, unknown>;
    return simpleTypes.has(element.type as string);
  });
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function replaceActionsInTree(
  obj: unknown,
  fromType: string,
  toType: string,
  changes: string[],
  modifier?: (action: Record<string, unknown>) => void,
): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      replaceActionsInTree(item, fromType, toType, changes, modifier);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  if (record.type === fromType) {
    record.type = toType;
    changes.push(`Replaced ${fromType} with ${toType}`);
    if (modifier) modifier(record);
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      replaceActionsInTree(value, fromType, toType, changes, modifier);
    }
  }
}

function replaceTablesWithColumnSets(
  elements: unknown[],
  changes: string[],
  warnings: string[],
): unknown[] {
  return elements.map((el) => {
    if (!el || typeof el !== "object") return el;
    const element = el as Record<string, unknown>;

    if (element.type === "Table") {
      changes.push("Converted Table to ColumnSet-based layout");

      const tableColumns = (element.columns || []) as Record<string, unknown>[];
      const tableRows = (element.rows || []) as Record<string, unknown>[];

      const columnSets: Record<string, unknown>[] = [];

      for (const row of tableRows) {
        const cells = (row.cells || []) as Record<string, unknown>[];
        const columns = cells.map((cell, idx) => {
          const items = Array.isArray(cell.items) ? cell.items : [];
          const width =
            tableColumns[idx] && (tableColumns[idx].width !== undefined)
              ? tableColumns[idx].width
              : 1;
          return {
            type: "Column",
            width: typeof width === "number" ? `${width}` : width,
            items: items.length > 0 ? items : [{ type: "TextBlock", text: "", wrap: true }],
          };
        });

        columnSets.push({
          type: "ColumnSet",
          columns,
          separator: columnSets.length > 0,
        });
      }

      // Apply header styling to first row if firstRowAsHeader was set
      if (element.firstRowAsHeader && columnSets.length > 0) {
        const firstRow = columnSets[0];
        if (Array.isArray(firstRow.columns)) {
          for (const col of firstRow.columns as Record<string, unknown>[]) {
            if (Array.isArray(col.items)) {
              for (const item of col.items as Record<string, unknown>[]) {
                if (item.type === "TextBlock") {
                  item.weight = "bolder";
                }
              }
            }
          }
        }
      }

      if (columnSets.length === 0) {
        warnings.push("Table had no rows — replaced with empty placeholder");
        return {
          type: "TextBlock",
          text: "(Empty table)",
          isSubtle: true,
          wrap: true,
        };
      }

      // Return a Container wrapping the ColumnSets
      return {
        type: "Container",
        items: columnSets,
      };
    }

    // Recurse into containers
    if (Array.isArray(element.items)) {
      element.items = replaceTablesWithColumnSets(element.items as unknown[], changes, warnings);
    }
    if (Array.isArray(element.columns)) {
      for (const col of element.columns as Record<string, unknown>[]) {
        if (col && Array.isArray(col.items)) {
          col.items = replaceTablesWithColumnSets(col.items as unknown[], changes, warnings);
        }
      }
    }

    return element;
  });
}

function replaceCarousels(
  elements: unknown[],
  changes: string[],
  warnings: string[],
): unknown[] {
  return elements.map((el) => {
    if (!el || typeof el !== "object") return el;
    const element = el as Record<string, unknown>;

    if (element.type === "Carousel") {
      const pages = (element.pages || []) as Record<string, unknown>[];
      if (pages.length === 0) {
        warnings.push("Carousel had no pages — removed");
        return { type: "TextBlock", text: "(Empty carousel)", isSubtle: true, wrap: true };
      }

      // Take the first page as the visible content
      const firstPage = pages[0];
      const items = Array.isArray(firstPage.items) ? firstPage.items : [];
      changes.push(
        `Replaced Carousel (${pages.length} pages) with first page content`,
      );

      if (pages.length > 1) {
        warnings.push(
          `Carousel had ${pages.length} pages — only the first page is shown after downgrade. Consider alternative UX.`,
        );
      }

      return {
        type: "Container",
        items,
      };
    }

    // Recurse
    if (Array.isArray(element.items)) {
      element.items = replaceCarousels(element.items as unknown[], changes, warnings);
    }
    if (Array.isArray(element.columns)) {
      for (const col of element.columns as Record<string, unknown>[]) {
        if (col && Array.isArray(col.items)) {
          col.items = replaceCarousels(col.items as unknown[], changes, warnings);
        }
      }
    }

    return element;
  });
}

function removeUnsupportedElements(
  elements: unknown[],
  unsupported: Set<string>,
  changes: string[],
  warnings: string[],
): unknown[] {
  const result: unknown[] = [];

  for (const el of elements) {
    if (!el || typeof el !== "object") {
      result.push(el);
      continue;
    }

    const element = el as Record<string, unknown>;
    const type = element.type as string;

    if (unsupported.has(type)) {
      changes.push(`Removed unsupported element: ${type}`);
      warnings.push(`${type} is not supported on target host — element removed`);
      continue;
    }

    // Recurse into containers
    if (Array.isArray(element.items)) {
      element.items = removeUnsupportedElements(
        element.items as unknown[],
        unsupported,
        changes,
        warnings,
      );
    }
    if (Array.isArray(element.columns)) {
      for (const col of element.columns as Record<string, unknown>[]) {
        if (col && Array.isArray(col.items)) {
          col.items = removeUnsupportedElements(
            col.items as unknown[],
            unsupported,
            changes,
            warnings,
          );
        }
      }
    }

    result.push(element);
  }

  return result;
}

function replaceUnsupportedActions(
  card: Record<string, unknown>,
  unsupported: Set<string>,
  host: HostApp,
  changes: string[],
  warnings: string[],
): void {
  function walkActions(actions: unknown[]): unknown[] {
    return actions.filter((act) => {
      if (!act || typeof act !== "object") return true;
      const action = act as Record<string, unknown>;
      const type = action.type as string;

      if (unsupported.has(type)) {
        // Try to find a compatible replacement
        if (type === "Action.Execute" && !unsupported.has("Action.Submit")) {
          action.type = "Action.Submit";
          if (action.verb) {
            if (!action.data || typeof action.data !== "object") {
              action.data = {};
            }
            (action.data as Record<string, unknown>).verb = action.verb;
            delete action.verb;
          }
          changes.push(`Replaced Action.Execute with Action.Submit for ${host} compatibility`);
          return true;
        }

        if (type === "Action.Popover" || type === "Action.RunCommands" || type === "Action.OpenUrlDialog") {
          warnings.push(`${type} is not supported on ${host} — action removed`);
          changes.push(`Removed unsupported action: ${type}`);
          return false;
        }

        warnings.push(`${type} is not supported on ${host} — action removed`);
        changes.push(`Removed unsupported action: ${type}`);
        return false;
      }

      // Recurse into ShowCard
      if (action.card && typeof action.card === "object") {
        const subCard = action.card as Record<string, unknown>;
        if (Array.isArray(subCard.actions)) {
          subCard.actions = walkActions(subCard.actions);
        }
      }

      return true;
    });
  }

  if (Array.isArray(card.actions)) {
    card.actions = walkActions(card.actions);
  }

  // Walk body for ActionSets
  if (Array.isArray(card.body)) {
    walkBodyForActions(card.body as unknown[], walkActions);
  }
}

function walkBodyForActions(
  elements: unknown[],
  walkActions: (actions: unknown[]) => unknown[],
): void {
  for (const el of elements) {
    if (!el || typeof el !== "object") continue;
    const element = el as Record<string, unknown>;

    if (element.type === "ActionSet" && Array.isArray(element.actions)) {
      element.actions = walkActions(element.actions);
    }

    if (Array.isArray(element.items)) {
      walkBodyForActions(element.items as unknown[], walkActions);
    }
    if (Array.isArray(element.columns)) {
      for (const col of element.columns as Record<string, unknown>[]) {
        if (col && Array.isArray(col.items)) {
          walkBodyForActions(col.items as unknown[], walkActions);
        }
      }
    }
  }
}

function removePropertyFromTextBlocks(
  obj: unknown,
  property: string,
  changes: string[],
): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      removePropertyFromTextBlocks(item, property, changes);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  if (record.type === "TextBlock" && property in record) {
    const oldValue = record[property];
    delete record[property];
    changes.push(`Removed "${property}": "${oldValue}" from TextBlock (not supported in target version)`);
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      removePropertyFromTextBlocks(value, property, changes);
    }
  }
}

function detectTabularColumnSets(card: Record<string, unknown>): number {
  let count = 0;

  function walk(elements: unknown[]): void {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (!el || typeof el !== "object") continue;
      const element = el as Record<string, unknown>;

      // Detect ColumnSets that look tabular: 3+ columns with similar structure
      if (element.type === "ColumnSet" && Array.isArray(element.columns)) {
        const cols = element.columns as Record<string, unknown>[];
        if (cols.length >= 3) {
          const allHaveSingleTextBlock = cols.every((col) => {
            const items = col.items as unknown[];
            return (
              Array.isArray(items) &&
              items.length === 1 &&
              (items[0] as Record<string, unknown>)?.type === "TextBlock"
            );
          });
          if (allHaveSingleTextBlock) count++;
        }
      }

      if (Array.isArray(element.items)) walk(element.items as unknown[]);
      if (Array.isArray(element.columns)) {
        for (const col of element.columns as Record<string, unknown>[]) {
          if (col && Array.isArray(col.items)) walk(col.items as unknown[]);
        }
      }
    }
  }

  if (Array.isArray(card.body)) walk(card.body as unknown[]);
  return count;
}
