#!/usr/bin/env bash
set -euo pipefail

REPO="${1:?Usage: $0 <owner/repo> <pr_number>}"
PR_NUMBER="${2:?Usage: $0 <owner/repo> <pr_number>}"

# stdin から JSON を読み込み、event フィールドを除去してから投稿
INPUT=$(cat)

PAYLOAD=$(echo "$INPUT" | jq 'del(.event) | .comments //= [] | .comments |= map(del(.event))')

RESPONSE=$(echo "$PAYLOAD" | gh api \
  "repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
  --method POST \
  --input -)

STATE=$(echo "$RESPONSE" | jq -r '.state')

if [ "$STATE" != "PENDING" ]; then
  echo "ERROR: Expected state PENDING, got ${STATE}" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

REVIEW_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Pending review created."
echo "https://github.com/${REPO}/pull/${PR_NUMBER}#pullrequestreview-${REVIEW_ID}"
