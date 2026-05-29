# Airtable Field Creation - Fix Failed Fields
# Creates 9 missing fields with corrected JSON payloads

$apiKey = "pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92"
$baseId = "appZhXnyFiKbnOZLr"
$suppliersTableId = "tbl7NYtv13vA377a1"
$intelligenceTableId = "tbl3qWHqunA0eERE2"

$headers = @{
    Authorization = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Helper function to create field via API
function Create-AirtableField {
    param(
        [string]$TableId,
        [string]$FieldName,
        [string]$FieldType,
        [hashtable]$Options
    )

    $uri = "https://api.airtable.com/v0/meta/bases/$baseId/tables/$TableId/fields"

    # Build request body manually for complex JSON
    if ($Options) {
        $body = @{
            name = $FieldName
            type = $FieldType
            options = $Options
        } | ConvertTo-Json -Depth 10 -Compress
    } else {
        $body = @{
            name = $FieldName
            type = $FieldType
        } | ConvertTo-Json -Compress
    }

    Write-Host "Creating field: $FieldName ($FieldType) on table $TableId"
    Write-Host "Payload: $body"

    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "✓ Created: $FieldName (Status: $($response.StatusCode))" -ForegroundColor Green
        Start-Sleep -Milliseconds 200
        return $true
    } catch {
        $errorMsg = $_.Exception.Response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Host "✗ Failed: $FieldName - $($errorMsg.error.message)" -ForegroundColor Red
        Write-Host "Response: $($_.Exception.Message)"
        Start-Sleep -Milliseconds 200
        return $false
    }
}

# Track results
$successful = 0
$failed = 0

Write-Host "`n📋 Creating 9 Missing Airtable Fields" -ForegroundColor Cyan
Write-Host "=" * 70

# SUPPLIERS TABLE FIELDS

# 1. services_offered (multipleSelect)
$options = @{
    choices = @(
        @{ name = "Janitorial" },
        @{ name = "Landscaping" },
        @{ name = "HVAC" },
        @{ name = "Painting" },
        @{ name = "Construction" },
        @{ name = "Plumbing" },
        @{ name = "Electrical" }
    )
}
if (Create-AirtableField -TableId $suppliersTableId -FieldName "services_offered" -FieldType "multipleSelect" -Options $options) {
    $successful++
} else {
    $failed++
}

# 2. registration_date
if (Create-AirtableField -TableId $suppliersTableId -FieldName "registration_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# 3. last_activity_date
if (Create-AirtableField -TableId $suppliersTableId -FieldName "last_activity_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# 4. availability_start_date
if (Create-AirtableField -TableId $suppliersTableId -FieldName "availability_start_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# INTELLIGENCE TABLE FIELDS

# 5. agency (singleLineText)
if (Create-AirtableField -TableId $intelligenceTableId -FieldName "agency" -FieldType "singleLineText") {
    $successful++
} else {
    $failed++
}

# 6. award_date
if (Create-AirtableField -TableId $intelligenceTableId -FieldName "award_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# 7. discovery_date
if (Create-AirtableField -TableId $intelligenceTableId -FieldName "discovery_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# 8. next_review_date
if (Create-AirtableField -TableId $intelligenceTableId -FieldName "next_review_date" -FieldType "date") {
    $successful++
} else {
    $failed++
}

# 9. notes (multilineText)
if (Create-AirtableField -TableId $intelligenceTableId -FieldName "notes" -FieldType "multilineText") {
    $successful++
} else {
    $failed++
}

Write-Host "=" * 70
Write-Host "`n✅ Complete: $successful fields created, $failed failed`n"
