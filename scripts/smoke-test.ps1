param([string]$BaseUrl = 'http://localhost:5173', [switch]$CheckRestart)
$ErrorActionPreference = 'Stop'
$checks = 0
function Assert-That($Condition, [string]$Name) {
    if (-not $Condition) { throw "FAIL: $Name" }
    $script:checks++
    Write-Output "PASS: $Name"
}
function Send-Json([string]$Method, [string]$Path, $Body, [int]$Expected) {
    $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; SkipHttpErrorCheck = $true }
    if ($null -ne $Body) { $params.Body = $Body | ConvertTo-Json -Depth 30 -Compress; $params.ContentType = 'application/json' }
    $result = Invoke-WebRequest @params
    Assert-That ($result.StatusCode -eq $Expected) "$Method $Path -> $Expected"
    if ($result.Content) { return ($result.Content | ConvertFrom-Json) }
}
$health = Invoke-RestMethod "$BaseUrl/api/health"
Assert-That ($health.database -eq 'connected') 'Frontend proxy reaches backend and PostgreSQL'
Assert-That ((Invoke-WebRequest $BaseUrl).StatusCode -eq 200) 'React frontend is served'
$payload = @{
    title = 'Automated smoke test'; targetRole = 'Project Manager'
    document = @{
        contact = @{ fullName = 'Synthetic Test Candidate'; email = 'test@example.com'; phone = ''; location = 'Test City'; linkedIn = ''; website = '' }
        summary = ''; experience = @(@{ jobTitle = 'Coordinator'; company = 'Test Company'; location = ''; startDate = '2024'; endDate = ''; isCurrent = $true; description = 'Maintained project plans.' })
        education = @(); certifications = @(); skills = @('Planning'); projects = @(); achievements = @()
    }
}
$created = $null
try {
    # Capture helpers' PASS messages separately from their JSON return.
    $created = (Send-Json POST '/api/resumes' $payload 201 | Where-Object { $_ -isnot [string] })
    $id = $created.id
    Assert-That ([bool]$id) 'Create returns a resume ID'
    $loaded = (Send-Json GET "/api/resumes/$id" $null 200 | Where-Object { $_ -isnot [string] })
    Assert-That ($loaded.document.contact.fullName -eq 'Synthetic Test Candidate') 'Nested document persisted'
    $payload.title = 'Updated smoke test'
    $payload.document.summary = 'Coordinated project delivery.'
    $updated = (Send-Json PUT "/api/resumes/$id" $payload 200 | Where-Object { $_ -isnot [string] })
    Assert-That ($updated.title -eq 'Updated smoke test') 'Update reflected in response'
    $listed = Invoke-RestMethod "$BaseUrl/api/resumes"
    Assert-That ($id -in $listed.id) 'List includes saved resume'
    if ($health.aiMode -eq 'demo') {
        foreach ($action in @('summary','experience','review','skills')) {
            $body = @{ action = $action; targetRole = 'Scrum Master'; document = $payload.document; experienceIndex = 0 }
            $ai = (Send-Json POST '/api/ai/improve' $body 200 | Where-Object { $_ -isnot [string] })
            Assert-That ($ai.isSimulated -eq $true) "$action simulation is labeled"
        }
    } else { Write-Output 'SKIP: real AI calls require a separate intentional live test.' }
    $invalid = @{ title = ' '; targetRole = 'Manager'; document = $payload.document }
    Send-Json POST '/api/resumes' $invalid 400 | Out-Null
    $invalid = @{ title = 'Invalid'; targetRole = 'Manager'; document = @{ contact = $null } }
    Send-Json POST '/api/resumes' $invalid 400 | Out-Null
    Send-Json GET '/api/resumes/00000000-0000-0000-0000-000000000001' $null 404 | Out-Null
    if ($CheckRestart) {
        Push-Location (Split-Path $PSScriptRoot -Parent)
        try { docker compose restart db backend | Out-Host; if ($LASTEXITCODE -ne 0) { throw 'Restart failed' } } finally { Pop-Location }
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            try { $ready = (Invoke-RestMethod "$BaseUrl/api/health").status -eq 'ready' } catch { $ready = $false }
            if ($ready) { break }; Start-Sleep -Seconds 2
        }
        Assert-That $ready 'Services recover after restart'
        $after = Invoke-RestMethod "$BaseUrl/api/resumes/$id"
        Assert-That ($after.document.summary -eq 'Coordinated project delivery.') 'PostgreSQL draft survives restart'
    }
} finally {
    if ($created.id) { Invoke-WebRequest "$BaseUrl/api/resumes/$($created.id)" -Method Delete | Out-Null }
}
if ($created.id) { Send-Json GET "/api/resumes/$($created.id)" $null 404 | Out-Null }
Write-Output "All $checks Docker integration checks passed. Synthetic test draft removed."
