param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ProjectId,
  [string]$OutputDir = "$(Join-Path $env:USERPROFILE 'Desktop\TestLab-Document-Tests')"
)

$ErrorActionPreference = "Stop"
$results = @()

function Add-Result {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Details
  )

  $script:results += [pscustomobject]@{
    Test    = $Name
    Status  = if ($Passed) { "PASS" } else { "FAIL" }
    Details = $Details
  }
}

function Test-FileSignature {
  param(
    [string]$Path,
    [string]$ExpectedType
  )

  if (!(Test-Path $Path)) { return $false }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 4) { return $false }

  switch ($ExpectedType) {
    "pdf" {
      return ($bytes[0] -eq 0x25 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x44 -and $bytes[3] -eq 0x46)
    }
    "zip" {
      return ($bytes[0] -eq 0x50 -and $bytes[1] -eq 0x4B)
    }
    default {
      return $true
    }
  }
}

function Invoke-DocumentDownload {
  param(
    [string]$Name,
    [string]$Url,
    [string]$FileName,
    [string]$ExpectedSignature
  )

  try {
    $target = Join-Path $OutputDir $FileName
    Invoke-WebRequest -Method Get -Uri $Url -OutFile $target | Out-Null

    $file = Get-Item $target
    $signatureOk = Test-FileSignature -Path $target -ExpectedType $ExpectedSignature

    if ($file.Length -gt 0 -and $signatureOk) {
      Add-Result -Name $Name -Passed $true -Details "Saved to $target ($($file.Length) bytes)"
    }
    else {
      Add-Result -Name $Name -Passed $false -Details "Invalid or empty file at $target"
    }
  }
  catch {
    Add-Result -Name $Name -Passed $false -Details $_.Exception.Message
  }
}

Write-Host "=== TestLab Document Generation Test Runner ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"

if (!(Test-Path $OutputDir)) {
  New-Item -Path $OutputDir -ItemType Directory | Out-Null
}

$uri = [System.Uri]$BaseUrl
$portOpen = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue
if (-not $portOpen.TcpTestSucceeded) {
  Add-Result -Name "Backend running on port $($uri.Port)" -Passed $false -Details "Cannot connect to $BaseUrl"

  $altPort = if ($uri.Port -eq 3000) { 5000 } else { 3000 }
  $altOpen = Test-NetConnection -ComputerName $uri.Host -Port $altPort -WarningAction SilentlyContinue
  if ($altOpen.TcpTestSucceeded) {
    Write-Host "Hint: Port $altPort is open. Your backend default is often 5000 unless APP_PORT is set." -ForegroundColor Yellow
  }

  $results | Format-Table -AutoSize
  exit 1
}
Add-Result -Name "Backend running on port $($uri.Port)" -Passed $true -Details "Connection successful"

$projectsUrl = "$BaseUrl/api/projects"
$projects = $null
try {
  $projectsResponse = Invoke-RestMethod -Method Get -Uri $projectsUrl
  if ($projectsResponse -is [System.Array]) {
    $projects = $projectsResponse
  }
  elseif ($null -ne $projectsResponse.data -and $projectsResponse.data -is [System.Array]) {
    $projects = $projectsResponse.data
  }
  else {
    $projects = @()
  }

  Add-Result -Name "GET /api/projects" -Passed $true -Details "Returned $($projects.Count) project(s)"
}
catch {
  Add-Result -Name "GET /api/projects" -Passed $false -Details $_.Exception.Message
  $results | Format-Table -AutoSize
  exit 1
}

Write-Host ""
Write-Host "Available projects:" -ForegroundColor Cyan
if ($projects.Count -gt 0) {
  $projects | Select-Object id, name, status | Format-Table -AutoSize
}
else {
  Write-Host "No projects returned by API." -ForegroundColor Yellow
}

if (-not $ProjectId) {
  if ($projects.Count -gt 0) {
    $ProjectId = $projects[0].id
    Write-Host "Using first project id: $ProjectId" -ForegroundColor Yellow
  }
  else {
    Add-Result -Name "Project selection" -Passed $false -Details "No project available. Create one first."
    $results | Format-Table -AutoSize
    exit 1
  }
}

$downloads = @(
  @{ Name = "GET /api/documents/projects/:projectId/cahier/pdf";   Path = "/api/documents/projects/$ProjectId/cahier/pdf";   File = "cahier-recette-$ProjectId.pdf"; Signature = "pdf" },
  @{ Name = "GET /api/documents/projects/:projectId/cahier/word";  Path = "/api/documents/projects/$ProjectId/cahier/word";  File = "cahier-recette-$ProjectId.docx"; Signature = "zip" },
  @{ Name = "GET /api/documents/projects/:projectId/cahier/excel"; Path = "/api/documents/projects/$ProjectId/cahier/excel"; File = "cahier-recette-$ProjectId.xlsx"; Signature = "zip" },
  @{ Name = "GET /api/documents/projects/:projectId/fsd/pdf";      Path = "/api/documents/projects/$ProjectId/fsd/pdf";      File = "fsd-$ProjectId.pdf"; Signature = "pdf" },
  @{ Name = "GET /api/documents/projects/:projectId/fsd/word";     Path = "/api/documents/projects/$ProjectId/fsd/word";     File = "fsd-$ProjectId.docx"; Signature = "zip" }
)

foreach ($item in $downloads) {
  Invoke-DocumentDownload -Name $item.Name -Url "$BaseUrl$($item.Path)" -FileName $item.File -ExpectedSignature $item.Signature
}

try {
  $templates = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/documents/templates"
  $count = if ($templates -is [System.Array]) { $templates.Count } elseif ($null -ne $templates.data -and $templates.data -is [System.Array]) { $templates.data.Count } else { 1 }
  Add-Result -Name "GET /api/documents/templates" -Passed $true -Details "Response received (count estimate: $count)"

  $templates | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $OutputDir "templates-response.json") -Encoding utf8
}
catch {
  Add-Result -Name "GET /api/documents/templates" -Passed $false -Details $_.Exception.Message
}

try {
  $versions = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/documents/versions/$ProjectId"
  $vcount = if ($versions -is [System.Array]) { $versions.Count } elseif ($null -ne $versions.data -and $versions.data -is [System.Array]) { $versions.data.Count } else { 1 }
  Add-Result -Name "GET /api/documents/versions/:projectId" -Passed $true -Details "Response received (count estimate: $vcount)"

  $versions | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $OutputDir "versions-$ProjectId.json") -Encoding utf8
}
catch {
  Add-Result -Name "GET /api/documents/versions/:projectId" -Passed $false -Details $_.Exception.Message
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq "FAIL" }).Count
if ($failed -gt 0) {
  Write-Host ""
  Write-Host "Completed with $failed failing test(s)." -ForegroundColor Red
  Write-Host "Output folder: $OutputDir" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "All tests passed." -ForegroundColor Green
Write-Host "Output folder: $OutputDir" -ForegroundColor Green
exit 0
