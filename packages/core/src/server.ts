/**
 * Adaptive Cards AI Builder — MCP Server
 *
 * A Model Context Protocol server that converts any content into
 * schema-validated Adaptive Card v1.6 JSON.
 *
 * Usage:
 *   npx adaptive-cards-mcp          # Start MCP server (stdio)
 *   TRANSPORT=sse npx adaptive-cards-mcp  # Start HTTP/SSE server
 *   DEBUG=adaptive-cards-mcp npx adaptive-cards-mcp  # With debug logging
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getAllHostSupport, getHostSupport } from "./core/host-compatibility.js";
import { getAllPatterns } from "./generation/layout-patterns.js";
import { handleGenerateCard } from "./tools/generate-card.js";
import { handleValidateCard } from "./tools/validate-card.js";
import { handleDataToCard } from "./tools/data-to-card.js";
import { handleOptimizeCard } from "./tools/optimize-card.js";
import { handleTemplateCard } from "./tools/template-card.js";
import { handleTransformCard } from "./tools/transform-card.js";
import { handleSuggestLayout } from "./tools/suggest-layout.js";
import { initLLMFromEnv } from "./generation/llm-client.js";
import { createLogger, nextRequestId, initLogger } from "./utils/logger.js";
import { checkInputSize, checkCardComplexity, checkDataSize } from "./utils/input-guards.js";
import { checkRateLimit, setRateLimitEnabled } from "./utils/rate-limiter.js";
import { storeCard, resolveCardRef, listCards, clearCards, getCard } from "./utils/card-store.js";
import { generatePreviewHtml, writePreviewFile } from "./utils/preview.js";

import type {
  HostApp,
  GenerateCardOutput,
  CardWorkflowInput,
  GenerateAndValidateInput,
} from "./types/index.js";

// Initialize all subsystems explicitly (not on module load, to ensure env is ready)
initLogger();
const logger = createLogger("server");
initLLMFromEnv();

// Telemetry (opt-in via MCP_TELEMETRY=true)
import { initTelemetry, recordToolCall } from "./utils/telemetry.js";
initTelemetry();

// Enable rate limiting if env var set
if (process.env.MCP_RATE_LIMIT === "true") {
  setRateLimitEnabled(true);
  logger.info("Rate limiting enabled");
}

// Create MCP server
const server = new Server(
  {
    name: "adaptive-cards-mcp",
    version: "2.2.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// ─── Host enum (shared across tools) ────────────────────────────────────────

const HOST_ENUM = [
  "teams", "outlook", "webchat", "windows", "viva-connections", "webex", "generic",
];

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "generate_card",
    description:
      "Convert any content — natural language description, structured data, or a combination — into a valid Adaptive Card v1.6 JSON. Returns cardId for reference in subsequent tool calls.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description:
            "Natural language description of the card to generate, or paste raw data/text.",
        },
        data: {
          description:
            "Optional structured data (JSON object or CSV string) to incorporate into the card",
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description: "Target host app. Default: generic",
        },
        theme: {
          type: "string",
          enum: ["light", "dark"],
          description: "Theme for styling hints",
        },
        intent: {
          type: "string",
          enum: [
            "display", "approval", "form", "notification", "dashboard",
            "report", "status", "profile", "list", "gallery",
          ],
          description: "The intent of the card — helps select the best layout pattern",
        },
        version: {
          type: "string",
          description: 'Target Adaptive Card schema version. Default: "1.6"',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "validate_card",
    description:
      "Validate an Adaptive Card JSON against the v1.6 schema. Returns diagnostics with suggested fixes for each error. Accepts card JSON or a cardId from a previous tool call.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          description: "The Adaptive Card JSON object to validate, or a cardId string",
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description: "Check compatibility with this host app. Default: generic",
        },
        strictMode: {
          type: "boolean",
          description: "When true, warnings are treated as errors. Default: false",
        },
      },
      required: ["card"],
    },
  },
  {
    name: "data_to_card",
    description:
      "Convert structured data (JSON array, CSV, key-value object) into the optimal Adaptive Card presentation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        data: {
          description: "The data to convert — JSON object, JSON array of objects, or CSV string",
        },
        presentation: {
          type: "string",
          enum: [
            "auto", "table", "facts", "chart-bar", "chart-line",
            "chart-pie", "chart-donut", "list", "carousel",
          ],
          description: 'Presentation type. "auto" (default) auto-selects',
        },
        title: { type: "string", description: "Title for the card header" },
        host: { type: "string", enum: HOST_ENUM, description: "Target host app. Default: generic" },
        templateMode: {
          type: "boolean",
          description: "Generate a templated card with ${expression} data binding. Default: false",
        },
      },
      required: ["data"],
    },
  },
  {
    name: "optimize_card",
    description:
      "Optimize an existing Adaptive Card. Accepts card JSON or a cardId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          description: "The Adaptive Card JSON object or cardId to optimize",
        },
        goals: {
          type: "array",
          items: {
            type: "string",
            enum: ["accessibility", "performance", "compact", "modern", "readability"],
          },
          description: "Optimization goals. Default: all",
        },
        host: { type: "string", enum: HOST_ENUM, description: "Target host app" },
      },
      required: ["card"],
    },
  },
  {
    name: "template_card",
    description:
      "Convert a static Adaptive Card into an Adaptive Card Template with ${expression} data binding.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          description: "A static Adaptive Card or cardId to convert into a template",
        },
        dataShape: {
          type: "object",
          description: "Optional data shape hint",
        },
        description: {
          type: "string",
          description: "If no card is provided, describe the card to generate as a template",
        },
      },
    },
  },
  {
    name: "transform_card",
    description:
      "Transform an Adaptive Card: upgrade/downgrade version, apply host-specific constraints, or flatten nesting.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          description: "The Adaptive Card JSON object or cardId to transform",
        },
        transform: {
          type: "string",
          enum: ["upgrade-version", "downgrade-version", "apply-host-config", "flatten"],
          description: "The type of transformation to apply",
        },
        targetVersion: {
          type: "string",
          description: 'Target version for upgrade/downgrade (e.g., "1.3", "1.5", "1.6")',
        },
        targetHost: { type: "string", enum: HOST_ENUM, description: "Target host" },
      },
      required: ["card", "transform"],
    },
  },
  {
    name: "suggest_layout",
    description:
      "Recommend the best Adaptive Card layout pattern for a given description.",
    inputSchema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "Describe the card you want to build",
        },
        constraints: {
          type: "object",
          properties: {
            interactive: { type: "boolean", description: "Whether the card needs user input/actions" },
            targetHost: { type: "string", enum: HOST_ENUM, description: "Target host app" },
          },
        },
      },
      required: ["description"],
    },
  },
  // ─── Compound Workflow Tools ──────────────────────────────────────────────
  {
    name: "generate_and_validate",
    description:
      "Generate an Adaptive Card and immediately validate + optionally optimize it in a single call. Reduces tool-call overhead for common workflows.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "Natural language description of the card to generate",
        },
        data: {
          description: "Optional structured data to incorporate",
        },
        host: { type: "string", enum: HOST_ENUM, description: "Target host app" },
        intent: {
          type: "string",
          enum: [
            "display", "approval", "form", "notification", "dashboard",
            "report", "status", "profile", "list", "gallery",
          ],
          description: "Card intent",
        },
        version: { type: "string", description: "Target version. Default: 1.6" },
        optimizeGoals: {
          type: "array",
          items: {
            type: "string",
            enum: ["accessibility", "performance", "compact", "modern", "readability"],
          },
          description: "If provided, also optimize the card after generation",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "card_workflow",
    description:
      "Execute a multi-step card pipeline in a single call. Steps: generate, validate, optimize, template, transform.",
    inputSchema: {
      type: "object" as const,
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool: {
                type: "string",
                enum: ["generate", "validate", "optimize", "template", "transform"],
              },
              params: { type: "object", description: "Additional params for this step" },
            },
            required: ["tool"],
          },
          description: "Pipeline steps to execute in order",
        },
        content: { type: "string", description: "Content for generate step" },
        data: { description: "Data for generate/data_to_card step" },
        host: { type: "string", enum: HOST_ENUM },
        version: { type: "string" },
      },
      required: ["steps"],
    },
  },
];

// ─── Request Handlers ────────────────────────────────────────────────────────

// Handle tools/list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tools/call with per-tool error handling and input guards
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const reqId = nextRequestId();
  const startTime = Date.now();

  logger.info("Tool call", { reqId, tool: name });

  try {
    // Rate limit check
    checkRateLimit(name);

    // MCP clients may send JSON fields as strings — parse them
    const parsed = { ...args } as Record<string, unknown>;
    for (const key of ["card", "data", "dataShape", "constraints"]) {
      if (typeof parsed[key] === "string") {
        try {
          parsed[key] = JSON.parse(parsed[key] as string);
        } catch {
          // Leave as string (e.g., CSV data)
        }
      }
    }
    if (typeof parsed.goals === "string") {
      try { parsed.goals = JSON.parse(parsed.goals as string); } catch { /* leave */ }
    }
    if (typeof parsed.optimizeGoals === "string") {
      try { parsed.optimizeGoals = JSON.parse(parsed.optimizeGoals as string); } catch { /* leave */ }
    }
    if (typeof parsed.steps === "string") {
      try { parsed.steps = JSON.parse(parsed.steps as string); } catch { /* leave */ }
    }

    // Input size check
    checkInputSize(parsed, name);

    // Resolve card references (cardId -> card JSON)
    if (parsed.card !== undefined) {
      parsed.card = resolveCardRef(parsed.card);
      checkCardComplexity(parsed.card as Record<string, unknown>);
    }
    if (parsed.data !== undefined && typeof parsed.data !== "string") {
      checkDataSize(parsed.data);
    }

    let result: unknown;

    switch (name) {
      case "generate_card": {
        const genResult = await handleGenerateCard(parsed as any);
        const cardId = storeCard(genResult.card, { tool: "generate_card", designNotes: genResult.designNotes });
        result = { ...genResult, cardId };
        break;
      }
      case "validate_card": {
        result = handleValidateCard(parsed as any);
        break;
      }
      case "data_to_card": {
        const d2cResult = await handleDataToCard(parsed as any);
        const cardId = storeCard(d2cResult.card, { tool: "data_to_card" });
        result = { ...d2cResult, cardId };
        break;
      }
      case "optimize_card": {
        const optResult = handleOptimizeCard(parsed as any);
        const cardId = storeCard(optResult.card, { tool: "optimize_card" });
        result = { ...optResult, cardId };
        break;
      }
      case "template_card": {
        result = handleTemplateCard(parsed as any);
        break;
      }
      case "transform_card": {
        const txResult = handleTransformCard(parsed as any);
        const cardId = storeCard(txResult.card, { tool: "transform_card" });
        result = { ...txResult, cardId };
        break;
      }
      case "suggest_layout": {
        result = handleSuggestLayout(parsed as any);
        break;
      }
      case "generate_and_validate": {
        result = await handleGenerateAndValidate(parsed as unknown as GenerateAndValidateInput);
        break;
      }
      case "card_workflow": {
        result = await handleCardWorkflow(parsed as unknown as CardWorkflowInput);
        break;
      }
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    // Add designer preview for tools that produce cards
    if (result && typeof result === "object" && "card" in (result as Record<string, unknown>)) {
      const r = result as Record<string, unknown>;
      const cardId = r.cardId as string | undefined;
      const transport = process.env.TRANSPORT || "stdio";

      if (transport === "sse" || transport === "http") {
        // SSE mode: link to /preview/{cardId} endpoint served by this server
        const port = process.env.PORT || "3001";
        r.preview = cardId
          ? `http://localhost:${port}/preview/${cardId}`
          : "https://adaptivecards.microsoft.com/designer";
      } else {
        // stdio mode: write a temp HTML file that auto-loads the designer with the card
        try {
          const card = r.card as Record<string, unknown>;
          r.preview = writePreviewFile(card); // Returns a file:// URL (cross-platform)
        } catch (err) {
          logger.warn("Failed to write preview file", { error: String(err) });
          r.preview = "https://adaptivecards.microsoft.com/designer";
        }
      }
    }

    const elapsed = Date.now() - startTime;
    const resultStr = JSON.stringify(result, null, 2);
    logger.info("Tool complete", { reqId, tool: name, elapsed, outputBytes: resultStr.length });
    recordToolCall(name, elapsed);

    return {
      content: [{ type: "text" as const, text: resultStr }],
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Structured error log with stack trace for debugging
    logger.error("Tool error", {
      reqId,
      tool: name,
      error: message,
      stack: stack?.split("\n").slice(0, 5).join("\n"), // First 5 frames
      elapsed,
    });
    recordToolCall(name, elapsed, true);

    // Sanitize error messages to avoid leaking API keys or credentials
    const safeMessage = message
      .replace(/(?:sk-|key-|Bearer\s+|api[_-]?key[=:]\s*|password[=:]\s*)\S+/gi, "[REDACTED]")
      .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, "[REDACTED]"); // Base64-encoded secrets

    return {
      content: [{ type: "text" as const, text: `Error in ${name}: ${safeMessage}` }],
      isError: true,
    };
  }
});

// ─── Compound Tool Handlers ──────────────────────────────────────────────────

async function handleGenerateAndValidate(
  input: GenerateAndValidateInput,
): Promise<Record<string, unknown>> {
  const { content, data, host = "generic", intent, version = "1.6", optimizeGoals } = input;

  // Step 1: Generate
  const genResult = await handleGenerateCard({
    content,
    data,
    host: host as HostApp,
    intent: intent as any,
    version,
  });

  let card = genResult.card;
  let validation = genResult.validation;
  let designNotes = genResult.designNotes;
  const stepsCompleted = ["generate", "validate"];

  // Step 2: Optimize if requested
  if (optimizeGoals && optimizeGoals.length > 0) {
    const optResult = handleOptimizeCard({
      card,
      goals: optimizeGoals,
      host: host as HostApp,
    });
    card = optResult.card;
    designNotes += ` | Optimized for: ${optimizeGoals.join(", ")}`;
    stepsCompleted.push("optimize");

    // Re-validate after optimization
    validation = handleValidateCard({ card, host: host as HostApp });
  }

  const cardId = storeCard(card, { tool: "generate_and_validate" });

  return {
    card,
    cardId,
    validation,
    stepsCompleted,
    designNotes,
  };
}

async function handleCardWorkflow(
  input: CardWorkflowInput,
): Promise<Record<string, unknown>> {
  const { steps, content, data, host = "generic", version = "1.6" } = input;

  // Validate step order: steps that need a card must come after generate
  const cardProducers = new Set(["generate"]);
  const cardConsumers = new Set(["validate", "optimize", "template", "transform"]);
  let hasCardProducer = false;
  for (const step of steps) {
    if (cardConsumers.has(step.tool) && !hasCardProducer) {
      throw new Error(
        `Step "${step.tool}" requires a card, but no "generate" step precedes it. ` +
        `Reorder steps so "generate" comes first.`,
      );
    }
    if (cardProducers.has(step.tool)) hasCardProducer = true;
  }

  let card: Record<string, unknown> | undefined;
  let validation;
  const stepsCompleted: string[] = [];
  let designNotes = "";

  for (const step of steps) {
    const params = step.params || {};

    switch (step.tool) {
      case "generate": {
        const genResult = await handleGenerateCard({
          content: (params.content as string) || content || "Create a card",
          data: (params.data || data) as Record<string, unknown> | string | undefined,
          host: (params.host as HostApp) || host as HostApp,
          intent: params.intent as any,
          version: (params.version as string) || version,
        });
        card = genResult.card;
        validation = genResult.validation;
        designNotes = genResult.designNotes;
        stepsCompleted.push("generate");
        break;
      }
      case "validate": {
        if (!card) throw new Error("No card to validate. Run 'generate' step first.");
        validation = handleValidateCard({
          card,
          host: (params.host as HostApp) || host as HostApp,
          strictMode: params.strictMode as boolean,
        });
        stepsCompleted.push("validate");
        break;
      }
      case "optimize": {
        if (!card) throw new Error("No card to optimize. Run 'generate' step first.");
        const optResult = handleOptimizeCard({
          card,
          goals: params.goals as any,
          host: (params.host as HostApp) || host as HostApp,
        });
        card = optResult.card;
        stepsCompleted.push("optimize");
        break;
      }
      case "template": {
        if (!card) throw new Error("No card to templatize. Run 'generate' step first.");
        const tplResult = handleTemplateCard({
          card,
          dataShape: params.dataShape as any,
        });
        card = tplResult.template;
        stepsCompleted.push("template");
        break;
      }
      case "transform": {
        if (!card) throw new Error("No card to transform. Run 'generate' step first.");
        const txResult = handleTransformCard({
          card,
          transform: (params.transform as any) || "apply-host-config",
          targetVersion: params.targetVersion as string,
          targetHost: (params.targetHost as HostApp) || host as HostApp,
        });
        card = txResult.card;
        stepsCompleted.push("transform");
        break;
      }
    }
  }

  if (!card) throw new Error("Workflow produced no card. Include a 'generate' step.");

  const cardId = storeCard(card, { tool: "card_workflow" });

  return {
    card,
    cardId,
    validation,
    stepsCompleted,
    designNotes,
  };
}

// ─── Resource Definitions ────────────────────────────────────────────────────

const RESOURCES = [
  {
    uri: "ac://schema/v1.6",
    name: "Adaptive Cards v1.6 Schema",
    description: "Complete JSON Schema for Adaptive Cards v1.6",
    mimeType: "application/json",
  },
  {
    uri: "ac://hosts",
    name: "Host Compatibility Matrix",
    description: "Supported versions, elements, actions, and constraints for all hosts",
    mimeType: "application/json",
  },
  {
    uri: "ac://examples",
    name: "Example Cards Catalog",
    description: "36 curated example Adaptive Cards",
    mimeType: "application/json",
  },
  {
    uri: "ac://patterns",
    name: "Layout Pattern Guide",
    description: "11 canonical layout patterns with templates",
    mimeType: "application/json",
  },
  {
    uri: "ac://cards",
    name: "Session Card Store",
    description: "List of cards stored in the current session (by cardId)",
    mimeType: "application/json",
  },
];

// ─── Resource Template Definitions ───────────────────────────────────────────

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "ac://hosts/{hostName}",
    name: "Host-specific Compatibility",
    description: "Get compatibility info for a specific host (teams, outlook, webchat, windows, viva-connections, webex, generic)",
    mimeType: "application/json",
  },
  {
    uriTemplate: "ac://examples/{intent}",
    name: "Examples by Intent",
    description: "Filter examples by intent (display, approval, form, notification, dashboard, etc.)",
    mimeType: "application/json",
  },
];

// ─── Resource Handlers ──────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return { resourceTemplates: RESOURCE_TEMPLATES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Handle parameterized host resource
  const hostMatch = uri.match(/^ac:\/\/hosts\/(.+)$/);
  if (hostMatch) {
    const hostName = hostMatch[1] as HostApp;
    const allHosts = getAllHostSupport();
    if (hostName in allHosts) {
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(allHosts[hostName], null, 2) }],
      };
    }
    throw new Error(`Unknown host: ${hostName}. Valid hosts: ${Object.keys(allHosts).join(", ")}`);
  }

  // Handle parameterized examples resource
  const examplesMatch = uri.match(/^ac:\/\/examples\/(.+)$/);
  if (examplesMatch) {
    const intent = examplesMatch[1];
    const catalog = loadExamplesCatalog();
    const filtered = catalog.filter(
      (ex) => ex.name.includes(intent) || ex.elementTypes.some((t) => t.toLowerCase().includes(intent)),
    );
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(filtered, null, 2) }],
    };
  }

  switch (uri) {
    case "ac://schema/v1.6": {
      const schemaPath = join(
        dirname(fileURLToPath(import.meta.url)),
        "data",
        "schema.json",
      );
      const schema = readFileSync(schemaPath, "utf-8");
      return {
        contents: [{ uri, mimeType: "application/json", text: schema }],
      };
    }

    case "ac://hosts": {
      const hosts = getAllHostSupport();
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(hosts, null, 2) },
        ],
      };
    }

    case "ac://examples": {
      const catalog = loadExamplesCatalog();
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(catalog, null, 2) },
        ],
      };
    }

    case "ac://patterns": {
      const patterns = getAllPatterns().map((p) => ({
        name: p.name,
        description: p.description,
        intent: p.intent,
        elements: p.elements,
        dataShape: p.dataShape,
      }));
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(patterns, null, 2) },
        ],
      };
    }

    case "ac://cards": {
      const cards = listCards();
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(cards, null, 2) },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
});

// ─── Prompt Definitions ──────────────────────────────────────────────────────

const PROMPTS = [
  {
    name: "create-adaptive-card",
    description: "Guided workflow to create an Adaptive Card from a description",
    arguments: [
      { name: "description", description: "What the card should show", required: true },
      { name: "host", description: "Target host (teams, outlook, webchat, etc.)", required: false },
      { name: "intent", description: "Card intent (display, approval, form, notification, dashboard)", required: false },
    ],
  },
  {
    name: "review-adaptive-card",
    description: "Review an Adaptive Card for accessibility, compatibility, and best practices",
    arguments: [
      { name: "card", description: "The card JSON to review", required: true },
      { name: "host", description: "Target host for compatibility check", required: false },
    ],
  },
  {
    name: "convert-data-to-card",
    description: "Convert structured data into the best Adaptive Card presentation",
    arguments: [
      { name: "data", description: "JSON data or CSV string to visualize", required: true },
      { name: "title", description: "Card title", required: false },
      { name: "presentation", description: "Preferred presentation (table, chart, facts, list)", required: false },
    ],
  },
];

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "create-adaptive-card": {
      const desc = args?.description || "a card";
      const host = args?.host || "generic";
      const intent = args?.intent || "";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Create an Adaptive Card: ${desc}`,
                host !== "generic" ? `Target host: ${host}` : "",
                intent ? `Intent: ${intent}` : "",
                "",
                "Steps:",
                "1. Use the generate_and_validate tool to create and validate the card",
                "2. If there are validation errors, use optimize_card to fix them",
                "3. If targeting a specific host, use transform_card with apply-host-config",
                "4. Present the final card JSON to the user",
              ].filter(Boolean).join("\n"),
            },
          },
        ],
      };
    }

    case "review-adaptive-card": {
      const card = args?.card || "{}";
      const host = args?.host || "generic";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Review this Adaptive Card for quality:",
                "```json",
                typeof card === "string" ? card : JSON.stringify(card, null, 2),
                "```",
                "",
                `Target host: ${host}`,
                "",
                "Steps:",
                "1. Use validate_card to check schema, accessibility, and host compatibility",
                "2. Use optimize_card with goals: [accessibility, modern] to improve it",
                "3. Summarize: validation score, accessibility score, issues found, improvements made",
              ].join("\n"),
            },
          },
        ],
      };
    }

    case "convert-data-to-card": {
      const data = args?.data || "[]";
      const title = args?.title || "";
      const presentation = args?.presentation || "auto";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Convert this data into an Adaptive Card:",
                "```json",
                typeof data === "string" ? data : JSON.stringify(data, null, 2),
                "```",
                title ? `Title: ${title}` : "",
                presentation !== "auto" ? `Preferred presentation: ${presentation}` : "",
                "",
                "Steps:",
                "1. Use data_to_card to create the optimal visualization",
                "2. Use validate_card to verify the result",
                "3. Present the card JSON with explanation of the chosen presentation",
              ].filter(Boolean).join("\n"),
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ─── Example Catalog Loader (lazy) ──────────────────────────────────────────

let cachedCatalog: Array<{ name: string; description: string; elementTypes: string[] }> | null = null;

function loadExamplesCatalog(): Array<{ name: string; description: string; elementTypes: string[] }> {
  if (cachedCatalog) return cachedCatalog;

  const __dir = dirname(fileURLToPath(import.meta.url));
  let examplesDir = join(__dir, "data", "examples");
  try {
    readdirSync(examplesDir);
  } catch {
    examplesDir = join(__dir, "..", "src", "data", "examples");
  }

  const catalog: Array<{ name: string; description: string; elementTypes: string[] }> = [];

  try {
    const files = readdirSync(examplesDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(examplesDir, file), "utf-8"));
        let description = "";
        const body = content.body ?? [];
        for (const el of body) {
          if (el.type === "TextBlock" && typeof el.text === "string") {
            description = el.text;
            break;
          }
        }
        const types = new Set<string>();
        function collectTypes(obj: unknown): void {
          if (Array.isArray(obj)) {
            for (const item of obj) collectTypes(item);
          } else if (obj && typeof obj === "object") {
            const rec = obj as Record<string, unknown>;
            if (typeof rec.type === "string") types.add(rec.type);
            for (const val of Object.values(rec)) collectTypes(val);
          }
        }
        collectTypes(body);

        catalog.push({
          name: file.replace(".json", ""),
          description: description || file.replace(".json", "").replace(/[-_]/g, " "),
          elementTypes: [...types],
        });
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // No examples directory
  }

  cachedCatalog = catalog;
  return catalog;
}

// ─── Start Server ────────────────────────────────────────────────────────────

// Design: stdio transport has NO auth — it's assumed to be a local process
// launched by a trusted client (Claude Code, Cursor, etc.). Auth is only
// applied to the HTTP/SSE transport which is network-exposed.
async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Server started", { transport: "stdio", tools: TOOLS.length });
  console.error(`Adaptive Cards AI Builder MCP Server started (${TOOLS.length} tools, stdio)`);
}

async function startSSE() {
  // Dynamic import to avoid pulling in http deps for stdio users
  const { createServer } = await import("node:http");
  const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
  const { validateAuth } = await import("./utils/auth.js");

  const port = parseInt(process.env.PORT || "3001", 10);
  let sseTransport: InstanceType<typeof SSEServerTransport> | null = null;

  const httpServer = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check for non-health and non-preview endpoints
    const isPublicRoute = req.url === "/health" || req.url?.startsWith("/preview/");
    if (!isPublicRoute) {
      const authResult = await validateAuth(req.headers.authorization);
      if (!authResult.authorized) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        name: "adaptive-cards-mcp",
        version: "2.2.0",
        tools: TOOLS.length,
        transport: "sse",
      }));
      return;
    }

    // Preview route: serves an HTML page that opens the AC Designer with the card
    const previewMatch = req.url?.match(/^\/preview\/(card-[a-f0-9-]+)$/);
    if (previewMatch) {
      const cardId = previewMatch[1];
      const card = getCard(cardId);
      if (!card) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Card "${cardId}" not found or expired.` }));
        return;
      }
      const html = generatePreviewHtml(card);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline'; frame-src https://adaptivecards.microsoft.com",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      });
      res.end(html);
      return;
    }

    if (req.url === "/sse") {
      logger.info("SSE client connected");
      const transport = new SSEServerTransport("/messages", res);
      try {
        await server.connect(transport);
        sseTransport = transport; // Only assign after successful connect

        // Clean up on client disconnect to prevent resource leaks
        res.on("close", () => {
          logger.info("SSE client disconnected");
          if (sseTransport === transport) {
            sseTransport = null;
          }
        });
      } catch (err) {
        logger.error("SSE connect failed", { error: String(err) });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to establish SSE connection" }));
      }
      return;
    }

    if (req.url === "/messages" && req.method === "POST") {
      if (!sseTransport) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No SSE connection. Connect to /sse first." }));
        return;
      }
      await sseTransport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use /sse for SSE or /health for status." }));
  });

  httpServer.listen(port, () => {
    logger.info("Server started", { transport: "sse", port, tools: TOOLS.length });
    console.error(`Adaptive Cards AI Builder MCP Server started (${TOOLS.length} tools, SSE on port ${port})`);
  });

  return httpServer;
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function setupShutdownHandlers() {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return; // Prevent double-shutdown
    shuttingDown = true;
    logger.info("Shutting down", { signal });
    try {
      await server.close(); // Close server first to stop accepting requests
    } catch {
      // Already closed
    }
    clearCards(); // Then clean up card store
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

async function main() {
  setupShutdownHandlers();

  const transport = process.env.TRANSPORT || "stdio";

  if (transport === "sse" || transport === "http") {
    await startSSE();
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
