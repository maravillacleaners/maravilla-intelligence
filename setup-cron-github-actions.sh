#!/bin/bash

# ============================================================================
# Agent Cron Setup Script — GitHub Actions Configuration
# ============================================================================
# This script configures GitHub Actions secrets for autonomous agent cron jobs
# Requires: gh CLI installed and authenticated
# ============================================================================

set -e

echo "=================================================="
echo "Agent Cron Setup — GitHub Actions"
echo "=================================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ ERROR: GitHub CLI (gh) is not installed"
    echo "   Install from: https://cli.github.com"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ ERROR: Not authenticated to GitHub"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# ============================================================================
# Step 1: Verify workflow files exist
# ============================================================================
echo "[1/4] Verifying workflow files..."

workflows=(
    ".github/workflows/agents-discovery-cron.yml"
    ".github/workflows/agents-enrichment-cron.yml"
    ".github/workflows/agents-contacts-cron.yml"
)

for workflow in "${workflows[@]}"; do
    if [ -f "$workflow" ]; then
        echo "  ✅ $workflow"
    else
        echo "  ❌ Missing: $workflow"
        exit 1
    fi
done

echo ""

# ============================================================================
# Step 2: Get user input for secrets
# ============================================================================
echo "[2/4] Configuring GitHub Secrets..."
echo ""

# API_BASE_URL
read -p "Enter API_BASE_URL (default: http://72.61.92.220:3002): " api_base_url
api_base_url=${api_base_url:-"http://72.61.92.220:3002"}

# API_JWT_TOKEN
read -p "Enter API_JWT_TOKEN (paste your JWT token): " api_jwt_token
if [ -z "$api_jwt_token" ]; then
    echo "❌ API_JWT_TOKEN cannot be empty"
    exit 1
fi

# SLACK_WEBHOOK_OPS
read -p "Enter SLACK_WEBHOOK_OPS (optional, press Enter to skip): " slack_webhook
if [ -z "$slack_webhook" ]; then
    slack_webhook="https://hooks.slack.com/services/PLACEHOLDER"
fi

echo ""

# ============================================================================
# Step 3: Set secrets in GitHub
# ============================================================================
echo "[3/4] Creating GitHub secrets..."
echo ""

gh secret set API_BASE_URL --body "$api_base_url" && echo "  ✅ API_BASE_URL set" || echo "  ❌ Failed to set API_BASE_URL"
gh secret set API_JWT_TOKEN --body "$api_jwt_token" && echo "  ✅ API_JWT_TOKEN set" || echo "  ❌ Failed to set API_JWT_TOKEN"
gh secret set SLACK_WEBHOOK_OPS --body "$slack_webhook" && echo "  ✅ SLACK_WEBHOOK_OPS set" || echo "  ❌ Failed to set SLACK_WEBHOOK_OPS"

echo ""

# ============================================================================
# Step 4: Verify secrets created
# ============================================================================
echo "[4/4] Verifying secrets..."
echo ""

gh secret list | grep -E "API_BASE_URL|API_JWT_TOKEN|SLACK_WEBHOOK_OPS" | while read -r line; do
    secret_name=$(echo "$line" | awk '{print $1}')
    echo "  ✅ $secret_name"
done

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Cron jobs configured:"
echo ""
echo "  1. SAM Discovery Agent"
echo "     Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)"
echo "     Endpoint: POST /api/agents/sam-discovery"
echo "     Records per run: 100"
echo "     Daily executions: 4"
echo ""
echo "  2. Company Enrichment Agent"
echo "     Schedule: Every 1 hour (00:00-23:00 UTC)"
echo "     Endpoint: POST /api/agents/enrich-company"
echo "     Records per run: 50"
echo "     Daily executions: 24"
echo ""
echo "  3. Contact Discovery Agent"
echo "     Schedule: Every 2 hours (00:00, 02:00, 04:00... UTC)"
echo "     Endpoint: POST /api/agents/discover-contacts"
echo "     Records per run: 200"
echo "     Daily executions: 12"
echo ""
echo "=================================================="
echo "Total Daily Executions: 40 autonomous agent runs"
echo "=================================================="
echo ""
echo "Monitor at: https://github.com/maravillacleaners/maravilla-intelligence/actions"
echo ""
echo "To test manually:"
echo ""
echo "  curl -X POST \\"
echo "    -H \"Authorization: Bearer \$API_JWT_TOKEN\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"source\": \"sam\", \"limit\": 100}' \\"
echo "    $api_base_url/api/agents/sam-discovery"
echo ""
