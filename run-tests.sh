#!/usr/bin/env bash
# The one entry point for the whole suite: the branch-guard hook runs this
# before every push, and ci.yml has no other step.
set -euo pipefail
cd "$(dirname "$0")"

echo "🐚 Shell tests"
./.claude/hooks/tests/branch-guard-test.sh

# The backend and frontend arrive in later milestones; until then each stage
# is skipped rather than failing a checkout that has nothing to test yet.
if [[ -f go.mod ]]; then
  if ! command -v go >/dev/null 2>&1; then
    echo "❌ go not found — see README 'Development'" >&2
    exit 1
  fi

  echo "🎨 gofmt"
  unformatted="$(git ls-files --cached --others --exclude-standard -- '*.go' | xargs -r gofmt -l)"
  if [[ -n "$unformatted" ]]; then
    echo "❌ Not gofmt-formatted:" >&2
    echo "$unformatted" >&2
    exit 1
  fi

  if [[ -f sqlc.yaml ]]; then
    echo "🗄️  sqlc"
    go tool sqlc diff
  fi

  echo "🔍 go vet"
  go vet ./...

  echo "🧪 Go tests"
  go test ./...
fi

if [[ -f web/package.json ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm not found — see README 'Development'" >&2
    exit 1
  fi

  echo "📦 npm ci"
  (cd web && npm ci --no-audit --no-fund)

  echo "🔍 Lint & types"
  (cd web && npm run lint && npx tsc --noEmit -p tsconfig.app.json)

  echo "🧪 Frontend tests"
  (cd web && npx vitest run --passWithNoTests)

  echo "🏗️  Frontend build"
  (cd web && npm run build)
fi

echo "✅ All tests passed"
