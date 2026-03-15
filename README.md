# Adaptive Cards AI Builder

AI-powered tool that converts any content into schema-validated [Adaptive Card](https://adaptivecards.io/) v1.6 JSON. Available as an MCP server, npm library, and (coming soon) VS Code extension.

## Quick Start

### As MCP Server (Claude Code / Copilot / Cursor)

```bash
# Add to Claude Code
claude mcp add adaptive-cards-ai-builder -- node /path/to/dist/server.js

# Or run directly
npx adaptive-cards-ai-builder
```

Then in your AI assistant:
- *"Generate an expense approval card for Teams"*
- *"Convert this JSON data to an Adaptive Card table"*
- *"Validate this card JSON and check accessibility"*

### As npm Library

```typescript
import { generateCard, validateCardFull, dataToCard } from 'adaptive-cards-ai-builder';

// Generate a card from description
const result = await generateCard({
  content: "Create a flight status card showing airline, flight number, departure and arrival",
  host: "teams",
  intent: "display"
});
console.log(JSON.stringify(result.card, null, 2));

// Convert data to a card
const tableResult = await dataToCard({
  data: [
    { name: "Alice", role: "Engineer", team: "Platform" },
    { name: "Bob", role: "Designer", team: "UX" }
  ],
  title: "Team Members",
  host: "teams"
});

// Validate a card
const validation = validateCardFull({
  card: myCardJson,
  host: "outlook",
  strictMode: true
});
console.log(`Valid: ${validation.valid}, Accessibility: ${validation.accessibility.score}/100`);
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `generate_card` | Convert any content (natural language, data) into a valid Adaptive Card |
| `validate_card` | Schema validation + accessibility score + host compatibility check |
| `data_to_card` | Auto-select best presentation (Table/FactSet/Chart/List) from data shape |

### generate_card

```json
{
  "content": "Create an expense approval card with line items",
  "host": "teams",
  "intent": "approval",
  "version": "1.6"
}
```

### validate_card

```json
{
  "card": { "type": "AdaptiveCard", "version": "1.6", "body": [...] },
  "host": "outlook",
  "strictMode": true
}
```

Returns: schema errors, accessibility score (0-100), host compatibility, structural stats.

### data_to_card

```json
{
  "data": [{"month": "Jan", "revenue": 100}, {"month": "Feb", "revenue": 150}],
  "presentation": "auto",
  "title": "Monthly Revenue"
}
```

Auto-detects data shape: array-of-objects -> Table, key-value -> FactSet, numeric series -> Chart, flat list -> List.

## LLM Integration

By default, the tool uses deterministic pattern matching (11 layout patterns, data shape analysis). For AI-powered creative generation, set an API key:

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-...

# Or OpenAI
export OPENAI_API_KEY=sk-...
```

When used via MCP (Claude Code/Copilot), the host LLM provides the intelligence — no API key needed.

## Host Compatibility

The tool validates cards against specific host constraints:

| Host | Max Version | Notes |
|------|-------------|-------|
| Teams | 1.5 | Max 6 actions, Action.Execute preferred |
| Outlook | 1.4 | Limited elements, max 4 actions |
| Web Chat | 1.6 | Full support |
| Windows | 1.6 | Subset of elements |
| Viva Connections | 1.4 | SPFx-based ACE framework |
| Webex | 1.3 | No Table, no Action.Execute |

## Development

```bash
npm install
npm run build    # TypeScript + copy data files
npm test         # Run vitest (42 tests)
npm run lint     # TypeScript type check
```

## Architecture

```
src/
├── server.ts              # MCP server (stdio transport)
├── index.ts               # Library exports
├── tools/                 # Tool handlers (generate, validate, data-to-card)
├── core/                  # Schema validator, card analyzer, accessibility, host compat
├── generation/            # Layout patterns, data analyzer, card assembler, LLM client
├── data/                  # v1.6 schema, example cards, host configs
└── types/                 # TypeScript interfaces
```

## License

MIT
