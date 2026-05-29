#!/usr/bin/env bash
set -euo pipefail

# =========================================================================
# ⚙️ PostToolUse gate — runs on every .ts/.tsx edit.
# Biome auto-fix → typecheck → vitest related. On failure: print to stderr,
# exit non-zero. (Auto memory now owns learnings; this no longer writes dreams.md.)
# =========================================================================
JSON_INPUT=$(cat)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    echo "========================================="
    echo "⚙️  Auto-Validation Gate: Checking $FILE_PATH"
    echo "========================================="

    LOG=$(mktemp)
    trap 'rm -f "$LOG"' EXIT

    # ---------------------------------------------------------------------
    # Gate 1: Biome formatting & lint (auto-fix)
    # ---------------------------------------------------------------------
    echo "▶️ Running Biome formatting & lint check..."
    if ! pnpm exec biome check --write "$FILE_PATH" > "$LOG" 2>&1; then
        echo "❌ Validation Failed: Biome linting errors found." >&2
        cat "$LOG" >&2
        exit 1
    fi

    # ---------------------------------------------------------------------
    # Gate 2: Strict project-graph TypeScript typecheck
    # ---------------------------------------------------------------------
    echo "▶️ Running strict TypeScript compilation check..."
    if ! pnpm typecheck > "$LOG" 2>&1; then
        echo "❌ Validation Failed: TypeScript compilation errors found." >&2
        cat "$LOG" >&2
        exit 1
    fi

    # ---------------------------------------------------------------------
    # Gate 3: Vitest related regression suite
    # ---------------------------------------------------------------------
    echo "▶️ Executing related Vitest suite..."
    if ! pnpm exec vitest related "$FILE_PATH" --run --passWithNoTests > "$LOG" 2>&1; then
        echo "❌ Validation Failed: Dependent unit tests failed." >&2
        cat "$LOG" >&2
        exit 1
    fi

    echo "✅ Validation Passed: Types verified, tests green, layout formatted."
fi

exit 0
