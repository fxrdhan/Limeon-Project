#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository." >&2
  exit 1
fi

echo "== git status --porcelain =="
git status --porcelain

echo
echo "== unstaged diff --stat =="
git diff --stat || true

echo
echo "== staged diff --stat =="
git diff --cached --stat || true

echo
echo "== changed files by top-level path =="
git diff --name-only | awk -F/ '{print $1}' | sort | uniq -c | sort -nr || true
