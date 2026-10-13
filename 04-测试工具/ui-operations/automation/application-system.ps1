param([string]$RequestBase64)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
try {
 $req=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64))|ConvertFrom-Json
 $file=[IO.Path]::GetFullPath([string]$req.executablePath)
 if(-not [IO.File]::Exists($file)){throw 'Executable not found'}
 if([IO.Path]::GetExtension($file) -ine '.exe'){throw 'Windows executable .exe required'}
 $name=[IO.Path]::GetFileNameWithoutExtension($file)
 $matching=@();$unreadable=@()
 foreach($p in @(Get-Process -Name $name -ErrorAction SilentlyContinue)){
  try{if(-not $p.Path){throw 'Process path unavailable'};if($p.Path -ieq $file){$matching+=@{processId=$p.Id;path=$p.Path;processStartTimeUtc=$p.StartTime.ToUniversalTime().ToString('o');sessionId=$p.SessionId}}}catch{$unreadable+=$p.Id}
 }
 if($unreadable.Count){throw 'Cannot inspect existing process path; duplicate launch refused'}
 $listener=@()
 if($req.port){
  if(-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)){throw 'TCP owner inspection unavailable; cannot assert port is safe'}
  $listener=@(Get-NetTCPConnection -State Listen -ErrorAction Stop|Where-Object{$_.LocalPort -eq [int]$req.port}|ForEach-Object{@{address=$_.LocalAddress;port=$_.LocalPort;processId=$_.OwningProcess}})
 }
 if($req.mode -eq 'launch'){
  if($matching.Count){throw 'Existing matching process; duplicate launch refused'}
  if($listener.Count){throw 'Requested port is occupied; launch refused'}
  $appArguments=@($req.arguments|ForEach-Object{[string]$_})
  # Start-Process passes a command line, not an argv array. Reject ambiguous arguments
  # instead of silently changing the requested command. Typical Electron flags are safe.
  foreach($a in $appArguments){if($a.Length -eq 0 -or $a -match '[\s"\r\n\x00]'){throw 'Launch argument is empty or contains whitespace/quotes/NUL; use an explicit launcher fixture'}}
  $opts=@{FilePath=$file;WindowStyle='Normal';PassThru=$true}
  if($appArguments.Count){$opts.ArgumentList=$appArguments}
  $p=Start-Process @opts
  $matching=@(@{processId=$p.Id;path=$file;processStartTimeUtc=$p.StartTime.ToUniversalTime().ToString('o');sessionId=$p.SessionId})
 }
 @{status='ok';observations=@{executablePath=$file;processes=$matching;listeners=$listener;currentSessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId}}|ConvertTo-Json -Depth 8 -Compress
}catch{@{status='error';error=$_.Exception.Message}|ConvertTo-Json -Compress;exit 1}
