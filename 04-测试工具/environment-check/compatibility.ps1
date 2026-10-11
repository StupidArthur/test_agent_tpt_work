param(
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [string]$ModuleRoot
)
$ErrorActionPreference='Stop'
$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$results=@()
foreach ($name in @('powershell.exe','pwsh.exe')) {
    $cmd=Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) { $results += @{host=$name;status='not_available';validated=$false}; continue }
    $args=@('-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'check.ps1'),'-EnvironmentId',('compatibility-'+$name),'-OutputDirectory',$OutputDirectory)
    if ($ModuleRoot) { $args += @('-ModuleRoot',$ModuleRoot) }
    $probeOutput=@(& $cmd.Source @args 2>&1)
    $exit=$LASTEXITCODE
    $raw=($probeOutput | ForEach-Object { [string]$_ }) -join "`n"
    $attempt=Join-Path $OutputDirectory ($name+'-'+[Guid]::NewGuid().ToString('N')+'.attempt.txt')
    [IO.File]::WriteAllText($attempt,$raw,(New-Object Text.UTF8Encoding($false)))
    $summary=$null
    try { $summary=$raw | ConvertFrom-Json } catch {}
    $results += @{host=$name;path=$cmd.Source;status=$(if($exit -eq 0 -and $summary){'passed'}else{'failed'});validated=($exit -eq 0 -and $null -ne $summary);exit_code=$exit;summary=$summary;attempt=$attempt}
}
$path=Join-Path $OutputDirectory ('compatibility-'+[Guid]::NewGuid().ToString('N')+'.json')
[IO.File]::WriteAllText($path,($results | ConvertTo-Json -Depth 12),(New-Object Text.UTF8Encoding($false)))
@{results=$results;report=$path;scope='Only this machine and the installed host versions; absent hosts are unverified'} | ConvertTo-Json -Depth 12
if (@($results | Where-Object {$_.status -eq 'failed'}).Count) { exit 2 }
