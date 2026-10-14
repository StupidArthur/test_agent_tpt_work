# Bootstrap from the first interactive OpenCode on the master Windows PC.
param(
  [Parameter(Mandatory=$true)][string]$Config,
  [int]$Port = 4097,
  [string]$OpenCode = "opencode"
)
$ErrorActionPreference = "Stop"
if (-not $env:OPENCODE_SERVER_PASSWORD) {
  throw "OPENCODE_SERVER_PASSWORD must be set in this login session."
}
$cfgPath = (Resolve-Path -LiteralPath $Config).Path
$cfg = Get-Content -LiteralPath $cfgPath -Raw -Encoding utf8 | ConvertFrom-Json
if ($cfg.master_server -ne "http://127.0.0.1:$Port") {
  throw "master_server must match http://127.0.0.1:$Port"
}
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchdog = Join-Path $scriptDir "watchdog.py"
$root = Split-Path -Parent $cfgPath
if (-not [IO.Path]::IsPathRooted($cfg.project_dir)) {
  $cfg.project_dir = Join-Path $root $cfg.project_dir
}
# occtl prioritizes OCCTL_PASSWORD; bind it to this newly started server.
$env:OCCTL_PASSWORD = $env:OPENCODE_SERVER_PASSWORD
$runtime = if ([IO.Path]::IsPathRooted($cfg.runtime_dir)) { $cfg.runtime_dir } elseif ($cfg.runtime_dir) {
  Join-Path $root $cfg.runtime_dir
} else { Join-Path $root ".ocautopilot" }
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$serverOptions = @{
  FilePath = $OpenCode
  ArgumentList = @("serve", "--hostname", "127.0.0.1", "--port", "$Port")
  WorkingDirectory = $cfg.project_dir
  PassThru = $true
  WindowStyle = "Hidden"
  RedirectStandardOutput = (Join-Path $runtime "master-server.out.log")
  RedirectStandardError = (Join-Path $runtime "master-server.err.log")
}
$server = Start-Process @serverOptions
$ctl = $cfg.occtl
if (-not [IO.Path]::IsPathRooted($ctl)) { $ctl = Join-Path $root $ctl }
$healthy = $false
$pythonExe = (& py -3.11 -c "import sys;print(sys.executable)" | Select-Object -Last 1)
if (-not $pythonExe) { throw "Python 3.11 is required" }
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 400
  if ($server.HasExited) { throw "Master server exited; inspect logs." }
  & $pythonExe $ctl --server "http://127.0.0.1:$Port" --json info *> $null
  if ($LASTEXITCODE -eq 0) { $healthy = $true; break }
}
if (-not $healthy) { throw "Master server did not become healthy; inspect logs." }
$stateFile = Join-Path $runtime "watchdog.json"
if (-not (Test-Path -LiteralPath $stateFile)) {
  & $pythonExe $watchdog --config $cfgPath init
  if ($LASTEXITCODE -ne 0) { throw "Initialization ambiguous; inspect remote sessions before retry." }
}
$watchdogOptions = @{
  FilePath = $pythonExe
  ArgumentList = @('"' + $watchdog + '"', "--config", '"' + $cfgPath + '"', "run")
  WorkingDirectory = $cfg.project_dir
  PassThru = $true
  WindowStyle = "Hidden"
  RedirectStandardOutput = (Join-Path $runtime "watchdog.out.log")
  RedirectStandardError = (Join-Path $runtime "watchdog.err.log")
}
$wd = Start-Process @watchdogOptions
Write-Host "Master server PID: $($server.Id); watchdog PID: $($wd.Id)"
Write-Host "Runtime: $runtime"
Write-Host "Register independently supervised startup tasks for restart after logoff/reboot."
