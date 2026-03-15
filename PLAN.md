# Adaptive Cards AI Builder — Final Plan

## Context

Adaptive Cards power the UI across Teams (320M+ DAU), Outlook, Copilot, Windows, Power Automate (9-12M), and Bot Framework — but building them is entirely manual. No AI-powered card generation exists in the ecosystem. Developers spend 30-60 minutes per card, hand-crafting JSON.

**Goal:** Build an AI-powered core library + three parallel distribution channels (MCP, VS Code Extension, AC Designer browser extension) that convert any content into schema-validated Adaptive Card v1.6 JSON.

**Key decisions:**
- Ship MCP + VS Code Extension + AC Designer integration **in parallel**
- Core library has **optional LLM API** (Claude/OpenAI) for complex generation, falls back to pattern matching when no key
- Mobile ACVisualizer connects via **Azure-hosted REST API**

---

## Part 1: Distribution Strategy

### Why Three Channels in Parallel

All three share the same core library. The incremental effort per channel is small once the core exists.

| Channel | Reach | Incremental Effort | Ships By |
|---------|-------|--------------------|----------|
| **MCP Plugin** | Claude, Copilot, Cursor, Windsurf, all MCP clients | ~3 days (thin MCP wrapper) | Week 3 |
| **VS Code Extension** | 431K Teams Toolkit users + millions of VS Code devs | ~1.5 weeks (UI + preview panel) | Week 4-5 |
| **AC Designer Browser Extension** | Every developer using adaptivecards.io/designer | ~1 week (Chrome/Edge extension) | Week 4-5 |

### Full Channel Roadmap

```
Weeks 1-5:   Core Library + MCP + VS Code Extension + Designer Browser Extension
Weeks 6-8:   REST API (Azure Functions) ← enables mobile + Power Automate
Weeks 8-10:  Power Automate Custom Connector ← unlock 9-12M low-code makers
Weeks 10-12: ACVisualizer AI tab (iOS + Android) ← mobile card studio
Weeks 12-16: M365 Copilot Plugin + GitHub Copilot Extension ← enterprise
```

### Competitive Moat

Raw LLM generation fails ~30-40% of the time (hallucinated properties, invalid nesting, no host awareness). This tool guarantees:
1. Every output validated against v1.6 JSON Schema — zero invalid cards
2. Host-config-aware generation (Teams/Outlook/Webex constraints)
3. 80+ curated pattern library as few-shot references
4. Proper templating with `$data`, `$when`, `${expression}` syntax
5. Accessibility by default (altText, labels, wrap, speak)

---

## Part 2: Architecture

### Core Library (shared by ALL channels)

```
adaptive-cards-ai-builder/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                     # Library entry + CLI
│   ├── server.ts                    # MCP server (stdio transport)
│   ├── api.ts                       # REST API (Express, for Azure Functions)
│   ├── tools/
│   │   ├── generate-card.ts         # generate_card
│   │   ├── data-to-card.ts          # data_to_card
│   │   ├── validate-card.ts         # validate_card
│   │   ├── optimize-card.ts         # optimize_card
│   │   ├── template-card.ts         # template_card
│   │   ├── transform-card.ts        # transform_card
│   │   └── suggest-layout.ts        # suggest_layout
│   ├── core/
│   │   ├── schema-validator.ts      # ajv validation against v1.6
│   │   ├── card-analyzer.ts         # Structure analysis, element stats
│   │   ├── accessibility-checker.ts # WCAG compliance scoring
│   │   └── host-compatibility.ts    # Host-specific constraint checks
│   ├── generation/
│   │   ├── llm-client.ts            # Optional LLM API (Claude/OpenAI) — used when available
│   │   ├── prompt-builder.ts        # Build prompts with schema + examples for LLM
│   │   ├── example-selector.ts      # Select relevant few-shot examples by intent
│   │   ├── card-assembler.ts        # Deterministic card construction (no LLM fallback)
│   │   ├── data-analyzer.ts         # Data shape → presentation type
│   │   └── layout-patterns.ts       # 20+ canonical layout patterns
│   ├── data/
│   │   ├── schema.json              # v1.6 schema (from AdaptiveCards-Mobile)
│   │   ├── examples/                # 20+ curated example cards
│   │   ├── host-configs/            # teams-light, teams-dark, outlook, webchat
│   │   └── patterns/patterns.json   # Layout pattern catalog with metadata
│   └── types/
│       └── index.ts                 # All TypeScript interfaces
├── vscode-extension/                # VS Code extension (separate package)
│   ├── package.json                 # Extension manifest
│   ├── src/
│   │   ├── extension.ts             # Activation, commands, MCP integration
│   │   ├── card-preview-panel.ts    # Webview panel: rendered card preview
│   │   ├── generate-command.ts      # Command palette: "Generate Adaptive Card"
│   │   └── codelens-provider.ts     # CodeLens on .card.json files
│   └── media/                       # Icons, CSS for webview
├── browser-extension/               # Chrome/Edge extension for AC Designer
│   ├── manifest.json                # Extension manifest (Manifest V3)
│   ├── content-script.ts            # Inject AI panel into adaptivecards.io/designer
│   ├── popup.ts                     # Extension popup UI
│   └── ai-panel.ts                  # Chat-style AI generation panel
├── tests/
│   ├── tools/                       # Tool handler tests
│   ├── core/                        # Validator, analyzer tests
│   ├── generation/                  # Assembler, pattern tests
│   └── fixtures/                    # Sample inputs/expected outputs
└── README.md
```

### LLM Integration Strategy

**Dual-mode generation:**

```
User request
    │
    ├── LLM API key configured? ──YES──→ [prompt-builder.ts builds prompt with schema + examples]
    │                                     → [llm-client.ts calls Claude/OpenAI API]
    │                                     → [schema-validator.ts validates output]
    │                                     → [auto-fix if needed] → return card
    │
    └── No API key ──→ [data-analyzer.ts detects data shape]
                       → [layout-patterns.ts selects best pattern]
                       → [card-assembler.ts constructs card deterministically]
                       → [schema-validator.ts validates] → return card
```

**When used via MCP:** The host LLM (Claude/Copilot) provides the creative intelligence. The MCP tools return schema context + examples + validation. No API key needed — the host LLM IS the LLM.

**When used standalone (REST API, npm, mobile):** Optional API key enables LLM-powered generation. Without a key, falls back to deterministic pattern matching (still produces valid cards, just less creative).

### Validation Pipeline (every output, every channel)

```
Generated JSON → [1. ajv v1.6 schema check] → [2. structural: nesting depth, element count, duplicate IDs]
              → [3. host compatibility: unsupported elements for target host]
              → [4. accessibility: altText, labels, wrap, speak, contrast]
              → [5. best practices: Action.Execute over Submit, wrap:true, etc.]
              → validated card + diagnostics
```

---

## Part 3: MCP Tool Design (7 Tools)

### Tool 1: `generate_card`
Convert any content into a valid Adaptive Card.
```
Input:  { content: string, data?: object, host?: "teams"|"outlook"|"webchat"|"windows"|"generic",
          theme?: "light"|"dark", intent?: "display"|"approval"|"form"|"notification"|"dashboard",
          version?: "1.6" }
Output: { card: object, template?: object, sampleData?: object,
          validation: { valid, warnings[], hostCompatibility[] }, designNotes: string }
```

### Tool 2: `data_to_card`
Auto-select Table vs FactSet vs Chart vs List based on data shape.
```
Input:  { data: object|string(CSV), presentation?: "auto"|"table"|"chart-bar"|"facts"|"list"|"carousel",
          title?: string, host?: string, templateMode?: boolean }
Output: Same structure as generate_card
```

### Tool 3: `validate_card`
Schema + accessibility + host compatibility diagnostics.
```
Input:  { card: object, host?: string, strictMode?: boolean }
Output: { valid, errors[{path, message, severity, rule}],
          accessibility: {score 0-100, issues[]},
          hostCompatibility: {supported, unsupportedElements[]},
          stats: {elementCount, nestingDepth, hasTemplating, version} }
```

### Tool 4: `optimize_card`
Improve existing cards.
```
Input:  { card: object, goals?: ["accessibility"|"performance"|"compact"|"modern"], host?: string }
Output: { card: object, changes[{description, before, after}], improvement: {before/after metrics} }
```

### Tool 5: `template_card`
Static → templated with `${expression}` data binding.
```
Input:  { card?: object, dataShape?: object, description?: string }
Output: { template: object, sampleData: object, expressions[], bindingGuide: string }
```

### Tool 6: `transform_card`
Version/host transforms.
```
Input:  { card: object, transform: "upgrade"|"downgrade"|"apply-host-config"|"flatten",
          targetVersion?: string, targetHost?: string }
Output: { card: object, changes[], warnings[] }
```

### Tool 7: `suggest_layout`
Pattern recommendation without full generation.
```
Input:  { description: string, constraints?: {interactive?, targetHost?} }
Output: { suggestion: {pattern, elements[], layout, rationale, similarExample?},
          alternatives[{pattern, tradeoff}] }
```

---

## Part 4: VS Code Extension Design

### Features
1. **Command Palette:** "Adaptive Cards: Generate Card" → input box → generates JSON + opens preview
2. **Right-click context menu:** On selected text/data → "Generate Adaptive Card from Selection"
3. **Card Preview Panel:** Split webview showing rendered card alongside JSON (uses `adaptivecards` JS renderer)
4. **CodeLens:** On `.card.json` files: "Preview | Validate | Optimize | Template"
5. **Diagnostics:** Schema validation squiggles on Adaptive Card JSON files
6. **Snippets:** Quick-insert common card patterns

### Key files
- `vscode-extension/src/extension.ts` — activation, command registration
- `vscode-extension/src/card-preview-panel.ts` — webview with `adaptivecards` JS renderer
- `vscode-extension/src/generate-command.ts` — input → core library → output JSON

---

## Part 5: AC Designer Browser Extension

### Concept
Chrome/Edge extension that adds an AI chat panel to `adaptivecards.io/designer`. Developer describes what they want → extension generates card JSON → injects into the Designer's editor.

### Features
1. **AI Chat Panel:** Floating panel on the right side of the Designer
2. **"Generate" button:** Natural language → card JSON → auto-loaded into Designer
3. **"Optimize" button:** Takes current card from Designer → runs optimize → updates Designer
4. **"Validate" button:** Runs full diagnostics on current card, shows inline results

### Key files
- `browser-extension/content-script.ts` — DOM injection into Designer page
- `browser-extension/ai-panel.ts` — chat UI + core library integration
- `browser-extension/manifest.json` — Manifest V3, matches `adaptivecards.io/*` and `adaptivecards.microsoft.com/*`

---

## Part 6: ACVisualizer Mobile Integration

### Architecture
```
ACVisualizer (iOS/Android) → HTTPS → Azure Functions REST API → Core Library
```

### New "AI Generate" Tab
Add to existing bottom navigation (Gallery | Editor | **AI** | Teams | More):

1. **Chat-style input:** Describe what you want, or paste data
2. **Generated card preview:** Uses existing `AdaptiveCardView` renderer
3. **"Edit in Editor" button:** Loads JSON into existing `CardEditorView`
4. **"Test in Teams" button:** Loads into existing `TeamsSimulatorView`
5. **History:** Past generations saved locally

### Implementation
- **iOS:** New `AIGenerateView.swift` in `ios/SampleApp/`, calls REST API, renders via existing `AdaptiveCardView`
- **Android:** New `AIGenerateScreen.kt` in `android/sample-app/`, same pattern
- **Deep link:** `adaptivecards://ai?prompt=create+approval+card`

### Why Mobile Matters
- Stakeholders review cards on mobile Teams — see exactly how it renders
- QA tests native VoiceOver/TalkBack on real hardware
- On-the-go prototyping during meetings
- Demo to customers on real devices

---

## Part 7: Implementation Plan

### Phase 1: Core + Three Channels (Weeks 1-5)

**Week 1 — Core Foundation:**
- Project init: TypeScript, `@modelcontextprotocol/sdk`, `ajv`, `zod`, `vitest`
- Copy from AdaptiveCards-Mobile: `schema.json`, 20+ curated examples, host configs
- `core/schema-validator.ts` — ajv against v1.6
- `core/card-analyzer.ts` — element count, nesting depth, stats
- `core/accessibility-checker.ts` — altText, labels, wrap, speak checks
- Unit tests: all 56 test cards pass validation

**Week 2 — Generation Engine:**
- `generation/layout-patterns.ts` — 10 patterns: notification, approval, data-table, facts, image-gallery, dashboard, input-form, status-update, list, profile-card
- `generation/data-analyzer.ts` — array→table, key-value→facts, numbers→chart
- `generation/card-assembler.ts` — deterministic card construction from pattern + data
- `generation/llm-client.ts` — optional Claude/OpenAI client with prompt-builder
- `generation/example-selector.ts` — intent-based few-shot matching

**Week 3 — MCP Server (ships):**
- `server.ts` — MCP server with stdio transport
- Tool handlers: `generate-card.ts`, `validate-card.ts`, `data-to-card.ts`
- Integration tests: end-to-end MCP tool calls
- Test with Claude Code as MCP host
- README, `npx` support, publish to npm as `adaptive-cards-ai-builder`

**Week 4 — VS Code Extension:**
- `vscode-extension/` scaffold with `yo code`
- Command palette: "Generate Adaptive Card"
- Card preview webview panel (uses `adaptivecards` JS renderer)
- CodeLens on `.card.json` files
- Schema validation diagnostics
- Publish to VS Code Marketplace

**Week 5 — Browser Extension + Polish:**
- `browser-extension/` with Manifest V3
- Content script injects AI panel into AC Designer
- Chat UI → core library → inject card into Designer editor
- Publish to Chrome Web Store + Edge Add-ons
- Blog post, documentation, demo videos

### Phase 2: Full Tools + REST API (Weeks 6-8)
- Remaining 4 tools: `optimize_card`, `template_card`, `transform_card`, `suggest_layout`
- Expand to 20+ layout patterns, CSV parsing, accessibility scoring
- REST API on Azure Functions (`POST /generate`, `/validate`, `/optimize`, `/template`)
- npm library export: `import { generateCard } from 'adaptive-cards-ai-builder'`

### Phase 3: Power Automate + Mobile (Weeks 9-12)
- Power Automate Custom Connector (wraps REST API)
- ACVisualizer AI tab — iOS `AIGenerateView.swift` + Android `AIGenerateScreen.kt`
- Both call Azure REST API, render via existing `AdaptiveCardView`
- Deep link: `adaptivecards://ai?prompt=...`

### Phase 4: Enterprise (Weeks 13-16)
- M365 Copilot Plugin submission (Agent Marketplace)
- GitHub Copilot Extension
- Teams Toolkit integration PR
- AC Designer PR (upstream contribution to official tool)

---

## Critical Files to Reuse

| Asset | Source | Target |
|-------|--------|--------|
| v1.6 JSON Schema | `~/Projects/AdaptiveCards-Mobile/shared/schema/adaptive-card-schema-1.6.json` | `src/data/schema.json` |
| Test cards (56) | `~/Projects/AdaptiveCards-Mobile/shared/test-cards/` | `src/data/examples/` (20+ curated) + `tests/fixtures/` |
| Host configs | `~/Projects/AdaptiveCards-Mobile/shared/host-configs/` | `src/data/host-configs/` |
| ICM MCP server | `~/icm-mcp-server/index.js` | Reference for MCP server setup |
| SchemaValidator | `~/Projects/AdaptiveCards-Mobile/ios/Sources/ACCore/SchemaValidator.swift` | Port logic to `core/schema-validator.ts` |
| Visualizer iOS | `~/Projects/AdaptiveCards-Mobile/ios/SampleApp/` | Add `AIGenerateView.swift` |
| Visualizer Android | `~/Projects/AdaptiveCards-Mobile/android/sample-app/` | Add `AIGenerateScreen.kt` |
| CardEditorView | `~/Projects/AdaptiveCards-Mobile/ios/SampleApp/CardEditorView.swift` | Reuse for post-generation editing |
| TeamsSimulatorView | `~/Projects/AdaptiveCards-Mobile/ios/SampleApp/TeamsSimulatorView.swift` | Reuse for card testing |

---

## Verification Plan

1. **Unit tests (`vitest`):** Schema validator passes all 56 test cards; card assembler produces valid JSON for each of 10+ patterns; accessibility checker scores known cards correctly
2. **MCP integration tests:** Call each tool via `@modelcontextprotocol/sdk` test client, verify output structure + schema validity
3. **Claude Code E2E:** Configure MCP server, test: "Generate a flight status card for Teams", "Convert this JSON data to a card", "Validate this card"
4. **VS Code E2E:** Install extension, test command palette generation, preview panel rendering, CodeLens actions, diagnostic squiggles
5. **Browser Extension E2E:** Load on adaptivecards.io/designer, generate card via AI panel, verify it loads in Designer
6. **AC Designer rendering:** Paste all generated cards into Designer — verify they render correctly
7. **Mobile E2E:** Load generated cards in ACVisualizer via deep link, verify rendering on iOS simulator + Android emulator
8. **Host compatibility:** Generate with `host: "teams"` / `host: "outlook"` / `host: "webchat"`, verify no unsupported elements
9. **LLM mode:** Test with API key (Claude) and without (pattern-matching fallback), compare output quality
