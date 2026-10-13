param(
 [Parameter(Mandatory=$true)][string[]]$Paths,
 [Parameter(Mandatory=$true)][string]$Suffix,
 [ValidateSet('Reset','Restore')][string]$Mode='Reset'
)
$ErrorActionPreference='Stop'
if($Suffix -notmatch '^[A-Za-z0-9-]+$'){throw 'Invalid backup suffix'}
$pairs=@(foreach($item in $Paths){
 if($item -notmatch '^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+[\\/])'){throw 'Full absolute state directory required'}
 $original=[IO.Path]::GetFullPath($item).TrimEnd('\','/')
 if($original -eq [IO.Path]::GetPathRoot($original).TrimEnd('\','/')){throw 'Drive root is not a state directory'}
 $backup=$original+'.bak-'+$Suffix
 $from=$original;$to=$backup
 if($Mode -eq 'Restore'){$from=$backup;$to=$original}
 if(Test-Path -LiteralPath $to){throw ('Destination already exists: '+$to)}
 if(Test-Path -LiteralPath $from){
  $entry=Get-Item -LiteralPath $from
  if(-not $entry.PSIsContainer -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Plain state directory required'}
  [pscustomobject]@{From=$from;To=$to}
 }elseif($Mode -eq 'Restore'){throw ('Backup not found: '+$from)}
})
$moved=New-Object 'System.Collections.Generic.List[object]'
try{
 foreach($pair in $pairs){Move-Item -LiteralPath $pair.From -Destination $pair.To -ErrorAction Stop;$moved.Add($pair)}
}catch{
 $failure=$_
 for($i=$moved.Count-1;$i -ge 0;$i--){Move-Item -LiteralPath $moved[$i].To -Destination $moved[$i].From -ErrorAction Stop}
 throw $failure
}
$moved.ToArray()
