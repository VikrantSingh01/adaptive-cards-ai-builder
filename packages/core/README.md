# Adaptive Cards AI Builder — Core

MCP server + npm library for AI-powered Adaptive Card generation, validation, and optimization.

> Part of the [Adaptive Cards AI Builder](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) ecosystem.
> Also available as a [VS Code extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode) and [browser extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser).

## Install

```bash
# As MCP server
npx adaptive-cards-ai-builder

# Add to Claude Code
claude mcp add adaptive-cards-ai-builder -- npx adaptive-cards-ai-builder

# As npm library
npm install adaptive-cards-ai-builder
```

## MCP Tools (7)

| Tool | Description |
|------|-------------|
| `generate_card` | Natural language / data → valid Adaptive Card v1.6 JSON |
| `validate_card` | Schema validation + accessibility score (0-100) + host compatibility |
| `data_to_card` | Auto-select Table / FactSet / Chart / List from data shape |
| `optimize_card` | Improve accessibility, performance, modernize actions |
| `template_card` | Static card → `${expression}` data-bound template |
| `transform_card` | Version upgrade/downgrade, host-config adaptation |
| `suggest_layout` | Recommend best layout pattern for a description |

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
} from 'adaptive-cards-ai-builder';

// Generate from description
const result = await generateCard({
  content: "Create a flight status card",
  host: "teams",
  intent: "display"
});

// Convert data to card
const table = await dataToCard({
  data: [{ name: "Alice", role: "Engineer" }, { name: "Bob", role: "Designer" }],
  title: "Team"
});

// Validate
const validation = validateCardFull({ card: myCard, host: "outlook" });

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
export ANTHROPIC_API_KEY=sk-ant-...  # or OPENAI_API_KEY=sk-...
```

When used via MCP (Claude Code, Copilot, Cursor), the host LLM provides the intelligence — no API key needed.

## Development

```bash
npm install
npm run build    # TypeScript + copy data files
npm test         # 42 tests (vitest)
npm run lint     # TypeScript type check
```

## Related

- [Adaptive Cards AI Builder (monorepo)](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) — All packages in one repo
- [VS Code Extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode) — Generate, preview, validate cards in VS Code
- [Browser Extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser) — AI panel for the Adaptive Cards Designer

## License

MIT
