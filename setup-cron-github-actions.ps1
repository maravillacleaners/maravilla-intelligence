# ============================================================================
# Agent Cron Setup Script — GitHub Actions Configuration (PowerShell)
# ============================================================================
# This script configures GitHub Actions secrets for autonomous agent cron jobs
# Requires: GitHub CLI (gh) installed and authenticated
# Usage: .\setup-cron-github-actions.ps1
# ============================================================================

param(
    [string]$ApiBaseUrl = "http://72.61.92.220:3002",
    [string]$ApiJwtToken = "",
    [string]$SlackWebhook = ""
)

function Test-GhCli {
    try {
        $output = gh auth status 2>&1
        return $true
    }
    catch {
        return $false
    }
}

function Test-WorkflowFiles {
    $workflows = @(
        ".github/workflows/agents-discovery-cron.yml",
        ".github/workflows/agents-enrichment-cron.yml",
        ".github/workflows/agents-contacts-cron.yml"
    )

    foreach ($workflow in $workflows) {
        if (Test-Path $workflow) {
            Write-Host "  ✅ $workflow"
        }
        else {
            Write-Host "  ❌ Missing: $workflow"
            return $false
        }
    }
    return $true
}

function Set-GitHubSecrets {
    param(
        [string]$ApiBaseUrl,
        [string]$ApiJwtToken,
        [string]$SlackWebhook
    )

    Write-Host "[3/4] Creating GitHub secrets..."
    Write-Host ""

    try {
        gh secret set API_BASE_URL --body $ApiBaseUrl
        Write-Host "  ✅ API_BASE_URL set"
    }
    catch {
        Write-Host "  ❌ Failed to set API_BASE_URL: $_"
        return $false
    }

    try {
        gh secret set API_JWT_TOKEN --body $ApiJwtToken
        Write-Host "  ✅ API_JWT_TOKEN set"
    }
    catch {
        Write-Host "  ❌ Failed to set API_JWT_TOKEN: $_"
        return $false
    }

    try {
        gh secret set SLACK_WEBHOOK_OPS --body $SlackWebhook
        Write-Host "  ✅ SLACK_WEBHOOK_OPS set"
    }
    catch {
        Write-Host "  ❌ Failed to set SLACK_WEBHOOK_OPS: $_"
        return $false
    }

    return $true
}

function Show-Summary {
    param(
        [string]$ApiBaseUrl
    )

    Write-Host ""
    Write-Host "=================================================="
    Write-Host "✅ Setup Complete!"
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "Cron jobs configured:"
    Write-Host ""
    Write-Host "  1. SAM Discovery Agent"
    Write-Host "     Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)"
    Write-Host "     Endpoint: POST /api/agents/sam-discovery"
    Write-Host "     Records per run: 100"
    Write-Host "     Daily executions: 4"
    Write-Host ""
    Write-Host "  2. Company Enrichment Agent"
    Write-Host "     Schedule: Every 1 hour (00:00-23:00 UTC)"
    Write-Host "     Endpoint: POST /api/agents/enrich-company"
    Write-Host "     Records per run: 50"
    Write-Host "     Daily executions: 24"
    Write-Host ""
    Write-Host "  3. Contact Discovery Agent"
    Write-Host "     Schedule: Every 2 hours (00:00, 02:00, 04:00... UTC)"
    Write-Host "     Endpoint: POST /api/agents/discover-contacts"
    Write-Host "     Records per run: 200"
    Write-Host "     Daily executions: 12"
    Write-Host ""
    Write-Host "=================================================="
    Write-Host "Total Daily Executions: 40 autonomous agent runs"
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "Monitor at: https://github.com/maravillacleaners/maravilla-intelligence/actions"
    Write-Host ""
    Write-Host "To test manually:"
    Write-Host ""
    Write-Host "  curl -X POST \"
    Write-Host "    -H 'Authorization: Bearer `$API_JWT_TOKEN' \"
    Write-Host "    -H 'Content-Type: application/json' \"
    Write-Host "    -d '{""source"": ""sam"", ""limit"": 100}' \"
    Write-Host "    $ApiBaseUrl/api/agents/sam-discovery"
    Write-Host ""
}

# Main script execution

Write-Host "=================================================="
Write-Host "Agent Cron Setup — GitHub Actions"
Write-Host "=================================================="
Write-Host ""

# Step 1: Check GitHub CLI
Write-Host "[1/4] Checking GitHub CLI..."
if (-not (Test-GhCli)) {
    Write-Host "  ❌ GitHub CLI not authenticated"
    Write-Host "     Run: gh auth login"
    exit 1
}
Write-Host "  ✅ GitHub CLI authenticated"
Write-Host ""

# Step 2: Verify workflows
Write-Host "[2/4] Verifying workflow files..."
if (-not (Test-WorkflowFiles)) {
    exit 1
}
Write-Host ""

# Step 3: Get user input if not provided
if ([string]::IsNullOrEmpty($ApiJwtToken)) {
    $ApiJwtToken = Read-Host "Enter API_JWT_TOKEN (paste your JWT token)"
    if ([string]::IsNullOrEmpty($ApiJwtToken)) {
        Write-Host "❌ API_JWT_TOKEN cannot be empty"
        exit 1
    }
}

if ([string]::IsNullOrEmpty($SlackWebhook)) {
    $SlackWebhook = Read-Host "Enter SLACK_WEBHOOK_OPS (optional, press Enter to skip)"
    if ([string]::IsNullOrEmpty($SlackWebhook)) {
        $SlackWebhook = "https://hooks.slack.com/services/PLACEHOLDER"
    }
}

Write-Host ""

# Step 4: Set secrets
if (-not (Set-GitHubSecrets -ApiBaseUrl $ApiBaseUrl -ApiJwtToken $ApiJwtToken -SlackWebhook $SlackWebhook)) {
    exit 1
}

# Step 5: Verify secrets
Write-Host "[4/4] Verifying secrets..."
Write-Host ""

$secrets = gh secret list | Select-String "API_BASE_URL|API_JWT_TOKEN|SLACK_WEBHOOK_OPS"
foreach ($line in $secrets) {
    $secretName = ($line -split '\s+')[0]
    Write-Host "  ✅ $secretName"
}

# Show summary
Show-Summary -ApiBaseUrl $ApiBaseUrl
