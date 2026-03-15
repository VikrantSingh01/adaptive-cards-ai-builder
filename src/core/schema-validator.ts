/**
 * Schema Validator — Validates Adaptive Card JSON against v1.6 schema using ajv
 */

import Ajv from "ajv";
import type { ValidationError } from "../types/index.js";

// v1.6 valid element types (from AdaptiveCards-Mobile SchemaValidator.swift)
const VALID_ELEMENT_TYPES = new Set([
  "TextBlock",
  "Image",
  "Media",
  "RichTextBlock",
  "Container",
  "ColumnSet",
  "ImageSet",
  "FactSet",
  "ActionSet",
  "Table",
  "Input.Text",
  "Input.Number",
  "Input.Date",
  "Input.Time",
  "Input.Toggle",
  "Input.ChoiceSet",
  "Input.Rating",
  "Input.DataGrid",
  "Carousel",
  "Accordion",
  "CodeBlock",
  "Rating",
  "ProgressBar",
  "ProgressRing",
  "Spinner",
  "TabSet",
  "List",
  "CompoundButton",
  "Badge",
  "Icon",
  // Charts
  "DonutChart",
  "BarChart",
  "LineChart",
  "PieChart",
]);

const VALID_ACTION_TYPES = new Set([
  "Action.Submit",
  "Action.OpenUrl",
  "Action.ShowCard",
  "Action.ToggleVisibility",
  "Action.Execute",
  // Teams extensions
  "Action.Popover",
  "Action.RunCommands",
  "Action.OpenUrlDialog",
]);

const VALID_SPACING = new Set([
  "none",
  "small",
  "default",
  "medium",
  "large",
  "extraLarge",
  "padding",
]);

const VALID_SIZE = new Set([
  "default",
  "small",
  "medium",
  "large",
  "extraLarge",
]);

const VALID_WEIGHT = new Set(["default", "lighter", "bolder"]);

const VALID_COLOR = new Set([
  "default",
  "dark",
  "light",
  "accent",
  "good",
  "warning",
  "attention",
]);

const VALID_HORIZONTAL_ALIGNMENT = new Set(["left", "center", "right"]);

const VERSION_PATTERN = /^\d+\.\d+$/;

export interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate an Adaptive Card JSON object against v1.6 schema
 */
export function validateCard(card: unknown): SchemaValidationResult {
  const errors: ValidationError[] = [];

  if (!card || typeof card !== "object") {
    errors.push({
      path: "$",
      message: "Card must be a JSON object",
      severity: "error",
      rule: "type-check",
    });
    return { valid: false, errors };
  }

  const obj = card as Record<string, unknown>;

  // Required: type must be "AdaptiveCard"
  if (obj.type !== "AdaptiveCard") {
    errors.push({
      path: "$.type",
      message: `type must be "AdaptiveCard", got "${obj.type}"`,
      severity: "error",
      rule: "required-type",
    });
  }

  // Required: version must match pattern
  if (!obj.version || typeof obj.version !== "string") {
    errors.push({
      path: "$.version",
      message: "version is required and must be a string (e.g., \"1.6\")",
      severity: "error",
      rule: "required-version",
    });
  } else if (!VERSION_PATTERN.test(obj.version)) {
    errors.push({
      path: "$.version",
      message: `version must match pattern "X.Y", got "${obj.version}"`,
      severity: "error",
      rule: "version-format",
    });
  }

  // Validate body elements
  if (obj.body !== undefined) {
    if (!Array.isArray(obj.body)) {
      errors.push({
        path: "$.body",
        message: "body must be an array",
        severity: "error",
        rule: "body-type",
      });
    } else {
      for (let i = 0; i < obj.body.length; i++) {
        validateElement(obj.body[i], `$.body[${i}]`, errors);
      }
    }
  }

  // Validate actions
  if (obj.actions !== undefined) {
    if (!Array.isArray(obj.actions)) {
      errors.push({
        path: "$.actions",
        message: "actions must be an array",
        severity: "error",
        rule: "actions-type",
      });
    } else {
      for (let i = 0; i < obj.actions.length; i++) {
        validateAction(obj.actions[i], `$.actions[${i}]`, errors);
      }
    }
  }

  // Validate selectAction
  if (obj.selectAction !== undefined) {
    validateAction(obj.selectAction, "$.selectAction", errors);
  }

  // Validate verticalContentAlignment
  if (
    obj.verticalContentAlignment !== undefined &&
    !["top", "center", "bottom"].includes(
      obj.verticalContentAlignment as string,
    )
  ) {
    errors.push({
      path: "$.verticalContentAlignment",
      message: `Invalid verticalContentAlignment: "${obj.verticalContentAlignment}"`,
      severity: "error",
      rule: "enum-value",
    });
  }

  const hasErrors = errors.some((e) => e.severity === "error");
  return { valid: !hasErrors, errors };
}

function validateElement(
  element: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!element || typeof element !== "object") {
    errors.push({
      path,
      message: "Element must be a JSON object",
      severity: "error",
      rule: "element-type",
    });
    return;
  }

  const el = element as Record<string, unknown>;

  // Required: type
  if (!el.type || typeof el.type !== "string") {
    errors.push({
      path: `${path}.type`,
      message: "Element type is required",
      severity: "error",
      rule: "required-element-type",
    });
    return;
  }

  if (!VALID_ELEMENT_TYPES.has(el.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Unknown element type: "${el.type}"`,
      severity: "warning",
      rule: "unknown-element-type",
    });
  }

  // Validate common properties
  if (el.spacing !== undefined && !VALID_SPACING.has(el.spacing as string)) {
    errors.push({
      path: `${path}.spacing`,
      message: `Invalid spacing: "${el.spacing}"`,
      severity: "error",
      rule: "enum-value",
    });
  }

  if (
    el.height !== undefined &&
    !["auto", "stretch"].includes(el.height as string)
  ) {
    errors.push({
      path: `${path}.height`,
      message: `Invalid height: "${el.height}". Must be "auto" or "stretch"`,
      severity: "error",
      rule: "enum-value",
    });
  }

  // Type-specific validation
  switch (el.type) {
    case "TextBlock":
      validateTextBlock(el, path, errors);
      break;
    case "Image":
      validateImage(el, path, errors);
      break;
    case "Container":
      validateContainer(el, path, errors);
      break;
    case "ColumnSet":
      validateColumnSet(el, path, errors);
      break;
    case "FactSet":
      validateFactSet(el, path, errors);
      break;
    case "ImageSet":
      validateImageSet(el, path, errors);
      break;
    case "ActionSet":
      validateActionSet(el, path, errors);
      break;
    case "Table":
      validateTable(el, path, errors);
      break;
  }

  // Validate nested items for containers
  if (el.items && Array.isArray(el.items)) {
    for (let i = 0; i < el.items.length; i++) {
      validateElement(el.items[i], `${path}.items[${i}]`, errors);
    }
  }

  // Validate selectAction
  if (el.selectAction !== undefined) {
    validateAction(el.selectAction, `${path}.selectAction`, errors);
  }
}

function validateTextBlock(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.text === undefined || el.text === null) {
    errors.push({
      path: `${path}.text`,
      message: "TextBlock requires a text property",
      severity: "error",
      rule: "required-property",
    });
  }
  if (el.size !== undefined && !VALID_SIZE.has(el.size as string)) {
    errors.push({
      path: `${path}.size`,
      message: `Invalid size: "${el.size}"`,
      severity: "error",
      rule: "enum-value",
    });
  }
  if (el.weight !== undefined && !VALID_WEIGHT.has(el.weight as string)) {
    errors.push({
      path: `${path}.weight`,
      message: `Invalid weight: "${el.weight}"`,
      severity: "error",
      rule: "enum-value",
    });
  }
  if (el.color !== undefined && !VALID_COLOR.has(el.color as string)) {
    errors.push({
      path: `${path}.color`,
      message: `Invalid color: "${el.color}"`,
      severity: "error",
      rule: "enum-value",
    });
  }
  if (
    el.horizontalAlignment !== undefined &&
    !VALID_HORIZONTAL_ALIGNMENT.has(el.horizontalAlignment as string)
  ) {
    errors.push({
      path: `${path}.horizontalAlignment`,
      message: `Invalid horizontalAlignment: "${el.horizontalAlignment}"`,
      severity: "error",
      rule: "enum-value",
    });
  }
}

function validateImage(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (!el.url || typeof el.url !== "string") {
    errors.push({
      path: `${path}.url`,
      message: "Image requires a url property",
      severity: "error",
      rule: "required-property",
    });
  }
}

function validateContainer(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.items !== undefined && !Array.isArray(el.items)) {
    errors.push({
      path: `${path}.items`,
      message: "Container items must be an array",
      severity: "error",
      rule: "items-type",
    });
  }
}

function validateColumnSet(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.columns !== undefined) {
    if (!Array.isArray(el.columns)) {
      errors.push({
        path: `${path}.columns`,
        message: "ColumnSet columns must be an array",
        severity: "error",
        rule: "columns-type",
      });
    } else {
      for (let i = 0; i < el.columns.length; i++) {
        const col = el.columns[i] as Record<string, unknown>;
        if (col && col.items && Array.isArray(col.items)) {
          for (let j = 0; j < col.items.length; j++) {
            validateElement(
              col.items[j],
              `${path}.columns[${i}].items[${j}]`,
              errors,
            );
          }
        }
      }
    }
  }
}

function validateFactSet(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.facts !== undefined) {
    if (!Array.isArray(el.facts)) {
      errors.push({
        path: `${path}.facts`,
        message: "FactSet facts must be an array",
        severity: "error",
        rule: "facts-type",
      });
    } else {
      for (let i = 0; i < el.facts.length; i++) {
        const fact = el.facts[i] as Record<string, unknown>;
        if (!fact.title) {
          errors.push({
            path: `${path}.facts[${i}].title`,
            message: "Fact requires a title",
            severity: "error",
            rule: "required-property",
          });
        }
        if (!fact.value) {
          errors.push({
            path: `${path}.facts[${i}].value`,
            message: "Fact requires a value",
            severity: "error",
            rule: "required-property",
          });
        }
      }
    }
  }
}

function validateImageSet(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.images !== undefined) {
    if (!Array.isArray(el.images)) {
      errors.push({
        path: `${path}.images`,
        message: "ImageSet images must be an array",
        severity: "error",
        rule: "images-type",
      });
    } else {
      for (let i = 0; i < el.images.length; i++) {
        validateElement(el.images[i], `${path}.images[${i}]`, errors);
      }
    }
  }
}

function validateActionSet(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.actions !== undefined) {
    if (!Array.isArray(el.actions)) {
      errors.push({
        path: `${path}.actions`,
        message: "ActionSet actions must be an array",
        severity: "error",
        rule: "actions-type",
      });
    } else {
      for (let i = 0; i < el.actions.length; i++) {
        validateAction(el.actions[i], `${path}.actions[${i}]`, errors);
      }
    }
  }
}

function validateTable(
  el: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (el.columns !== undefined && !Array.isArray(el.columns)) {
    errors.push({
      path: `${path}.columns`,
      message: "Table columns must be an array",
      severity: "error",
      rule: "columns-type",
    });
  }
  if (el.rows !== undefined && !Array.isArray(el.rows)) {
    errors.push({
      path: `${path}.rows`,
      message: "Table rows must be an array",
      severity: "error",
      rule: "rows-type",
    });
  }
}

function validateAction(
  action: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!action || typeof action !== "object") {
    errors.push({
      path,
      message: "Action must be a JSON object",
      severity: "error",
      rule: "action-type",
    });
    return;
  }

  const act = action as Record<string, unknown>;

  if (!act.type || typeof act.type !== "string") {
    errors.push({
      path: `${path}.type`,
      message: "Action type is required",
      severity: "error",
      rule: "required-action-type",
    });
    return;
  }

  if (!VALID_ACTION_TYPES.has(act.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Unknown action type: "${act.type}"`,
      severity: "warning",
      rule: "unknown-action-type",
    });
  }

  // Type-specific validation
  if (act.type === "Action.OpenUrl" && !act.url) {
    errors.push({
      path: `${path}.url`,
      message: "Action.OpenUrl requires a url property",
      severity: "error",
      rule: "required-property",
    });
  }

  if (act.type === "Action.ShowCard" && act.card) {
    // Recursively validate the sub-card
    const subResult = validateCard(act.card);
    for (const err of subResult.errors) {
      errors.push({
        ...err,
        path: `${path}.card.${err.path.replace("$.", "")}`,
      });
    }
  }

  if (
    act.style !== undefined &&
    !["default", "positive", "destructive"].includes(act.style as string)
  ) {
    errors.push({
      path: `${path}.style`,
      message: `Invalid action style: "${act.style}"`,
      severity: "error",
      rule: "enum-value",
    });
  }

  if (
    act.mode !== undefined &&
    !["primary", "secondary"].includes(act.mode as string)
  ) {
    errors.push({
      path: `${path}.mode`,
      message: `Invalid action mode: "${act.mode}"`,
      severity: "error",
      rule: "enum-value",
    });
  }
}

/**
 * Get the set of valid element types
 */
export function getValidElementTypes(): Set<string> {
  return new Set(VALID_ELEMENT_TYPES);
}

/**
 * Get the set of valid action types
 */
export function getValidActionTypes(): Set<string> {
  return new Set(VALID_ACTION_TYPES);
}
