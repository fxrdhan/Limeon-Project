#!/bin/bash

# Auto PR Creation & Approval Script
# Usage: ./auto-pr.sh "PR Title" "PR Description"

CREATOR="fxrdhan"
APPROVER="muhraffibr"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Auto PR Workflow ===${NC}"
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "⚠️  You're on main branch. Please create a feature branch first."
    exit 1
fi

# Step 1: Create PR with creator account
echo ""
echo -e "${BLUE}Step 1: Creating PR with account $CREATOR${NC}"
gh auth switch -u $CREATOR > /dev/null 2>&1

# Create PR
PR_TITLE="${1:-Test PR}"
PR_BODY="${2:-Automated PR for testing}"

PR_URL=$(gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head $CURRENT_BRANCH 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create PR"
    echo "$PR_URL"
    exit 1
fi

# Extract PR number from URL
PR_NUMBER=$(echo "$PR_URL" | grep -oP 'pull/\K\d+')

echo -e "${GREEN}✓ PR #$PR_NUMBER created${NC}"
echo "  URL: $PR_URL"

# Small delay to ensure PR is fully created
sleep 2

# Step 2: Approve PR with approver account
echo ""
echo -e "${BLUE}Step 2: Approving PR #$PR_NUMBER with account $APPROVER${NC}"
gh auth switch -u $APPROVER > /dev/null 2>&1

# Approve PR
APPROVAL_RESULT=$(gh pr review $PR_NUMBER --approve -b "LGTM! Auto-approved ✅" 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to approve PR"
    echo "$APPROVAL_RESULT"
    exit 1
fi

echo -e "${GREEN}✓ PR #$PR_NUMBER approved${NC}"

# Switch back to creator account
gh auth switch -u $CREATOR > /dev/null 2>&1

echo ""
echo -e "${GREEN}=== Workflow Complete! ===${NC}"
echo "PR #$PR_NUMBER created and approved successfully"
echo "View PR: $PR_URL"
