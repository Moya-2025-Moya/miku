#!/bin/bash
# ScreenRead · Miku — quick start
# Usage: ANTHROPIC_API_KEY=sk-ant-... bash start.sh

set -e
cd "$(dirname "$0")"

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌  Set ANTHROPIC_API_KEY first:"
  echo "    export ANTHROPIC_API_KEY=sk-ant-..."
  exit 1
fi

echo "📦  Installing dependencies…"
pip install -q anthropic fastapi uvicorn

echo "🚀  Starting Miku server on http://127.0.0.1:8000"
echo "    Then open sage.html in Chrome."
echo ""
python server.py
