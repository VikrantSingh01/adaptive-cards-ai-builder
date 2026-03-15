/**
 * template_card tool handler
 */

import type { TemplateCardInput, TemplateCardOutput } from "../types/index.js";
import { assembleCard } from "../generation/card-assembler.js";

interface ExpressionEntry {
  path: string;
  expression: string;
  description: string;
}

/**
 * Convert a static Adaptive Card into an Adaptive Card Template with data binding expressions
 */
export function handleTemplateCard(input: TemplateCardInput): TemplateCardOutput {
  const { card, dataShape, description } = input;

  let sourceCard: Record<string, unknown>;

  if (card) {
    sourceCard = JSON.parse(JSON.stringify(card));
  } else if (description) {
    // Generate a card from the description, then templatize it
    sourceCard = assembleCard({
      content: description,
      version: "1.6",
    });
  } else {
    throw new Error("Either 'card' or 'description' must be provided");
  }

  const expressions: ExpressionEntry[] = [];
  const sampleData: Record<string, unknown> = {};
  const repeatedDataSamples: Record<string, unknown[]> = {};

  // Templatize the card
  const template = templatizeNode(sourceCard, "$", expressions, sampleData, repeatedDataSamples, dataShape);

  // Merge repeated data samples into sampleData
  for (const [key, samples] of Object.entries(repeatedDataSamples)) {
    sampleData[key] = samples;
  }

  // Build binding guide
  const bindingGuide = buildBindingGuide(expressions, sampleData);

  return {
    template: template as Record<string, unknown>,
    sampleData,
    expressions,
    bindingGuide,
  };
}

/**
 * Recursively walk the card tree and replace dynamic values with template expressions
 */
function templatizeNode(
  node: unknown,
  path: string,
  expressions: ExpressionEntry[],
  sampleData: Record<string, unknown>,
  repeatedDataSamples: Record<string, unknown[]>,
  dataShape?: Record<string, unknown>,
): unknown {
  if (node === null || node === undefined) return node;

  if (typeof node === "string") {
    return templatizeString(node, path, expressions, sampleData, dataShape);
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return node;
  }

  if (Array.isArray(node)) {
    return templatizeArray(node, path, expressions, sampleData, repeatedDataSamples, dataShape);
  }

  if (typeof node === "object") {
    return templatizeObject(
      node as Record<string, unknown>,
      path,
      expressions,
      sampleData,
      repeatedDataSamples,
      dataShape,
    );
  }

  return node;
}

function templatizeObject(
  obj: Record<string, unknown>,
  path: string,
  expressions: ExpressionEntry[],
  sampleData: Record<string, unknown>,
  repeatedDataSamples: Record<string, unknown[]>,
  dataShape?: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const type = obj.type as string | undefined;

  for (const [key, value] of Object.entries(obj)) {
    const childPath = `${path}.${key}`;

    // Skip schema/meta properties
    if (key === "type" || key === "$schema") {
      result[key] = value;
      continue;
    }

    // Skip version at card root
    if (key === "version" && path === "$") {
      result[key] = value;
      continue;
    }

    // Handle specific element properties that should be templatized
    if (type === "TextBlock" && key === "text" && typeof value === "string") {
      const propName = inferPropertyName(value, path, "text");
      if (!value.includes("${")) {
        result[key] = `\${${propName}}`;
        sampleData[propName] = value;
        expressions.push({
          path: childPath,
          expression: `\${${propName}}`,
          description: `Text content for TextBlock at ${path}`,
        });
      } else {
        result[key] = value;
      }
      continue;
    }

    if (type === "Image" && key === "url" && typeof value === "string") {
      const propName = inferPropertyName(value, path, "imageUrl");
      if (!value.includes("${")) {
        result[key] = `\${${propName}}`;
        sampleData[propName] = value;
        expressions.push({
          path: childPath,
          expression: `\${${propName}}`,
          description: `Image URL at ${path}`,
        });
      } else {
        result[key] = value;
      }
      continue;
    }

    if (type === "Image" && key === "altText" && typeof value === "string") {
      const propName = inferPropertyName(value, path, "imageAlt");
      if (!value.includes("${")) {
        result[key] = `\${${propName}}`;
        sampleData[propName] = value;
        expressions.push({
          path: childPath,
          expression: `\${${propName}}`,
          description: `Alt text for Image at ${path}`,
        });
      } else {
        result[key] = value;
      }
      continue;
    }

    if (key === "url" && type?.startsWith("Action.") && typeof value === "string") {
      const propName = inferPropertyName(value, path, "actionUrl");
      if (!value.includes("${")) {
        result[key] = `\${${propName}}`;
        sampleData[propName] = value;
        expressions.push({
          path: childPath,
          expression: `\${${propName}}`,
          description: `Action URL at ${path}`,
        });
      } else {
        result[key] = value;
      }
      continue;
    }

    // Handle FactSet facts specially — templatize individual fact values
    if (type === "FactSet" && key === "facts" && Array.isArray(value)) {
      result[key] = value.map((fact, idx) => {
        const f = fact as Record<string, unknown>;
        const factTitle = String(f.title || "");
        const factValue = String(f.value || "");
        const titleProp = camelCase(factTitle || `factTitle${idx}`);
        const valueProp = camelCase(factTitle ? `${factTitle}Value` : `factValue${idx}`);

        if (factValue && !factValue.includes("${")) {
          sampleData[valueProp] = factValue;
          expressions.push({
            path: `${childPath}[${idx}].value`,
            expression: `\${${valueProp}}`,
            description: `Value for fact "${factTitle}"`,
          });
        }

        return {
          title: factTitle,
          value: factValue.includes("${") ? factValue : `\${${valueProp}}`,
        };
      });
      continue;
    }

    // Recurse into nested structures
    result[key] = templatizeNode(value, childPath, expressions, sampleData, repeatedDataSamples, dataShape);
  }

  return result;
}

function templatizeArray(
  arr: unknown[],
  path: string,
  expressions: ExpressionEntry[],
  sampleData: Record<string, unknown>,
  repeatedDataSamples: Record<string, unknown[]>,
  dataShape?: Record<string, unknown>,
): unknown[] {
  // Detect repeated structures (e.g., Table rows, list items)
  if (arr.length >= 2 && areStructurallyHomogeneous(arr)) {
    const dataKey = inferRepeatedDataKey(path);

    // Build a template from the first item with $data binding
    const templateItem = templatizeRepeatedItem(
      arr[0] as Record<string, unknown>,
      `${path}[0]`,
      expressions,
      dataKey,
    );

    // Generate sample data from all items
    const samples = arr.map((item) =>
      extractSampleFromRepeatedItem(item as Record<string, unknown>),
    );
    repeatedDataSamples[dataKey] = samples;

    // Add $data binding to the template item
    if (typeof templateItem === "object" && templateItem !== null) {
      (templateItem as Record<string, unknown>)["$data"] = `\${${dataKey}}`;
      expressions.push({
        path: `${path}[0].$data`,
        expression: `\${${dataKey}}`,
        description: `Data binding for repeated items in ${path}. Each item in the ${dataKey} array will generate one instance.`,
      });
    }

    return [templateItem];
  }

  // Non-repeated arrays — recurse into each element
  return arr.map((item, i) =>
    templatizeNode(item, `${path}[${i}]`, expressions, sampleData, repeatedDataSamples, dataShape),
  );
}

function templatizeString(
  value: string,
  path: string,
  expressions: ExpressionEntry[],
  sampleData: Record<string, unknown>,
  dataShape?: Record<string, unknown>,
): string {
  // Already a template expression
  if (value.includes("${")) return value;

  // Don't templatize certain static values
  if (isStaticValue(value)) return value;

  // Check if this looks like a dynamic value
  if (looksLikeDynamicValue(value, path)) {
    const propName = inferPropertyName(value, path, "value");
    sampleData[propName] = value;
    expressions.push({
      path,
      expression: `\${${propName}}`,
      description: `Dynamic value at ${path}`,
    });
    return `\${${propName}}`;
  }

  return value;
}

// ─── Repeated Item Handling ──────────────────────────────────────────────────

function templatizeRepeatedItem(
  item: Record<string, unknown>,
  path: string,
  expressions: ExpressionEntry[],
  dataKey: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === "type") {
      result[key] = value;
      continue;
    }

    if (typeof value === "string" && !value.includes("${") && !isStaticValue(value)) {
      const propName = camelCase(key);
      result[key] = `\${${propName}}`;
      expressions.push({
        path: `${path}.${key}`,
        expression: `\${${propName}}`,
        description: `${key} field within each ${dataKey} item`,
      });
    } else if (Array.isArray(value)) {
      // Recurse into nested arrays (e.g., Table cells)
      result[key] = value.map((child, i) => {
        if (child && typeof child === "object") {
          return templatizeRepeatedItem(
            child as Record<string, unknown>,
            `${path}.${key}[${i}]`,
            expressions,
            dataKey,
          );
        }
        return child;
      });
    } else if (value && typeof value === "object") {
      result[key] = templatizeRepeatedItem(
        value as Record<string, unknown>,
        `${path}.${key}`,
        expressions,
        dataKey,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function extractSampleFromRepeatedItem(item: Record<string, unknown>): Record<string, unknown> {
  const sample: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === "type") continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sample[camelCase(key)] = value;
    } else if (Array.isArray(value)) {
      // Look for text values in nested cell structures
      for (const child of value) {
        if (child && typeof child === "object") {
          const nested = extractSampleFromRepeatedItem(child as Record<string, unknown>);
          Object.assign(sample, nested);
        }
      }
    } else if (value && typeof value === "object") {
      const nested = extractSampleFromRepeatedItem(value as Record<string, unknown>);
      Object.assign(sample, nested);
    }
  }

  return sample;
}

// ─── Detection Helpers ───────────────────────────────────────────────────────

function areStructurallyHomogeneous(arr: unknown[]): boolean {
  if (arr.length < 2) return false;

  // All items must be objects with the same type
  const types = arr.map((item) => {
    if (!item || typeof item !== "object") return null;
    return (item as Record<string, unknown>).type as string | undefined;
  });

  const firstType = types[0];
  if (!firstType) return false;

  return types.every((t) => t === firstType);
}

function isStaticValue(value: string): boolean {
  // Don't templatize adaptive card schema values
  const staticPatterns = [
    /^AdaptiveCard$/,
    /^Column$/,
    /^TableRow$/,
    /^TableCell$/,
    /^CarouselPage$/,
    /^Action\./,
    /^Input\./,
    /^\d+\.\d+$/,         // version strings
    /^(auto|stretch)$/,
    /^(none|small|default|medium|large|extraLarge|padding)$/, // spacing
    /^(left|center|right)$/,
    /^(top|bottom)$/,
    /^(lighter|bolder)$/,
    /^(dark|light|accent|good|warning|attention)$/,
    /^(default|positive|destructive)$/,
    /^(primary|secondary)$/,
    /^(compact|expanded|filtered)$/,
    /^(emphasis|good|attention|warning|accent)$/,
    /^(person|default)$/,       // image style
    /^(heading|columnHeader)$/, // text style
  ];

  return staticPatterns.some((p) => p.test(value));
}

function looksLikeDynamicValue(value: string, path: string): boolean {
  // URLs are dynamic
  if (/^https?:\/\//.test(value)) return true;

  // Dates
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;

  // Email-like
  if (/\S+@\S+\.\S+/.test(value)) return true;

  // Numbers as strings
  if (/^[\d,.]+%?$/.test(value) && value.length <= 20) return true;

  // Longer text (likely content, not a label)
  if (value.length > 30) return true;

  // Path contains known dynamic property names
  const dynamicPathParts = [".text", ".value", ".url", ".altText", ".title"];
  if (dynamicPathParts.some((p) => path.endsWith(p))) return true;

  return false;
}

// ─── Naming Helpers ──────────────────────────────────────────────────────────

function inferPropertyName(value: string, path: string, fallback: string): string {
  // Try to derive a meaningful name from the path
  const pathParts = path.split(".");
  const lastPart = pathParts[pathParts.length - 1];

  // Check for known property names
  if (lastPart === "text") {
    // Try to use parent context
    const parentIndex = pathParts[pathParts.length - 2];
    if (parentIndex && parentIndex.includes("[0]")) return "title";
    if (parentIndex && parentIndex.includes("[1]")) return "subtitle";

    // Derive from value content
    if (value.length <= 30) {
      return camelCase(value.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3).join(" "));
    }
    return fallback;
  }

  if (lastPart === "url") {
    if (path.includes("Image")) return "imageUrl";
    if (path.includes("Action")) return "actionUrl";
    return "url";
  }

  if (lastPart === "altText") return "imageAltText";

  // Use the path leaf as property name
  const cleaned = lastPart.replace(/\[\d+\]/g, "");
  return camelCase(cleaned) || fallback;
}

function inferRepeatedDataKey(path: string): string {
  // Derive array data key from path context
  if (path.includes("rows")) return "rows";
  if (path.includes("facts")) return "facts";
  if (path.includes("images")) return "images";
  if (path.includes("columns")) return "columns";
  if (path.includes("pages")) return "pages";
  if (path.includes("actions")) return "actions";
  if (path.includes("items")) return "items";
  return "items";
}

function camelCase(str: string): string {
  if (!str) return "value";
  return str
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("") || "value";
}

// ─── Binding Guide ───────────────────────────────────────────────────────────

function buildBindingGuide(
  expressions: ExpressionEntry[],
  sampleData: Record<string, unknown>,
): string {
  const lines: string[] = [
    "# Adaptive Card Template Binding Guide",
    "",
    "## How to Use This Template",
    "",
    "This template uses Adaptive Card Templating (https://adaptivecards.io/templating/).",
    "Bind data to this template using the Adaptive Cards Templating SDK:",
    "",
    "```javascript",
    'import * as ACData from "adaptivecards-templating";',
    "",
    "const template = new ACData.Template(templateJson);",
    "const card = template.expand({ $root: yourData });",
    "```",
    "",
    "## Data Bindings",
    "",
  ];

  for (const expr of expressions) {
    lines.push(`- **${expr.expression}** (${expr.path}): ${expr.description}`);
  }

  lines.push("");
  lines.push("## Sample Data");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(sampleData, null, 2));
  lines.push("```");

  // Check for repeated data bindings
  const repeatedBindings = expressions.filter((e) => e.expression.includes("$data"));
  if (repeatedBindings.length > 0) {
    lines.push("");
    lines.push("## Repeated Elements ($data)");
    lines.push("");
    lines.push(
      "Elements with `$data` binding will be repeated for each item in the bound array.",
    );
    lines.push(
      "Properties within repeated elements are resolved relative to the current data context.",
    );
  }

  return lines.join("\n");
}
