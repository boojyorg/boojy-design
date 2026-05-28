#!/usr/bin/env bash
set -euo pipefail

JSON_INPUT=$(cat)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    echo "========================================="
    echo "⚙️  Auto-Validation Gate: Checking $FILE_PATH"
    echo "========================================="

    echo "▶️ Running Biome formatting & lint check..."
    if ! pnpm exec biome check --write "$FILE_PATH"; then
        echo "❌ Validation Failed: Biome linting errors found." >&2
        exit 1
    fi

    echo "▶️ Running strict TypeScript compilation check..."
    if ! pnpm typecheck; then
        echo "❌ Validation Failed: TypeScript compilation exceptions found." >&2
        exit 1
    fi

    echo "▶️ Executing related Vitest suite..."
    if ! pnpm exec vitest related "$FILE_PATH" --run --passWithNoTests; then
        echo "❌ Validation Failed: Dependent unit tests failed." >&2
        exit 1
    fi

    echo "✅ Validation Passed: Types verified, tests green, layout formatted."
fi

exit 0
