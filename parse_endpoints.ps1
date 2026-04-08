$src = 'testlab-backend/src'
$controllerFiles = Get-ChildItem $src -Recurse -File -Filter *.controller.ts
$serviceFiles = Get-ChildItem $src -Recurse -File -Filter *.service.ts

$moduleMap = Get-ChildItem $src -Directory | ForEach-Object {
  $top = $_.Name
  $ctrl = ($controllerFiles | Where-Object { $_.FullName -match [regex]::Escape("\\$top\\") }).Count
  $svc  = ($serviceFiles   | Where-Object { $_.FullName -match [regex]::Escape("\\$top\\") }).Count
  [PSCustomObject]@{ Folder = $top; Controllers = $ctrl; Services = $svc }
}

$rows = foreach ($file in $controllerFiles) {
  $lines = Get-Content $file.FullName
  $text = $lines -join "`n"
  $controllerBase = ''

  $cm = [regex]::Match($text, '@Controller\(([^)]*)\)')
  if ($cm.Success) {
    $arg = $cm.Groups[1].Value.Trim()
    if ($arg -match "^['\"`](?<v>[^'\"`]*)['\"`]$") { $controllerBase = $Matches['v'] }
    elseif ($arg -match "path\s*:\s*['\"`](?<v>[^'\"`]*)['\"`]") { $controllerBase = $Matches['v'] }
  }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $m = [regex]::Match($line, '@(Get|Post|Put|Patch|Delete)\s*(?:\(([^)]*)\))?')
    if (-not $m.Success) { continue }

    $method = $m.Groups[1].Value.ToUpper()
    $arg = $m.Groups[2].Value.Trim()
    $route = ''
    if ($arg) {
      if ($arg -match "^['\"`](?<v>[^'\"`]*)['\"`]$") { $route = $Matches['v'] }
      elseif ($arg -match "path\s*:\s*['\"`](?<v>[^'\"`]*)['\"`]") { $route = $Matches['v'] }
    }

    $handler = ''
    for ($j = $i + 1; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
      $sig = [regex]::Match($lines[$j], '^\s*(?:public|private|protected|async|static|readonly|\s)*(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(')
      if ($sig.Success) { $handler = $sig.Groups['name'].Value; break }
    }

    $parts = @()
    if ($controllerBase.Trim('/')) { $parts += $controllerBase.Trim('/') }
    if ($route.Trim('/')) { $parts += $route.Trim('/') }
    $full = '/' + ($parts -join '/')
    $full = $full -replace '/+', '/'

    [PSCustomObject]@{
      METHOD = $method
      FULL_PATH = $full
      HANDLER = $handler
      FILE = $file.FullName.Replace((Get-Location).Path + '\\', '')
      LINE = $i + 1
    }
  }
}

'METHOD | FULL_PATH | HANDLER | FILE | LINE'
$rows | Sort-Object FILE, LINE | ForEach-Object {
  "{0} | {1} | {2} | {3} | {4}" -f $_.METHOD, $_.FULL_PATH, $_.HANDLER, $_.FILE, $_.LINE
}
''
'MODULE MAP'
'FOLDER | CONTROLLERS | SERVICES'
$moduleMap | Sort-Object Folder | ForEach-Object {
  "{0} | {1} | {2}" -f $_.Folder, $_.Controllers, $_.Services
}
