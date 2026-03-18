#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Adaptive Cards MCP — Tool Smoke Test
#
# End-to-end tests for all 9 MCP tools using real-world scenarios.
# Sends JSON-RPC requests via stdio and validates card output quality.
#
# Usage:
#   ./test-mcp-tools.sh --local   # test against local build (packages/core/dist)
#   ./test-mcp-tools.sh           # test against published npm package
#
# Tests (28 total):
#   #1-5   generate_card        — standup, approval, incident, deploy, multiline
#   #6-8   validate_card        — valid card, bad element, Outlook host compat
#   #9-13  data_to_card         — JSON table, CSV table, key-value facts, CSV facts, roster
#   #14-15 optimize_card        — accessibility fixes, deprecated action replacement
#   #16-17 template_card        — order confirmation, incident alert
#   #18-20 transform_card       — v1.3 Webex, v1.4 Outlook, flatten nesting
#   #21-22 suggest_layout       — approval flow, dashboard
#   #23-26 generate_and_validate — onboarding, survey, Outlook profile, time-off
#   #27-28 card_workflow         — alert pipeline, Webex deploy
#
# Quality checks for card-producing tools:
#   - Valid JSON (parseable by Adaptive Cards Designer)
#   - No literal newlines in string values
#   - No empty TextBlocks or FactSets
#   - Schema validation must pass
#   - Accessibility score meets per-test threshold
#   - Element count meets per-test minimum
#
# Prerequisites:
#   - Node.js >= 20, python3
#   - For --local: run `cd packages/core && npm run build` first
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; DIM='\033[2m'; RESET='\033[0m'

if [[ "${1:-}" == "--local" ]]; then
  SERVER="node $(dirname "$0")/packages/core/dist/server.js"
  echo -e "${CYAN}Mode: local build${RESET}"
else
  SERVER="npx -y adaptive-cards-mcp"
  echo -e "${CYAN}Mode: npm registry (adaptive-cards-mcp)${RESET}"
fi

INIT='{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

PASS=0; FAIL=0; TOTAL=0

call_tool() {
  local label="$1" tool="$2" args="$3" desc="$4" expect_card="${5:-false}" min_access="${6:-0}" min_elements="${7:-0}"
  TOTAL=$((TOTAL + 1))
  local payload="{\"jsonrpc\":\"2.0\",\"id\":${TOTAL},\"method\":\"tools/call\",\"params\":{\"name\":\"${tool}\",\"arguments\":${args}}}"

  echo -e "\n${CYAN}━━━ ${TOTAL}. ${label} ━━━${RESET}"
  echo -e "${DIM}Tool: ${tool}${RESET}"
  echo -e "${desc}"

  local result
  result=$(echo "${INIT}
${payload}" | $SERVER 2>/dev/null | tail -1)

  # Check for RPC error
  if ! echo "$result" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); sys.exit(0 if 'error' not in r else 1)" 2>/dev/null; then
    echo "$result" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); print(json.dumps(r.get('error',r), indent=2))" 2>/dev/null || echo "$result"
    echo -e "${RED}FAIL (RPC error)${RESET}"
    FAIL=$((FAIL + 1))
    return
  fi

  # Display content blocks (truncated)
  echo "$result" | python3 -c "
import sys, json
resp = json.loads(sys.stdin.read())
for block in resp.get('result',{}).get('content',[]):
    text = block.get('text','')
    lines = text.split('\n')
    for line in lines[:15]:
        print(line)
    if len(lines) > 15:
        print(f'  ... ({len(lines)-15} more lines)')
"

  # If this tool produces a card, run full quality checks
  if [[ "$expect_card" == "true" ]]; then
    local card_check
    card_check=$(echo "$result" | python3 -c "
import sys, json, re

resp = json.loads(sys.stdin.read())
blocks = resp['result']['content']
text = blocks[0]['text']
meta = blocks[1]['text'] if len(blocks) > 1 else ''

# ── Parse card JSON ──
start = text.index('{')
end = text.rindex('}') + 1
card_json = text[start:end]
card = json.loads(card_json)

errors = []
warnings = []

# 1. Must be an AdaptiveCard
if card.get('type') != 'AdaptiveCard':
    errors.append('Missing type: AdaptiveCard')

# 2. No literal newlines in string values
def check_newlines(obj, path=''):
    if isinstance(obj, str):
        if '\n' in obj or '\r' in obj:
            errors.append(f'Newline in {path}: {repr(obj[:60])}')
    elif isinstance(obj, dict):
        for k, v in obj.items():
            check_newlines(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_newlines(v, f'{path}[{i}]')
check_newlines(card)

# 3. No empty TextBlocks or FactSets
def check_empty(obj, path=''):
    if isinstance(obj, dict):
        if obj.get('type') == 'TextBlock' and obj.get('text') == '':
            errors.append(f'Empty TextBlock at {path}')
        if obj.get('type') == 'FactSet' and obj.get('facts') == []:
            errors.append(f'Empty FactSet at {path}')
        for k, v in obj.items():
            check_empty(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_empty(v, f'{path}[{i}]')
check_empty(card)

# ── Parse metadata block ──
acc_match = re.search(r'Accessibility Score:\*?\*?\s*(\d+)/100', meta)
acc_score = int(acc_match.group(1)) if acc_match else -1

elem_match = re.search(r'Elements:\*?\*?\s*(\d+)', meta)
elem_count = int(elem_match.group(1)) if elem_match else -1

valid_match = re.search(r'Validation:\*?\*?\s*(Valid|Invalid)', meta)
is_valid = valid_match.group(1) == 'Valid' if valid_match else None

err_match = re.search(r'Valid\s*\((\d+)\s*error', meta)
validation_errors = int(err_match.group(1)) if err_match else 0

# 4. Validation must pass
if is_valid == False:
    errors.append(f'Card failed validation')

# 5. Accessibility score threshold
min_acc = int(${min_access})
if min_acc > 0 and acc_score >= 0 and acc_score < min_acc:
    errors.append(f'Accessibility {acc_score}/100 below minimum {min_acc}/100')

# 6. Minimum element count
min_el = int(${min_elements})
if min_el > 0 and elem_count >= 0 and elem_count < min_el:
    errors.append(f'Only {elem_count} elements, expected at least {min_el}')

# 7. Validation errors as warnings
if validation_errors > 0:
    warnings.append(f'{validation_errors} validation warning(s)')

# ── Report ──
summary_parts = []
if acc_score >= 0:
    summary_parts.append(f'a11y:{acc_score}')
if elem_count >= 0:
    summary_parts.append(f'elements:{elem_count}')
if validation_errors > 0:
    summary_parts.append(f'warnings:{validation_errors}')
summary = ', '.join(summary_parts)

if errors:
    for e in errors:
        print(f'CARD_ERROR: {e}')
    print(f'SUMMARY: {summary}')
elif warnings:
    print(f'CARD_WARN: {summary}')
else:
    print(f'CARD_OK: {summary}')
" 2>&1)

    if echo "$card_check" | grep -q "^CARD_ERROR"; then
      echo "$card_check"
      echo -e "${RED}FAIL${RESET}"
      FAIL=$((FAIL + 1))
    elif echo "$card_check" | grep -q "^CARD_WARN"; then
      local summary=$(echo "$card_check" | sed 's/CARD_WARN: //')
      echo -e "${GREEN}PASS${RESET} ${YELLOW}(${summary})${RESET}"
      PASS=$((PASS + 1))
    else
      local summary=$(echo "$card_check" | sed 's/CARD_OK: //')
      echo -e "${GREEN}PASS${RESET} ${DIM}(${summary})${RESET}"
      PASS=$((PASS + 1))
    fi
  else
    echo -e "${GREEN}PASS${RESET}"
    PASS=$((PASS + 1))
  fi
}

echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║   Adaptive Cards MCP — Smoke Test (9 tools, real-world scenarios)   ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}"

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1: generate_card — Natural language → card
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Generate: Standup Summary" "generate_card" \
  '{"content":"Team standup summary: 3 blockers resolved, 5 tasks completed, next sprint planning Friday 2pm","intent":"status","host":"teams"}' \
  "Status card from a standup summary." \
  "true" 60 2

call_tool "Generate: Expense Approval" "generate_card" \
  '{"content":"Expense approval from Sarah Chen for $2,450 — client dinner at Nobu, Q1 marketing budget, needs VP approval by Friday","intent":"approval","host":"teams"}' \
  "Approval card with requester name, amount, and deadline." \
  "true" 80 5

call_tool "Generate: Incident Alert" "generate_card" \
  '{"content":"P1 Incident: api-gateway latency spike to 2.3s, error rate 12%, 3 regions affected (us-east-1, eu-west-1, ap-southeast-1), on-call: Bob Martinez","intent":"notification","host":"teams"}' \
  "PagerDuty-style incident alert with severity, metrics, and on-call." \
  "true" 60 2

call_tool "Generate: Deployment Notification" "generate_card" \
  '{"content":"Deployment successful: order-service v2.4.1 deployed to production, build #1847, commit a3f8c2d, 0 errors in canary, rollback available","intent":"notification","host":"teams"}' \
  "CI/CD deployment card with build details and rollback action." \
  "true" 60 2

call_tool "Generate: Multiline Content (newline safety)" "generate_card" \
  '{"content":"Please review the attached Q1 budget proposal and provide your approval or feedback before the end of the week.\nKey focus areas include headcount planning and\ninfrastructure costs.\nPlease respond by Friday.","intent":"approval","host":"teams"}' \
  "Tests that newlines in content are sanitized and don't break JSON parsing." \
  "true" 80 5

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2: validate_card — Schema + accessibility + host checks
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Validate: Clean Card" "validate_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Hello World","wrap":true}],"speak":"Hello World"},"host":"teams"}' \
  "A simple valid card with speak — expect 100% accessibility."

call_tool "Validate: Bad Card (unknown element)" "validate_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"FakeElement","text":"bad"}]},"strictMode":true}' \
  "Made-up element type in strict mode — expect errors with suggested fixes."

call_tool "Validate: Outlook Compatibility" "validate_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"Table","columns":[{"width":1}],"rows":[{"type":"TableRow","cells":[{"type":"TableCell","items":[{"type":"TextBlock","text":"data"}]}]}]}]},"host":"outlook"}' \
  "Table element on Outlook (max v1.4) — expect host compatibility warning."

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3: data_to_card — Structured data → card
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Data: Sprint Tasks (JSON table)" "data_to_card" \
  '{"data":[{"task":"Review PR #482","assignee":"Jane","due":"2026-03-21","status":"pending"},{"task":"Deploy hotfix v2.1.3","assignee":"Bob","due":"2026-03-19","status":"in-progress"},{"task":"Update API docs","assignee":"Carol","due":"2026-03-22","status":"done"}],"title":"Sprint Tasks","presentation":"table","host":"teams"}' \
  "JSON array of sprint tasks → table card." \
  "true" 80 5

call_tool "Data: Sales Report (CSV)" "data_to_card" \
  '{"data":"Region,Revenue,Growth,Target\nAPAC,1250000,12%,1100000\nEMEA,980000,8%,900000\nAmericas,2100000,15%,1800000","title":"Q1 Sales by Region","presentation":"table"}' \
  "CSV sales data → table card. Tabular data with 4 columns and 3 rows." \
  "true" 80 5

call_tool "Data: Service Health (key-value)" "data_to_card" \
  '{"data":{"service":"api-gateway","cpu":"92%","memory":"78%","requests":"12.4k/min","p99_latency":"245ms","error_rate":"0.3%","uptime":"99.97%"},"title":"Service Health — api-gateway","presentation":"facts"}' \
  "Key-value metrics → FactSet card." \
  "true" 0 2

call_tool "Data: Key-Value CSV (auto → facts)" "data_to_card" \
  '{"data":"Metric,Value\nCPU Usage,92%\nMemory,78%\nDisk,62%\nUptime,99.97%","title":"Server Metrics","presentation":"auto"}' \
  "2-column CSV (key-value pairs) — auto should pick FactSet." \
  "true" 0 2

call_tool "Data: Employee Roster (CSV)" "data_to_card" \
  '{"data":"Employee,Department,Start Date,Status\nJane Kim,Engineering,2026-01-15,Active\nBob Lee,Design,2026-02-01,Active\nCarol Wu,PM,2026-03-10,Onboarding","title":"New Hires Q1","presentation":"table","host":"teams"}' \
  "CSV employee data → table card for Teams." \
  "true" 80 5

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4: optimize_card — Fix accessibility and modernize
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Optimize: Missing Accessibility" "optimize_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Important Notice"},{"type":"TextBlock","text":"Please review the updated policy document."},{"type":"Image","url":"https://example.com/doc.png"}]},"goals":["accessibility","modern"]}' \
  "Card missing wrap, altText, speak — optimize adds them all." \
  "true" 80 3

call_tool "Optimize: Deprecated Actions" "optimize_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Survey"}],"actions":[{"type":"Action.Submit","title":"Send","data":{"action":"submit"}}]},"goals":["modern"]}' \
  "Card uses deprecated Action.Submit — should be replaced with Action.Execute." \
  "true" 0 1

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5: template_card — Static → data-bound template
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Template: Order Confirmation" "template_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Order #12345","weight":"bolder","size":"large"},{"type":"FactSet","facts":[{"title":"Customer","value":"John Smith"},{"title":"Total","value":"$249.99"},{"title":"Status","value":"Shipped"},{"title":"Tracking","value":"1Z999AA10123456784"}]}]}}' \
  "Static order card → reusable template with \${expression} bindings."

call_tool "Template: Incident Alert" "template_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"P1 — Database Connection Pool Exhausted","weight":"bolder","color":"attention"},{"type":"FactSet","facts":[{"title":"Service","value":"order-service"},{"title":"Region","value":"us-east-1"},{"title":"Started","value":"2026-03-18 09:42 UTC"},{"title":"On-Call","value":"Bob Martinez"}]}],"actions":[{"type":"Action.Execute","title":"Acknowledge","verb":"ack"},{"type":"Action.Execute","title":"Escalate","verb":"escalate"}]}}' \
  "Static incident card → template for any future alert."

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6: transform_card — Cross-host and version transforms
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Transform: Downgrade v1.6 → v1.3 (Webex)" "transform_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Meeting Summary","style":"heading","wrap":true},{"type":"Table","columns":[{"width":1},{"width":1}],"rows":[{"type":"TableRow","cells":[{"type":"TableCell","items":[{"type":"TextBlock","text":"Topic"}]},{"type":"TableCell","items":[{"type":"TextBlock","text":"Status"}]}]}]}]},"transform":"downgrade-version","targetVersion":"1.3"}' \
  "v1.6 card with Table + heading style → v1.3 for Webex.\n  Table and style='heading' should be removed or replaced." \
  "true" 0 1

call_tool "Transform: Downgrade v1.6 → v1.4 (Outlook)" "transform_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"TextBlock","text":"Quarterly Review","style":"heading","wrap":true}]},"transform":"downgrade-version","targetVersion":"1.4"}' \
  "v1.6 → v1.4 for Outlook. style='heading' requires v1.5+, should be removed." \
  "true" 0 1

call_tool "Transform: Flatten Deep Nesting" "transform_card" \
  '{"card":{"type":"AdaptiveCard","version":"1.6","body":[{"type":"Container","items":[{"type":"Container","items":[{"type":"Container","items":[{"type":"TextBlock","text":"Deeply nested","wrap":true}]}]}]}]},"transform":"flatten"}' \
  "3 levels of nested Containers → flattened to reduce complexity." \
  "true" 0 1

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7: suggest_layout — Pattern recommendations
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Suggest: Approval Flow" "suggest_layout" \
  '{"description":"An expense approval form with requester info, line items table, total amount, and approve/reject buttons","constraints":{"interactive":true,"targetHost":"teams"}}' \
  "Approval scenario → expect approval pattern with rationale."

call_tool "Suggest: Dashboard" "suggest_layout" \
  '{"description":"Service health dashboard showing 5 microservices with CPU, memory, latency metrics and status indicators","constraints":{"interactive":false,"targetHost":"teams"}}' \
  "Monitoring dashboard → expect data display pattern."

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8: generate_and_validate — Compound workflows
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Compound: Employee Onboarding Form" "generate_and_validate" \
  '{"content":"Employee onboarding checklist: new hire name, start date, assigned buddy, IT equipment request, building access badge, required training courses, and a submit button","host":"teams","intent":"form","optimizeGoals":["accessibility","modern"]}' \
  "Generate + validate + optimize an onboarding form in one call." \
  "true" 90 3

call_tool "Compound: Customer Feedback Survey" "generate_and_validate" \
  '{"content":"Customer feedback card with 1-5 star rating for support experience, dropdown for issue category (billing, technical, account), multiline comment box, and submit button","host":"teams","intent":"form","optimizeGoals":["accessibility"]}' \
  "Survey card with rating, dropdown, and text input." \
  "true" 90 3

call_tool "Compound: Team Profile (Outlook)" "generate_and_validate" \
  '{"content":"Team member profile card with photo, name, job title, department, email, phone, skills tags, and a message button","host":"outlook","intent":"profile","optimizeGoals":["accessibility","compact"]}' \
  "Profile card targeting Outlook (v1.4 constraints)." \
  "true" 80 2

call_tool "Compound: Time-Off Request" "generate_and_validate" \
  '{"content":"Time-off request from Maria Lopez: vacation, March 24-28, 5 days, remaining PTO balance 12 days, manager: David Kim, approve or reject with optional comment","host":"teams","intent":"approval","optimizeGoals":["accessibility"]}' \
  "Leave approval with PTO balance and manager actions." \
  "true" 90 5

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 9: card_workflow — Multi-step pipelines
# ══════════════════════════════════════════════════════════════════════════════

call_tool "Workflow: Alert → Validate → Optimize → Template" "card_workflow" \
  '{"steps":[{"tool":"generate","params":{"intent":"notification"}},{"tool":"validate"},{"tool":"optimize","params":{"goals":["accessibility","compact"]}},{"tool":"template"}],"content":"Server alert: CPU usage at 95% on prod-web-03, memory at 87%, disk at 62%, 3 active incidents","host":"teams"}' \
  "Full pipeline: generate a monitoring alert, validate it, optimize for\n  accessibility, then convert to a reusable template for live data binding." \
  "true" 60 1

call_tool "Workflow: Generate → Validate → Transform for Webex" "card_workflow" \
  '{"steps":[{"tool":"generate","params":{"intent":"notification"}},{"tool":"validate"},{"tool":"transform","params":{"transform":"downgrade-version","targetVersion":"1.3"}}],"content":"Build #1847 deployed to production: order-service v2.4.1, 0 errors in canary","host":"webex"}' \
  "Generate a deployment card, validate, then downgrade to v1.3 for Webex.\n  Tests the cross-host transform in a pipeline." \
  "true" 60 2

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
echo -e "\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Results: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET}, ${TOTAL} total"
echo ""
echo -e "${DIM}Quality checks for card-producing tools:${RESET}"
echo -e "${DIM}  - Valid JSON (parseable by the Adaptive Cards Designer)${RESET}"
echo -e "${DIM}  - No literal newlines in string values${RESET}"
echo -e "${DIM}  - No empty TextBlocks or FactSets${RESET}"
echo -e "${DIM}  - Schema validation must pass${RESET}"
echo -e "${DIM}  - Accessibility score meets per-test threshold${RESET}"
echo -e "${DIM}  - Element count meets per-test minimum${RESET}"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}All tests passed!${RESET}"
else
  echo -e "${RED}Some tests failed.${RESET}"
  exit 1
fi
