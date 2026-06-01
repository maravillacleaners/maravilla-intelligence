# Script to replace hardcoded credentials with env vars
# Run: powershell -ExecutionPolicy Bypass -File replace-credentials.ps1

$files = @(
  "app\api\awards\route.ts",
  "app\api\companies\[id]\route.ts",
  "app\api\contracts\[id]\route.ts",
  "app\api\docs\upload\route.ts",
  "app\api\email\analyze\route.ts",
  "app\api\entity-meta\route.ts",
  "app\api\onboarding\route.ts",
  "app\api\opportunities\route.ts",
  "app\api\opportunities\[id]\route.ts",
  "app\api\outreach\contacts\route.ts",
  "app\api\price-intel\route.ts",
  "app\api\search\route.ts",
  "app\api\subs\route.ts",
  "app\api\sequences\route.ts",
  "app\api\v1\awards\route.ts"
)

$base = "C:\Users\Rosan\maravilla-intelligence"

foreach ($file in $files) {
  $path = Join-Path $base $file
  if (-not (Test-Path $path)) {
    Write-Host "❌ Not found: $path"
    continue
  }

  $content = Get-Content $path -Raw

  # Add import if not already present
  if ($content -notmatch "import.*credentials.*from.*credentials") {
    $content = "import { credentials, airtableTables } from '@/app/lib/credentials'`n" + $content
  }

  # Replace hardcoded keys
  $content = $content -replace "process\.env\.AIRTABLE_API_KEY \|\| 'pat99rdlH[^']*'", "credentials.airtableApiKey"
  $content = $content -replace "'pat99rdlH[^']*'", "credentials.airtableApiKey"
  $content = $content -replace "process\.env\.AIRTABLE_BASE_ID \|\| 'appZhXnyFi[^']*'", "credentials.airtableBaseId"
  $content = $content -replace "'appZhXnyFi[^']*'", "credentials.airtableBaseId"

  # Replace table IDs with airtableTables
  $content = $content -replace "'tbldTDb1v79dVNCTQ'", "airtableTables.opportunities"
  $content = $content -replace "'tbl3qWHqunA0eERE2'", "airtableTables.intelligence"

  Set-Content $path $content -NoNewline
  Write-Host "✅ Updated: $file"
}

Write-Host "✅ Done!"
