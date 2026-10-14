param([string]$RequestBase64)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
try{
 $req=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64))|ConvertFrom-Json
 $exe=[IO.Path]::GetFullPath([string]$req.executablePath)
 $target=Get-Process -Id ([int]$req.processId) -ErrorAction SilentlyContinue
 if(-not $target){
  $remaining=@(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue | Where-Object {$_.Path -ieq $exe} | ForEach-Object {$_.Id})
  @{status='ok';observations=@{exited=(-not $remaining.Count);alreadyExited=$true;before=@();after=@();remainingExecutablePids=$remaining;terminatedPids=@()}}|ConvertTo-Json -Depth 5 -Compress;exit 0
 }
 $session=[Diagnostics.Process]::GetCurrentProcess().SessionId
 if($target.Path -ine $exe -or $target.StartTime.ToUniversalTime().ToString('o') -cne [string]$req.expectedProcessStartTimeUtc -or $target.SessionId -ne $session){throw 'Application identity mismatch; no termination'}
 $snapshot=@(Get-CimInstance Win32_Process)
 $ids=New-Object 'System.Collections.Generic.HashSet[int]'
 [void]$ids.Add($target.Id)
 do{
  $added=$false
  foreach($row in $snapshot){if($ids.Contains([int]$row.ParentProcessId) -and -not $ids.Contains([int]$row.ProcessId) -and $row.CreationDate -ge $target.StartTime){[void]$ids.Add([int]$row.ProcessId);$added=$true}}
 }while($added)
 $before=@(foreach($idValue in $ids){$p=Get-Process -Id $idValue -ErrorAction SilentlyContinue;if($p){if($p.SessionId -ne $session){throw 'Descendant outside target desktop'};@{processId=$p.Id;path=$p.Path;processStartTimeUtc=$p.StartTime.ToUniversalTime().ToString('o')}}})
 $foreign=@(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $exe -and -not $ids.Contains($_.Id) })
 if($foreign.Count){throw 'Another instance of this executable exists; no termination'}
 $terminated=New-Object 'System.Collections.Generic.List[int]'
 # Stop root first so it cannot keep spawning replacement children.
 $ordered=@($before|Sort-Object @{Expression={if($_.processId -eq [int]$req.processId){0}else{1}}})
 foreach($row in $ordered){
  $p=Get-Process -Id $row.processId -ErrorAction SilentlyContinue
  if($p){
   if($p.Path -ine $row.path -or $p.StartTime.ToUniversalTime().ToString('o') -cne $row.processStartTimeUtc){throw 'Process identity changed; no further termination'}
   Stop-Process -Id $p.Id -Force -ErrorAction Stop
   $terminated.Add($row.processId)
  }
 }
 $deadline=[DateTime]::UtcNow.AddMilliseconds([int]$req.timeoutMs)
 do{
  $after=@(foreach($row in $before){$p=Get-Process -Id $row.processId -ErrorAction SilentlyContinue;if($p -and $p.StartTime.ToUniversalTime().ToString('o') -ceq $row.processStartTimeUtc){$row}})
  $sameExe=@(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $exe } | ForEach-Object {$_.Id})
  if(-not $after.Count -and -not $sameExe.Count){break};Start-Sleep -Milliseconds 100
 }while([DateTime]::UtcNow -lt $deadline)
 @{status='ok';observations=@{exited=(-not $after.Count -and -not $sameExe.Count);alreadyExited=$false;method='terminateBoundProcessTree';before=$before;after=$after;remainingExecutablePids=$sameExe;terminatedPids=@($terminated.ToArray())}}|ConvertTo-Json -Depth 8 -Compress
}catch{
 @{status='error';error=@{type=$_.Exception.GetType().FullName;message=$_.Exception.Message}}|ConvertTo-Json -Depth 5 -Compress;exit 1
}
