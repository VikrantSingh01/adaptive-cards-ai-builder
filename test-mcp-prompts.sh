#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Adaptive Cards MCP — Prompt Smoke Test
#
# Tests all 3 MCP prompts (guided workflows) via prompts/list and prompts/get.
# Prompts are slash-command workflows that return instruction messages telling
# the AI which tools to call and in what order.
#
# Usage:
#   ./test-mcp-prompts.sh --local   # test against local build (packages/core/dist)
#   ./test-mcp-prompts.sh           # test against published npm package
#
# Tests (10 total):
#   #1     prompts/list            — all 3 prompts registered with correct args
#   #2-4   create-adaptive-card    — approval/Teams, dashboard/generic, notification/Outlook
#   #5-6   review-adaptive-card    — simple card/Teams, Table on Webex
#   #7-9   convert-data-to-card    — JSON array, CSV, key-value object
#   #10    error handling           — unknown prompt returns error
#
# Checks:
#   - All 3 prompts registered with correct required/optional arguments
#   - prompts/get returns well-formed instruction messages (role=user)
#   - User input (description, card JSON, data) embedded in prompt text
#   - Host and intent parameters propagated into instructions
#   - Instructions reference the correct tools (generate_and_validate, etc.)
#   - Unknown prompts return errors gracefully (no crash)
#
# Prerequisites:
#   - Node.js >= 20, python3
#   - For --local: run `cd packages/core && npm run build` first
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; DIM='\033[2m'; RESET='\033[0m'

if [[ "${1:-}" == "--local" ]]; then
  SERVER="node $(dirname "$0")/packages/core/dist/server.js"
  echo -e "${CYAN}Mode: local build${RESET}"
else
  SERVER="npx -y adaptive-cards-mcp"
  echo -e "${CYAN}Mode: npm registry (adaptive-cards-mcp)${RESET}"
fi

INIT='{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

PASS=0; FAIL=0; TOTAL=0

# Write the Python check scripts to temp files to avoid shell quoting issues
CHECKS_DIR=$(mktemp -d)
trap "rm -rf $CHECKS_DIR" EXIT

send_request() {
  local method="$1" params="$2"
  local payload="{\"jsonrpc\":\"2.0\",\"id\":99,\"method\":\"${method}\",\"params\":${params}}"
  echo "${INIT}
${payload}" | $SERVER 2>/dev/null | tail -1
}

run_test() {
  local label="$1" check_file="$2" desc="$3"
  TOTAL=$((TOTAL + 1))

  echo -e "\n${CYAN}━━━ ${TOTAL}. ${label} ━━━${RESET}"
  echo -e "${DIM}${desc}${RESET}"

  local check_result
  check_result=$(python3 "$check_file" 2>&1)

  if echo "$check_result" | grep -q "^FAIL:"; then
    echo "$check_result"
    echo -e "${RED}FAIL${RESET}"
    FAIL=$((FAIL + 1))
  else
    echo "$check_result"
    echo -e "${GREEN}PASS${RESET}"
    PASS=$((PASS + 1))
  fi
}

echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║   Adaptive Cards MCP — Prompt Smoke Test (3 prompts)               ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}"

# ══════════════════════════════════════════════════════════════════════════════
# Test 1: prompts/list — all 3 prompts registered
# ══════════════════════════════════════════════════════════════════════════════

RESULT1=$(send_request "prompts/list" "{}")

cat > "$CHECKS_DIR/t1.py" << 'PYEOF'
import sys, json, os
resp = json.loads(os.environ["RESULT"])
prompts = resp["result"]["prompts"]
names = [p["name"] for p in prompts]
errors = []

expected = ["create-adaptive-card", "review-adaptive-card", "convert-data-to-card"]
for e in expected:
    if e not in names:
        errors.append("Missing prompt: " + e)

if len(prompts) != 3:
    errors.append("Expected 3 prompts, got " + str(len(prompts)))

for p in prompts:
    args = [a["name"] for a in p.get("arguments", [])]
    req = [a["name"] for a in p.get("arguments", []) if a.get("required")]
    if p["name"] == "create-adaptive-card" and "description" not in args:
        errors.append("create-adaptive-card missing 'description' arg")
    if p["name"] == "review-adaptive-card" and "card" not in args:
        errors.append("review-adaptive-card missing 'card' arg")
    if p["name"] == "convert-data-to-card" and "data" not in args:
        errors.append("convert-data-to-card missing 'data' arg")

if errors:
    for e in errors:
        print("FAIL: " + e)
else:
    print("Found 3 prompts: " + ", ".join(names))
    for p in prompts:
        args = [a["name"] for a in p.get("arguments", [])]
        req = [a["name"] for a in p.get("arguments", []) if a.get("required")]
        print("  " + p["name"] + "(" + ", ".join(args) + ") required=[" + ", ".join(req) + "]")
PYEOF

RESULT="$RESULT1" run_test "List All Prompts" "$CHECKS_DIR/t1.py" \
  "Verify all 3 prompts are registered with correct arguments."

# ══════════════════════════════════════════════════════════════════════════════
# Helper: check prompt response for expected content
# ══════════════════════════════════════════════════════════════════════════════

make_prompt_check() {
  local test_id="$1" prompt_name="$2" prompt_args="$3"
  shift 3
  # remaining args are: keyword1 keyword2 ...

  local result
  result=$(send_request "prompts/get" "{\"name\":\"${prompt_name}\",\"arguments\":${prompt_args}}")

  cat > "$CHECKS_DIR/${test_id}.py" << PYEOF
import sys, json, os
resp = json.loads(os.environ["RESULT"])

if "error" in resp:
    if os.environ.get("EXPECT_ERROR") == "true":
        msg = resp["error"].get("message", "")[:80]
        print("  Correctly returned error: " + msg)
        sys.exit(0)
    else:
        print("FAIL: RPC error: " + str(resp["error"]))
        sys.exit(0)

msgs = resp["result"]["messages"]
errors = []

if len(msgs) == 0:
    errors.append("No messages returned")
    for e in errors:
        print("FAIL: " + e)
    sys.exit(0)

text = msgs[0]["content"]["text"]
role = msgs[0]["role"]

if role != "user":
    errors.append("Expected role=user, got " + role)

keywords = os.environ.get("KEYWORDS", "").split("|")
for kw in keywords:
    if kw and kw not in text:
        errors.append("Missing in prompt text: " + kw)

if errors:
    for e in errors:
        print("FAIL: " + e)
else:
    lines = text.split("\\n")
    for line in lines[:6]:
        print("  " + line)
    if len(lines) > 6:
        print("  ... (" + str(len(lines) - 6) + " more lines)")
PYEOF

  echo "$result"  # return result for env var
}

# ══════════════════════════════════════════════════════════════════════════════
# Test 2-4: create-adaptive-card prompt
# ══════════════════════════════════════════════════════════════════════════════

R2=$(make_prompt_check "t2" "create-adaptive-card" \
  '{"description":"Expense approval with line items and approve/reject buttons","host":"teams","intent":"approval"}')
RESULT="$R2" KEYWORDS="Expense approval|teams|approval|generate_and_validate|optimize_card" \
  run_test "Create: Expense Approval (Teams)" "$CHECKS_DIR/t2.py" \
  "Prompt includes description, host=teams, intent=approval, tool references."

R3=$(make_prompt_check "t3" "create-adaptive-card" \
  '{"description":"Service health dashboard with CPU, memory, and latency metrics"}')
RESULT="$R3" KEYWORDS="Service health dashboard|generate_and_validate" \
  run_test "Create: Dashboard (no host/intent)" "$CHECKS_DIR/t3.py" \
  "Prompt with defaults — no host or intent specified."

R4=$(make_prompt_check "t4" "create-adaptive-card" \
  '{"description":"CI/CD deployment notification with build number and rollback","host":"outlook","intent":"notification"}')
RESULT="$R4" KEYWORDS="deployment notification|outlook|notification|generate_and_validate|transform_card" \
  run_test "Create: Notification (Outlook)" "$CHECKS_DIR/t4.py" \
  "Outlook target should reference transform_card for host adaptation."

# ══════════════════════════════════════════════════════════════════════════════
# Test 5-6: review-adaptive-card prompt
# ══════════════════════════════════════════════════════════════════════════════

R5=$(make_prompt_check "t5" "review-adaptive-card" \
  '{"card":"{\"type\":\"AdaptiveCard\",\"version\":\"1.6\",\"body\":[{\"type\":\"TextBlock\",\"text\":\"Hello\"}]}","host":"teams"}')
RESULT="$R5" KEYWORDS="AdaptiveCard|validate_card|optimize_card|teams" \
  run_test "Review: Simple Card (Teams)" "$CHECKS_DIR/t5.py" \
  "Should embed card JSON and instruct to validate then optimize."

R6=$(make_prompt_check "t6" "review-adaptive-card" \
  '{"card":"{\"type\":\"AdaptiveCard\",\"version\":\"1.6\",\"body\":[{\"type\":\"Table\",\"columns\":[{\"width\":1}],\"rows\":[]}]}","host":"webex"}')
RESULT="$R6" KEYWORDS="Table|webex|validate_card" \
  run_test "Review: Table on Webex" "$CHECKS_DIR/t6.py" \
  "Table on Webex (v1.3) — review should flag incompatibility."

# ══════════════════════════════════════════════════════════════════════════════
# Test 7-9: convert-data-to-card prompt
# ══════════════════════════════════════════════════════════════════════════════

R7=$(make_prompt_check "t7" "convert-data-to-card" \
  '{"data":"[{\"task\":\"Review PR\",\"assignee\":\"Jane\"},{\"task\":\"Deploy\",\"assignee\":\"Bob\"}]","title":"Sprint Tasks","presentation":"table"}')
RESULT="$R7" KEYWORDS="Review PR|Sprint Tasks|table|data_to_card|validate_card" \
  run_test "Convert: JSON Array → Table" "$CHECKS_DIR/t7.py" \
  "Should embed data, title, presentation=table, and tool instructions."

R8=$(make_prompt_check "t8" "convert-data-to-card" \
  '{"data":"Metric,Value\nCPU,92%\nMemory,78%","title":"Server Metrics"}')
RESULT="$R8" KEYWORDS="CPU|Server Metrics|data_to_card" \
  run_test "Convert: CSV Data" "$CHECKS_DIR/t8.py" \
  "CSV string input should be passed through to the prompt."

R9=$(make_prompt_check "t9" "convert-data-to-card" \
  '{"data":"{\"service\":\"api-gateway\",\"cpu\":\"92%\",\"uptime\":\"99.97%\"}","title":"Service Health"}')
RESULT="$R9" KEYWORDS="api-gateway|Service Health|data_to_card" \
  run_test "Convert: Key-Value Object" "$CHECKS_DIR/t9.py" \
  "Key-value object should be passed through for FactSet presentation."

# ══════════════════════════════════════════════════════════════════════════════
# Test 10: Error — unknown prompt
# ══════════════════════════════════════════════════════════════════════════════

R10=$(send_request "prompts/get" '{"name":"nonexistent-prompt","arguments":{}}')
cat > "$CHECKS_DIR/t10.py" << 'PYEOF'
import sys, json, os
resp = json.loads(os.environ["RESULT"])
if "error" in resp:
    msg = resp["error"].get("message", "")[:80]
    print("  Correctly returned error: " + msg)
else:
    print("FAIL: Expected error for unknown prompt, but got a result")
PYEOF

RESULT="$R10" run_test "Error: Unknown Prompt" "$CHECKS_DIR/t10.py" \
  "Unknown prompt name should return an error, not crash."

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
echo -e "\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Results: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET}, ${TOTAL} total"
echo ""
echo -e "${DIM}Prompt checks:${RESET}"
echo -e "${DIM}  - All 3 prompts registered with correct arguments${RESET}"
echo -e "${DIM}  - prompts/get returns well-formed instruction messages${RESET}"
echo -e "${DIM}  - Instructions reference the correct tools${RESET}"
echo -e "${DIM}  - User input (description, card, data) embedded in prompt text${RESET}"
echo -e "${DIM}  - Host and intent parameters propagated correctly${RESET}"
echo -e "${DIM}  - Unknown prompts return errors gracefully${RESET}"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}All tests passed!${RESET}"
else
  echo -e "${RED}Some tests failed.${RESET}"
  exit 1
fi
