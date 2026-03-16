# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-03-16

### Added
- **Designer Preview** — Card-producing tools now return a `preview` URL that auto-opens the Adaptive Cards Designer with the card payload pre-loaded via `postMessage`
  - **stdio mode**: writes a self-contained HTML bridge page to a temp file (`file://` URL via `pathToFileURL` for cross-platform correctness)
  - **SSE mode**: serves preview at `/preview/{cardId}` endpoint (public route, no auth required)
- **XSS-safe HTML generation** — Card JSON is escaped (`<`, `>`, `&`) before embedding in the preview `<script>` block
- **Cross-platform file URLs** — Uses Node.js `pathToFileURL()` for correct `file:///C:/...` URLs on Windows
- **CSP headers** — Preview endpoint sets `Content-Security-Policy` allowing only the Designer iframe origin
- **Preview tests** — 9 new tests covering HTML generation, file writing, XSS escaping, and URL format

### Changed
- Test count increased from 909 to 918 (20 test files)

## [2.1.0] - 2026-03-16

### Added
- **HTTP/SSE transport** — Deploy as an HTTP server for M365 Copilot, Copilot Studio, and ChatGPT integration (`TRANSPORT=sse`)
- **Card persistence** — Session-scoped card store with `cardId` references. Tools return `cardId` and accept it as input, reducing token overhead
- **Compound workflow tools** — `generate_and_validate` and `card_workflow` for multi-step pipelines in a single call
- **MCP Prompts** — 3 guided prompts: `create-adaptive-card`, `review-adaptive-card`, `convert-data-to-card`
- **MCP Resource Templates** — Parameterized URIs: `ac://hosts/{hostName}`, `ac://examples/{intent}`
- **Auth middleware** — API key and bearer token authentication for HTTP transport (`MCP_API_KEY`, `MCP_AUTH_MODE=bearer`)
- **Azure OpenAI support** — LLM provider via `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`
- **Ollama support** — Local model integration via `OLLAMA_BASE_URL`
- **Debug logging** — Structured JSON logging to stderr (`DEBUG=adaptive-cards-mcp`)
- **Input size guards** — Configurable limits on card complexity, data rows, and input size
- **Rate limiting** — Token bucket per tool (`MCP_RATE_LIMIT=true`)
- **Telemetry** — Opt-in tool-call metrics (`MCP_TELEMETRY=true`)
- **Suggested fixes** — Validation errors now include `suggestedFix` with descriptions and JSON patches
- **ESLint + Prettier** — Code style enforcement configuration
- **Coverage reporting** — vitest coverage with V8 provider and threshold enforcement
- **Graceful shutdown** — SIGINT/SIGTERM handlers for clean server termination
- **CONTRIBUTING.md** — Developer guide with architecture overview and PR checklist

### Changed
- Server version bumped to 2.1.0
- Tool count increased from 7 to 9 (added `generate_and_validate`, `card_workflow`)
- Error messages now sanitize API keys and sensitive data before returning to clients
- Per-tool error handling with tool name in error responses
- Examples catalog is now lazy-loaded and cached
- LLM error messages are truncated and sanitized

### Removed
- `zod` dependency (was imported but never used)

### Fixed
- Schema normalization no longer mutates the original loaded schema object (deep-clones before modifying)

## [2.0.0] - 2026-03-10

### Added
- 7 MCP tools: generate_card, validate_card, data_to_card, optimize_card, template_card, transform_card, suggest_layout
- 4 MCP resources: schema, hosts, examples, patterns
- Official Adaptive Cards v1.6 schema validation with ajv
- Accessibility scoring (0-100) with WCAG compliance checks
- Host compatibility checking for 7 hosts (Teams, Outlook, Webchat, Windows, Viva, Webex, Generic)
- Smart host adaptation with element replacement (Table→ColumnSet, Carousel→Container, etc.)
- 11 canonical layout patterns with realistic templates
- Expert prompt engineering with few-shot examples for LLM generation
- Deterministic card generation fallback (no API key required)
- 36 curated example cards
- 322 test fixture cards
- 862 passing tests
- Dual ESM/CJS builds with TypeScript types
- CLI binary (`npx adaptive-cards-mcp`)

## [1.0.0] - 2026-02-15

### Added
- Initial release with basic card generation and validation
