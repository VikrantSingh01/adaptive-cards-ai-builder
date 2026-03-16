# adaptive-cards-mcp

<p align="center">
  <img src="media/hero.png" alt="adaptive-cards-mcp" width="700">
</p>

[![npm](https://img.shields.io/npm/v/adaptive-cards-mcp.svg)](https://www.npmjs.com/package/adaptive-cards-mcp)

The world's first MCP server for Adaptive Cards — 9 tools, 3 prompts, 918 tests. Now with Designer preview.

> **Blog:** [I Built an MCP Server That Makes AI 10x Better at Adaptive Cards](https://singhvikrant.substack.com/p/i-built-an-mcp-server-that-makes)

> Part of the [Adaptive Cards MCP](https://github.com/VikrantSingh01/adaptive-cards-mcp) ecosystem.

## Install

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

**npm library:**
```bash
npm install adaptive-cards-mcp
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

| Prompt | Description |
|--------|-------------|
| `create-adaptive-card` | Guided card creation |
| `review-adaptive-card` | Accessibility and compatibility review |
| `convert-data-to-card` | Data visualization workflow |

## Library Usage

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

## Host Compatibility

| Host | Max Version | Notes |
|------|-------------|-------|
| Teams | 1.6 | Max 6 actions, Action.Execute preferred |
| Outlook | 1.4 | Limited elements, max 4 actions |
| Web Chat | 1.6 | Full support |
| Windows | 1.6 | Subset of elements |
| Viva Connections | 1.4 | SPFx-based ACE framework |
| Webex | 1.3 | No Table, no Action.Execute |

## LLM Integration

By default, uses deterministic pattern matching (11 layout patterns). For AI-powered generation, set an API key:

```bash
# Anthropic (recommended)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Azure OpenAI
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Ollama (local)
export OLLAMA_BASE_URL=http://localhost:11434
```

When used via MCP (Claude Code, Copilot, Cursor), the host LLM provides the intelligence — no API key needed.

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
npm test              # 918 tests (vitest)
npm run test:coverage # Coverage report
npm run lint          # TypeScript type check
npm run lint:eslint   # ESLint
npm run format        # Prettier
```

### Designer Preview

Card-producing tools (`generate_card`, `data_to_card`, `generate_and_validate`, `card_workflow`) return a `preview` URL that auto-opens the [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer) with the card pre-loaded:

- **stdio mode** — Writes a self-contained HTML bridge page to a temp file (`file://` URL)
- **SSE mode** — Serves preview at `/preview/{cardId}` (no auth required)

## Related

- [Adaptive Cards MCP (monorepo)](https://github.com/VikrantSingh01/adaptive-cards-mcp)
- [VS Code Extension](https://github.com/VikrantSingh01/adaptive-cards-ai-vscode)
- [openclaw-adaptive-cards](https://github.com/VikrantSingh01/openclaw-adaptive-cards) — OpenClaw AI agent plugin using this library
- [CHANGELOG](../../CHANGELOG.md)
- [Adaptive Cards Documentation](https://adaptivecards.microsoft.com/) — Official docs
- [Adaptive Cards Designer](https://adaptivecards.microsoft.com/designer) — Interactive card designer
- [CONTRIBUTING](../../CONTRIBUTING.md)

## License

MIT
