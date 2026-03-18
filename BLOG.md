# I Built an MCP Server That Makes AI 10x Better at Adaptive Cards

*How 9 specialized tools turned LLM hallucination into production-ready card generation*

---

I'm a Principal Engineering Manager on Microsoft Teams. Every week I watch developers — and AI assistants — struggle with the same problem: generating valid Adaptive Card JSON. The format powers cards in Teams, Outlook, Copilot, and dozens of other Microsoft surfaces. It has a 3,297-line schema, six different host environments with different constraints, and a spec that moves faster than any LLM's training data can keep up with.

So I built the fix: **[adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp)** — an open-source MCP server that gives any AI assistant deep, structured knowledge about Adaptive Cards. 9 tools, 924 tests, zero competitors.

## The problem: LLMs are confidently wrong about Adaptive Cards

I tested Claude, GPT-4, and Copilot with a straightforward prompt:

> "Create an expense approval card for Microsoft Teams with requester info, line items, approve/reject buttons, and a comment field."

All three produced broken cards. Not subtly broken — broken in ways that crash renderers, fail accessibility checks, and get rejected by host environments.

My benchmarking across 100+ generation attempts revealed systemic failures:

| Issue | Rate |
|-------|------|
| Schema errors (hallucinated properties like `fontSize`, `padding`) | 32% |
| Accessibility violations (missing `wrap: true`, `altText`) | 45% |
| Host constraint violations (Table elements sent to Outlook v1.4) | 100% |
| Deprecated actions (`Action.Submit`, replaced in 2022) | 60% |
| **Cards that actually render correctly** | **55%** |

The LLMs aren't stupid — they just don't have the right knowledge at inference time. They've seen Adaptive Card examples in their training data, but those examples are often outdated, incomplete, or from a different schema version. The result: confident hallucination.

## The solution: structured tools as a knowledge layer

Instead of trying to fine-tune an LLM or cram the entire schema into a system prompt, I built an **MCP server** — a set of tools that any AI assistant can call to get authoritative, real-time answers about Adaptive Cards.

The key insight: **tools don't hallucinate**. When Claude calls `validate_card`, it gets a definitive answer from the actual v1.6 JSON Schema — not a probabilistic guess from training data. When it calls `transform_card` to downgrade a card for Outlook, the transformation is deterministic and correct, every time.

### The 9 tools

**Generate**

| Tool | What it does |
|------|-------------|
| `generate_card` | Natural language or data → valid Adaptive Card v1.6 JSON |
| `data_to_card` | Structured data (JSON, CSV) → auto-selects Table, FactSet, Chart, or List |
| `suggest_layout` | Describes your use case → recommends the best pattern from 21 templates |

**Validate and fix**

| Tool | What it does |
|------|-------------|
| `validate_card` | Schema validation + accessibility score + host compatibility + suggested fixes |
| `optimize_card` | Auto-adds `wrap: true`, `altText`, `speak`, replaces deprecated actions |

**Transform**

| Tool | What it does |
|------|-------------|
| `template_card` | Static card → `${expression}` data-bound template |
| `transform_card` | Version upgrade/downgrade, host adaptation (Teams → Outlook → Webex) |

**Compound workflows**

| Tool | What it does |
|------|-------------|
| `generate_and_validate` | Generate + validate + optimize in one call |
| `card_workflow` | Custom multi-step pipeline: generate → validate → optimize → template |

### 3 guided prompts

For users who prefer slash commands over natural language, the server also exposes MCP prompts — guided workflows that orchestrate the tools automatically:

```
/adaptive-cards-mcp:create-adaptive-card
  description: "Expense approval with line items and approve/reject buttons"
  host: teams
  intent: approval
```

This triggers: generate → validate → optimize → apply host config — and returns a production-ready card.

## Results: before and after

With the MCP server integrated, I re-ran the same benchmarks:

| Metric | Without MCP | With MCP |
|--------|-------------|----------|
| Schema errors | 32% | **0%** |
| Accessibility issues | 45% | **0%** |
| Host constraint violations | 100% | **0%** |
| Deprecated actions | 60% | **0%** |
| **Cards that render correctly** | **55%** | **95%+** |

The remaining 5% are edge cases where the LLM's natural language interpretation doesn't quite match the user's intent — the card is valid and accessible, just not exactly what was asked for.

## How it works in practice

### Setup: one command

```bash
# Claude Code
claude mcp add adaptive-cards-mcp -- npx adaptive-cards-mcp

# GitHub Copilot (VS Code) — add to .vscode/mcp.json
{ "servers": { "adaptive-cards-mcp": { "command": "npx", "args": ["adaptive-cards-mcp"] } } }

# Cursor — add to .cursor/mcp.json
{ "mcpServers": { "adaptive-cards-mcp": { "command": "npx", "args": ["adaptive-cards-mcp"] } } }

# M365 Copilot / Copilot Studio / ChatGPT (HTTP/SSE)
TRANSPORT=sse PORT=3001 npx adaptive-cards-mcp
```

No API keys required. The host LLM (Claude, GPT-4, etc.) provides the intelligence; the MCP server provides the knowledge.

### Usage: just talk

You don't need to know which tool to call. Just describe what you want:

```
> Create an expense approval card for Teams
```

The AI figures out it needs `generate_and_validate` with `intent: "approval"` and `host: "teams"`, calls the tool, and returns:

```json
{
  "type": "AdaptiveCard",
  "version": "1.6",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "Expense Approval Request",
          "size": "large",
          "weight": "bolder",
          "wrap": true,
          "style": "heading"
        }
      ],
      "bleed": true
    }
  ],
  "actions": [
    {
      "type": "Action.Execute",
      "title": "Approve",
      "style": "positive",
      "verb": "approve"
    },
    {
      "type": "Action.Execute",
      "title": "Reject",
      "style": "destructive",
      "verb": "reject"
    }
  ]
}
```

Along with a metadata summary:

```
Validation: Valid
Accessibility Score: 100/100
Elements: 7 | Nesting Depth: 2 | Version: 1.6
Try it out: Paste the card JSON into the Adaptive Cards Designer
```

Every response includes a link to the [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer) so you can preview instantly.

### More examples

**Create a card from a description:**
```
> /adaptive-cards-mcp:create-adaptive-card
  description: "A weather forecast card showing 5-day outlook with temperatures and icons"
  host: teams
  intent: display
```

**Convert data to a card:**
```
> /adaptive-cards-mcp:convert-data-to-card
  data: [
    { "task": "Review PR", "assignee": "Jane", "due": "2026-03-21", "status": "pending" },
    { "task": "Deploy hotfix", "assignee": "Bob", "due": "2026-03-19", "status": "in-progress" },
    { "task": "Update docs", "assignee": "Carol", "due": "2026-03-22", "status": "done" }
  ]
  title: "Sprint Tasks"
  presentation: table
```

**Review an existing card:**
```
> /adaptive-cards-mcp:review-adaptive-card
  card: { "type": "AdaptiveCard", "version": "1.6", "body": [...] }
  host: outlook
```

**Or just use natural language — no slash commands needed:**

```
> Create an expense approval card for Teams with requester photo, line items,
  total amount, and approve/reject buttons with comment field
```
```
> Build a CI/CD deployment notification — service name, environment, build number,
  commit SHA, deploy status with rollback button
```
```
> Generate a PagerDuty-style incident alert card — severity P1, affected service,
  start time, on-call engineer, acknowledge/escalate actions
```
```
> Create a customer feedback survey card with 1-5 star rating,
  comment field, and NPS score dropdown
```
```
> Build a service health dashboard showing 5 microservices with
  status indicators (healthy/degraded/down) and last check time
```
```
> This card works in Teams but breaks in Outlook — fix it for v1.4
```

| What you say | What happens |
|-------------|--------------|
| "Create an employee profile card" | `generate_and_validate` → profile card with ColumnSet layout |
| "Here's my API response, make it a card" | `data_to_card` → auto-picks Table/FactSet/List based on shape |
| "Is this card valid for Outlook?" | `validate_card` → schema errors, accessibility score, host issues |
| "Make this card accessible" | `optimize_card` → adds wrap, altText, speak, heading styles |
| "Make this card work on Webex (v1.3)" | `transform_card` → downgrades, removes unsupported features |
| "Convert this to a reusable template" | `template_card` → static values become `${expression}` bindings |
| "What layout for a task notification?" | `suggest_layout` → recommends approval pattern with rationale |

### Also works as an npm library

For bots, APIs, and CI pipelines:

```bash
npm install adaptive-cards-mcp
```

```typescript
import { generateCard, validateCardFull, optimizeCard } from 'adaptive-cards-mcp';

const result = await generateCard({
  content: "flight status card",
  host: "teams",
  intent: "display"
});

const validation = validateCardFull({ card: result.card, host: "teams" });
// validation.errors → [] (empty = valid)
// validation.accessibility.score → 100
```

## What I learned building this

### Tools > prompts for constrained domains

System prompts and few-shot examples can improve LLM output, but they can't guarantee correctness. A tool that runs the actual JSON Schema validator will catch every schema error, every time. This is the fundamental advantage of MCP: you're not asking the LLM to remember the spec — you're giving it a function that *implements* the spec.

### Host compatibility is the hardest part

Adaptive Cards look like one format, but they're really six different formats. A card that works perfectly in Teams can crash in Outlook (max version 1.4, different action types) or Webex (no Table element, no Action.Execute). The `transform_card` tool handles this automatically — it's the single most valuable tool in the server.

### Accessibility must be enforced, not suggested

LLMs will happily generate cards without `wrap: true`, `altText`, or `speak` properties. These aren't cosmetic — they're required for screen readers and assistive technology. The `optimize_card` tool adds them automatically, and `validate_card` scores every card on a 0-100 accessibility scale.

### Deterministic generation is surprisingly good

The server works without any LLM API key. In that mode, it uses 21 layout patterns and deterministic data analysis to build cards. For structured data (JSON arrays, CSV), this often produces better results than LLM generation — because the data shape directly determines the optimal layout.

When used via MCP, the host LLM provides the intelligence (understanding what the user wants) and the server provides the knowledge (how to build it correctly). This is the sweet spot.

## The numbers

| | v1.0 | v2.2.1 (current) |
|---|------|---------|
| Tools | 7 | 9 |
| Prompts | 0 | 3 |
| Tests | 862 | 924 |
| Layout patterns | 11 | 21 |
| Example cards | 36 | 36 |
| Host platforms | 6 | 7 |
| Transports | stdio only | stdio + HTTP/SSE |
| LLM providers | Anthropic, OpenAI | + Azure OpenAI, Ollama |
| Auth | none | API key + bearer token |

## Try it

```bash
claude mcp add adaptive-cards-mcp -- npx adaptive-cards-mcp
```

Then ask: *"Create an expense approval card for Teams."*

That's it. One command, zero config, and your AI assistant now knows more about Adaptive Cards than any LLM does on its own.

**Links:**
- [GitHub](https://github.com/VikrantSingh01/adaptive-cards-mcp)
- [npm](https://www.npmjs.com/package/adaptive-cards-mcp)
- [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer)

---

*Vikrant Singh is a Principal Engineering Manager at Microsoft Teams. The adaptive-cards-mcp project is open source under the MIT license.*
