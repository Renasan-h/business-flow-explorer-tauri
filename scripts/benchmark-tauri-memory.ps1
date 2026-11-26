param(
  [Parameter(Mandatory=$true)][int]$PidOfApp,
  [string]$OutputDir = "benchmark-memory",
  [int[]]$ScenarioCounts = @(1, 5, 10, 20, 50, 75, 100),
  [int[]]$LineTargets = @(50, 200, 500, 1000),
  [int]$Samples = 5,
  [int]$IntervalMs = 400
)
$ErrorActionPreference = "Stop"
if ($Samples -lt 1 -or $IntervalMs -lt 0) { throw "Samples must be >= 1 and IntervalMs >= 0" }
if (-not (Get-Process -Id $PidOfApp -ErrorAction SilentlyContinue)) { throw "App PID $PidOfApp not found" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$results = [System.Collections.Generic.List[object]]::new()

function Get-TreeMemory([int]$RootPid) {
  # Windows WebView2の子・孫プロセスを含めたWorking Set合計を算出する。
  # 子プロセスが複数アプリで共有される場合は重複計上の可能性がある。
  $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate)
  $root = $all | Where-Object ProcessId -eq $RootPid | Select-Object -First 1
  if (-not $root) { throw "App PID $RootPid exited during measurement" }
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($RootPid)
  $pending = [System.Collections.Generic.Queue[int]]::new()
  $pending.Enqueue($RootPid)
  while ($pending.Count -gt 0) {
    $parent = $pending.Dequeue()
    foreach ($child in $all) {
      if ($child.ParentProcessId -eq $parent -and -not $ids.Contains([int]$child.ProcessId) -and $child.CreationDate -ge $root.CreationDate) {
        [void]$ids.Add([int]$child.ProcessId)
        $pending.Enqueue([int]$child.ProcessId)
      }
    }
  }
  $total = [long]0
  foreach ($id in $ids) {
    $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($proc) { $total += [long]$proc.WorkingSet64 }
  }
  return [pscustomobject]@{ Bytes = $total; ProcessCount = $ids.Count }
}

Write-Host "Tauri app process tree (PID $PidOfApp) Working Set measurement"
Write-Host "For each condition, load the requested number of scenarios in the running Tauri app."
Write-Host "The script cannot automatically verify the loaded count; confirm it before pressing Enter."
foreach ($line in $LineTargets) {
  foreach ($count in $ScenarioCounts) {
    Write-Host ""
    Read-Host "Load $count scenarios (~$line YAML lines EACH), wait for UI to settle, then press Enter"
    $readings = @()
    $processCounts = @()
    for ($i = 0; $i -lt $Samples; $i++) {
      $sample = Get-TreeMemory $PidOfApp
      $readings += [double]$sample.Bytes / 1MB
      $processCounts += $sample.ProcessCount
      if ($i -lt $Samples - 1) { Start-Sleep -Milliseconds $IntervalMs }
    }
    $sorted = @($readings | Sort-Object)
    $median = $sorted[[int][math]::Floor(($sorted.Count - 1) / 2)]
    $results.Add([pscustomobject]@{
      scenarioCount = $count
      targetLinesPerScenario = $line
      workingSetMiB = [math]::Round($median, 2)
      minMiB = [math]::Round(($readings | Measure-Object -Minimum).Minimum, 2)
      maxMiB = [math]::Round(($readings | Measure-Object -Maximum).Maximum, 2)
      processCount = ($processCounts | Measure-Object -Maximum).Maximum
      verifiedLoadedCount = $false
    })
    Write-Host "Total process-tree Working Set: $([math]::Round($median,2)) MiB"
  }
}
$csv = Join-Path $OutputDir "memory-results.csv"
$results | Export-Csv -Path $csv -Encoding utf8 -NoTypeInformation
$maxY = [math]::Max(1, (($results | Measure-Object -Property workingSetMiB -Maximum).Maximum * 1.15))
$width = 1080; $height = 650; $left = 90; $top = 75; $plotW = 890; $plotH = 450
$colors = @("#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2")
$svg = [System.Collections.Generic.List[string]]::new()
$svg.Add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 650">')
$svg.Add('<rect width="1080" height="650" fill="white"/>')
$svg.Add('<text x="90" y="36" font-size="22" font-weight="bold">Tauri app + child processes: Working Set</text>')
for ($i = 0; $i -le 5; $i++) {
  $value = $maxY * $i / 5
  $y = $top + $plotH - $value / $maxY * $plotH
  $svg.Add("<line x1='$left' y1='$y' x2='$($left+$plotW)' y2='$y' stroke='#e2e8f0'/>")
  $svg.Add("<text x='$($left-10)' y='$($y+5)' text-anchor='end' font-size='13'>$([math]::Round($value))</text>")
}
for ($i = 0; $i -lt $ScenarioCounts.Count; $i++) {
  $x = $left + ($ScenarioCounts[$i] - 1) / 99 * $plotW
  $svg.Add("<text x='$x' y='$($top+$plotH+24)' text-anchor='middle' font-size='13'>$($ScenarioCounts[$i])</text>")
}
for ($i = 0; $i -lt $LineTargets.Count; $i++) {
  $line = $LineTargets[$i]
  $color = $colors[$i % $colors.Count]
  $series = @($results | Where-Object targetLinesPerScenario -eq $line | Sort-Object scenarioCount)
  $points = @($series | ForEach-Object {
    $x = $left + ($_.scenarioCount - 1) / 99 * $plotW
    $y = $top + $plotH - $_.workingSetMiB / $maxY * $plotH
    "$x,$y"
  }) -join " "
  $svg.Add("<polyline points='$points' stroke='$color' stroke-width='3' fill='none'/>")
  $svg.Add("<text x='$($left+$i*220)' y='600' font-size='14' fill='$color'>~$line lines/scenario</text>")
}
$svg.Add('<text x="530" y="567" text-anchor="middle" font-size="14">Loaded scenarios (operator-confirmed)</text>')
$svg.Add('<text x="20" y="300" text-anchor="middle" font-size="14" transform="rotate(-90 20 300)">Working Set (MiB)</text>')
$svg.Add('<text x="90" y="630" font-size="12" fill="#64748b">Windows process-tree Working Set; includes child WebView2 processes, not system-wide GPU memory.</text>')
$svg.Add('</svg>')
$svg -join "`n" | Set-Content -Path (Join-Path $OutputDir "memory-chart.svg") -Encoding utf8
Write-Host "Saved $csv and $(Join-Path $OutputDir 'memory-chart.svg')"
