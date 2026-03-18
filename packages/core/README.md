# adaptive-cards-mcp

<p align="center">
  <img src="media/hero.png" alt="adaptive-cards-mcp" width="700">
</p>

[![npm](https://img.shields.io/npm/v/adaptive-cards-mcp.svg)](https://www.npmjs.com/package/adaptive-cards-mcp)
[![npm downloads](https://img.shields.io/npm/dm/adaptive-cards-mcp.svg)](https://www.npmjs.com/package/adaptive-cards-mcp)
[![GitHub stars](https://img.shields.io/github/stars/VikrantSingh01/adaptive-cards-mcp.svg?style=social)](https://github.com/VikrantSingh01/adaptive-cards-mcp)

An MCP server that helps AI assistants generate valid, accessible Adaptive Cards for Teams, Outlook, Copilot, and other Microsoft surfaces. 9 tools, 3 guided workflows, 924 tests.

> **Blog:** [I Built an MCP Server That Makes AI 10x Better at Adaptive Cards](https://singhvikrant.substack.com/p/i-built-an-mcp-server-that-makes)
>
> Part of the [Adaptive Cards MCP](https://github.com/VikrantSingh01/adaptive-cards-mcp) ecosystem.

## Quick Start

### 1. Add to your AI assistant

No install needed — `npx` downloads and runs it automatically.

**Claude Code:**
```bash
claude mcp add adaptive-cards-mcp -- npx adaptive-cards-mcp
```

**GitHub Copilot (VS Code)** — add to `.vscode/mcp.json`:
```json
{ "servers": { "adaptive-cards-mcp": { "command": "npx", "args": ["adaptive-cards-mcp"] } } }
```

**Cursor** — add to `.cursor/mcp.json`:
```json
{ "mcpServers": { "adaptive-cards-mcp": { "command": "npx", "args": ["adaptive-cards-mcp"] } } }
```

**HTTP/SSE (for M365 Copilot, Copilot Studio, ChatGPT):**
```bash
TRANSPORT=sse PORT=3001 npx adaptive-cards-mcp

# With authentication
TRANSPORT=sse MCP_API_KEY=your-secret npx adaptive-cards-mcp
```

### 2. Start using it

Just ask your AI assistant in natural language:

```
> Create an expense approval card for Teams
> Convert this JSON data into an Adaptive Card table
> Validate this card and fix accessibility issues
> Make this card work on Outlook (v1.4)
```

The AI picks the right tools, generates a valid card, and returns production-ready JSON you can paste into the [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer) to preview.

## Usage

### Natural language (recommended)

Just describe what you need:

```
> Create an expense approval card for Teams with requester photo, line items,
  total amount, and approve/reject buttons with comment field
```
```
> Build a CI/CD deployment notification — service name, environment, build number,
  status badge, and rollback action
```
```
> Here's our sales data, make it a card:
  [{"region":"APAC","revenue":1250000},{"region":"EMEA","revenue":980000}]
```
```
> This card works in Teams but breaks in Outlook — fix it for v1.4
```

| What you say | What the AI calls |
|-------------|-------------------|
| "Create a leave approval card for Teams" | `generate_and_validate` → optimized card with Approve/Reject actions |
| "Here's my API response, make it a card" | `data_to_card` → auto-picks Table/FactSet/List based on data shape |
| "Is this card valid for Outlook?" | `validate_card` → schema errors, accessibility score, host compatibility |
| "Make this card accessible" | `optimize_card` → adds wrap, altText, speak, heading styles |
| "Convert this card to a reusable template" | `template_card` → static values become `${expression}` bindings |
| "This card needs to work on v1.3" | `transform_card` → downgrades, removes unsupported features |

### Slash commands (MCP prompts)

For guided multi-step workflows:

**Create a card:**
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
  card: { "type": "AdaptiveCard", "version": "1.6", "body": [...your card...] }
  host: outlook
```

## MCP Tools (9)

| Tool | Description |
|------|-------------|
| `generate_card` | Natural language / data → valid Adaptive Card v1.6 JSON |
| `validate_card` | Schema validation + accessibility score + host compatibility + suggested fixes |
| `data_to_card` | Auto-select Table / FactSet / Chart / List from data shape |
| `optimize_card` | Improve accessibility, performance, modernize actions |
| `template_card` | Static card → `${expression}` data-bound template |
| `transform_card` | Version upgrade/downgrade, host-config adaptation |
| `suggest_layout` | Recommend best layout pattern for a description |
| `generate_and_validate` | Generate + validate + optionally optimize in one call |
| `card_workflow` | Multi-step pipeline: generate → optimize → template → transform |

### MCP Prompts (3)

| Prompt | Pipeline | Slash command |
|--------|----------|---------------|
| `create-adaptive-card` | generate → validate → optimize → host config | `/adaptive-cards-mcp:create-adaptive-card` |
| `review-adaptive-card` | validate → auto-fix → before/after report | `/adaptive-cards-mcp:review-adaptive-card` |
| `convert-data-to-card` | analyze data → pick presentation → validate | `/adaptive-cards-mcp:convert-data-to-card` |

## Library Usage

For use in your own code (bots, APIs, CI pipelines):

```bash
npm install adaptive-cards-mcp
```

```typescript
import {
  generateCard,
  validateCardFull,
  dataToCard,
  optimizeCard,
  templateCard,
  transformCard,
  suggestLayout
} from 'adaptive-cards-mcp';

// Generate from description
const result = await generateCard({
  content: "Create a flight status card",
  host: "teams",
  intent: "display"
});
console.log(result.card);   // Adaptive Card JSON
console.log(result.cardId); // Reference ID for subsequent calls

// Convert data to card
const table = await dataToCard({
  data: [{ name: "Alice", role: "Engineer" }, { name: "Bob", role: "Designer" }],
  title: "Team"
});

// Validate with suggested fixes
const validation = validateCardFull({ card: myCard, host: "outlook" });
// validation.errors[0].suggestedFix → { description: "...", patch: {...} }

// Optimize
const optimized = optimizeCard({ card: myCard, goals: ["accessibility", "modern"] });

// Templatize
const template = templateCard({ card: myCard });

// Transform for a different host
const transformed = transformCard({
  card: myCard,
  transform: "apply-host-config",
  targetHost: "webex"
});

// Get layout suggestion
const suggestion = suggestLayout({
  description: "team member directory with photos"
});
```

### Card Persistence

Tools return a `cardId` that can be passed to subsequent tools instead of the full card JSON:

```typescript
const { card, cardId } = await generateCard({ content: "..." });
const validation = validateCardFull({ card: cardId, host: "teams" });
const optimized = optimizeCard({ card: cardId, goals: ["accessibility"] });
```

## What you get back

Card-producing tools return **two clean blocks** — card JSON you can copy, and a metadata summary:

````
```json
{
  "type": "AdaptiveCard",
  "version": "1.6",
  "body": [ ... ],
  "actions": [ ... ]
}
```

---

**Validation:** Valid
**Accessibility Score:** 100/100
**Elements:** 7 | **Nesting Depth:** 2 | **Version:** 1.6
**Card ID:** card-abc123
**Steps:** generate → validate → optimize
**Try it out:** Paste the card JSON into the [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer)
**Local Preview:** file:///tmp/ac-preview-xyz.html
````

## Host Compatibility

| Host | Max Version | Notes |
|------|-------------|-------|
| Generic | 1.6 | Default — no host-specific constraints |
| Teams | 1.6 | Max 6 actions, Action.Execute preferred |
| Outlook | 1.4 | Limited elements, max 4 actions |
| Web Chat | 1.6 | Full support |
| Windows | 1.6 | Subset of elements |
| Viva Connections | 1.4 | SPFx-based ACE framework |
| Webex | 1.3 | No Table, no Action.Execute |

## LLM Integration

By default, uses deterministic pattern matching (21 layout patterns). For AI-powered generation, set an API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # Anthropic (recommended)
export OPENAI_API_KEY=sk-...          # OpenAI
export AZURE_OPENAI_API_KEY=...       # Azure OpenAI
export OLLAMA_BASE_URL=http://localhost:11434  # Ollama (local)
```

> **Note:** When used via MCP (Claude Code, Copilot, Cursor), the host LLM provides the intelligence — no API key needed.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TRANSPORT` | `stdio` or `sse` | `stdio` |
| `PORT` | HTTP port for SSE | `3001` |
| `MCP_API_KEY` | API key for HTTP auth | *(disabled)* |
| `MCP_AUTH_MODE` | `bearer` for token auth | *(disabled)* |
| `DEBUG` | `adaptive-cards-mcp` for logs | *(disabled)* |
| `MCP_RATE_LIMIT` | `true` to enable | `false` |
| `MCP_TELEMETRY` | `true` to enable metrics | `false` |

## Development

```bash
npm install
npm run build         # TypeScript + copy data files
npm test              # 924 tests (vitest)
npm run test:coverage # Coverage report
npm run lint          # TypeScript type check
npm run lint:eslint   # ESLint
npm run format        # Prettier
```

### Local Testing

**Smoke test all tools and prompts:**
```bash
# From repo root
./test-mcp-tools.sh --local     # 28 tests — all 9 tools with real-world scenarios
./test-mcp-prompts.sh --local   # 10 tests — all 3 prompts (guided workflows)
```

**MCP Inspector (visual UI):**
```bash
npm run build
npx @modelcontextprotocol/inspector node dist/server.js
# Opens http://localhost:6274 — pick a tool, enter params, click Run
```

**Terminal (stdio):**
```bash
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"generate_card","arguments":{"content":"expense approval card","intent":"approval","host":"teams"}}}' \
  | node dist/server.js 2>/dev/null | tail -1 | python3 -m json.tool
```

**SSE mode:**
```bash
TRANSPORT=sse PORT=3001 node dist/server.js
curl http://localhost:3001/health
```

## Related

- [Adaptive Cards MCP (monorepo)](https://github.com/VikrantSingh01/adaptive-cards-mcp)
- [VS Code Extension](https://github.com/VikrantSingh01/adaptive-cards-ai-vscode)
- [openclaw-adaptive-cards](https://github.com/VikrantSingh01/openclaw-adaptive-cards) — OpenClaw AI agent plugin using this library
- [Adaptive Cards Documentation](https://adaptivecards.microsoft.com/) — Official docs
- [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer) — Interactive card designer
- [CHANGELOG](../../CHANGELOG.md)

## License

MIT
