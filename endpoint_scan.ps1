$src = 'testlab-backend/src'
$controllerFiles = Get-ChildItem -Path $src -Recurse -File -Filter '*.controller.ts'
$serviceFiles = Get-ChildItem -Path $src -Recurse -File -Filter '*.service.ts'

$rows = @()
foreach ($file in $controllerFiles) {
  $lines = Get-Content -Path $file.FullName
  $text = $lines -join "`n"
  $base = ''

  if ($text -match '@Controller\(\s*["'']([^"'']*)["'']\s*\)') {
    $base = $matches[1]
  }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '@(Get|Post|Put|Patch|Delete)\s*(?:\(\s*["'']?([^"''\)]*)["'']?\s*\))?') {
      $method = $matches[1].ToUpper()
      $route = $matches[2]
      if (-not $route) { $route = '' }

      $handler = ''
      for ($j = $i + 1; $j -lt [Math]::Min($i + 12, $lines.Count); $j++) {
        if ($lines[$j] -match '^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(') {
          $handler = $matches[1]
          break
        }
      }

      $parts = @()
      if ($base.Trim('/')) { $parts += $base.Trim('/') }
      if ($route.Trim('/')) { $parts += $route.Trim('/') }
      $full = '/' + ($parts -join '/')
      $full = $full -replace '/+', '/'

      $rows += [PSCustomObject]@{
        METHOD = $method
        FULL_PATH = $full
        HANDLER = $handler
        FILE = $file.FullName.Replace((Get-Location).Path + '\\', '')
        LINE = $i + 1
      }
    }
  }
}

$moduleRows = Get-ChildItem -Path $src -Directory | ForEach-Object {
  $top = $_.Name
  $pattern = [regex]::Escape([IO.Path]::DirectorySeparatorChar + $top + [IO.Path]::DirectorySeparatorChar)
  $ctrlCount = ($controllerFiles | Where-Object { $_.FullName -match $pattern }).Count
  $svcCount = ($serviceFiles | Where-Object { $_.FullName -match $pattern }).Count
  [PSCustomObject]@{ Folder = $top; Controllers = $ctrlCount; Services = $svcCount }
}

'METHOD | FULL_PATH | HANDLER | FILE | LINE'
$rows | Sort-Object FILE, LINE | ForEach-Object {
  "{0} | {1} | {2} | {3} | {4}" -f $_.METHOD, $_.FULL_PATH, $_.HANDLER, $_.FILE, $_.LINE
}
''
'MODULE MAP'
'FOLDER | CONTROLLERS | SERVICES'
$moduleRows | Sort-Object Folder | ForEach-Object {
  "{0} | {1} | {2}" -f $_.Folder, $_.Controllers, $_.Services
}
