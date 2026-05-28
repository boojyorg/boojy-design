#!/usr/bin/env bash
set -euo pipefail

# =========================================================================
# 🧠 MEMORY FUNCTION: Incident Telemetry Logger
# =========================================================================
log_failure_to_dreams() {
    local phase="$1"
    local file="$2"
    local error_log="$3"
    
    touch dreams.md
    
    # Strip out messy terminal ANSI colors and isolate the top 8 lines of the trace
    local clean_log
    clean_log=$(echo "$error_log" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,3})*)?[mGK]//g" | head -n 8)

    # Construct the markdown checkbox block
    local incident_block
    incident_block=$(cat << EOF
- [ ] **Fix $phase Failure in \`$file\`**
  \`\`\`text
  $clean_log
  \`\`\`
EOF
)

    # Inject the payload right beneath the automated header marker to preserve manual notes
    if grep -q "### 🚨 Automated Engine Incident Logs" dreams.md; then
        echo "$incident_block" > .incident_block.tmp
        awk '
            /### 🚨 Automated Engine Incident Logs/ {
                print
                while ((getline line < ".incident_block.tmp") > 0) print line
                close(".incident_block.tmp")
                next
            }
            { print }
        ' dreams.md > .dreams.tmp && mv .dreams.tmp dreams.md
        rm -f .incident_block.tmp
    else
        echo -e "\n### 🚨 Automated Engine Incident Logs\n$incident_block" >> dreams.md
    fi
}

# =========================================================================
# ⚙️ PROGRAM ENTRY: Input Initialization & File Validation Filtering
# =========================================================================
JSON_INPUT=$(cat)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    echo "========================================="
    echo "⚙️  Auto-Validation Gate: Checking $FILE_PATH"
    echo "========================================="

    # ---------------------------------------------------------------------
    # Gate 1: Biome Code Formatting & Style Rule Verification
    # ---------------------------------------------------------------------
    echo "▶️ Running Biome formatting & lint check..."
    if ! pnpm exec biome check --write "$FILE_PATH" > .biome_errors.log 2>&1; then
        echo "❌ Validation Failed: Biome linting errors found." >&2
        log_failure_to_dreams "Biome Linter" "$FILE_PATH" "$(cat .biome_errors.log)"
        rm -f .biome_errors.log
        exit 1
    fi
    rm -f .biome_errors.log

    # ---------------------------------------------------------------------
    # Gate 2: Strict Project Graph TypeScript Typechecking
    # ---------------------------------------------------------------------
    echo "▶️ Running strict TypeScript compilation check..."
    if ! pnpm typecheck > .ts_errors.log 2>&1; then
        echo "❌ Validation Failed: TypeScript compilation exceptions found." >&2
        log_failure_to_dreams "TypeScript Typecheck" "$FILE_PATH" "$(cat .ts_errors.log)"
        rm -f .ts_errors.log
        exit 1
    fi
    rm -f .ts_errors.log

    # ---------------------------------------------------------------------
    # Gate 3: Vitest Targeted Dependency Graph Regression Suite
    # ---------------------------------------------------------------------
    echo "▶️ Executing related Vitest suite..."
    if ! pnpm exec vitest related "$FILE_PATH" --run --passWithNoTests > .test_errors.log 2>&1; then
        echo "❌ Validation Failed: Dependent unit tests failed." >&2
        log_failure_to_dreams "Vitest Related Suite" "$FILE_PATH" "$(cat .test_errors.log)"
        rm -f .test_errors.log
        exit 1
    fi
    rm -f .test_errors.log

    echo "✅ Validation Passed: Types verified, tests green, layout formatted."
fi

exit 0