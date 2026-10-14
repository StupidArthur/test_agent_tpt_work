param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$ProgressPreference = 'SilentlyContinue'
$script:diagnostics = $null
try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NativeWindowApi {
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", EntryPoint="SendMessageTimeoutW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern IntPtr Text(IntPtr h, uint msg, IntPtr w, string text, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll", EntryPoint="SendMessageTimeoutW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern IntPtr ReadText(IntPtr h, uint msg, IntPtr w, System.Text.StringBuilder text, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll", EntryPoint="SendMessageTimeoutW", SetLastError=true)]
  public static extern IntPtr Message(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
}
'@
  $req = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64)) | ConvertFrom-Json
  if ([int]$req.processId -le 0) { throw 'Positive processId required' }
  $targetProcess = [Diagnostics.Process]::GetProcessById([int]$req.processId)
  if ($targetProcess.SessionId -ne [Diagnostics.Process]::GetCurrentProcess().SessionId) { throw 'Target is not in this interactive session' }
  $identity = @{processId=$targetProcess.Id; processName=$targetProcess.ProcessName; processStartTimeUtc=$targetProcess.StartTime.ToUniversalTime().ToString('o'); sessionId=$targetProcess.SessionId}
  $watch = [Diagnostics.Stopwatch]::StartNew()
  function Test-FullyQualifiedWindowsPath([string]$text) {
    # IsPathRooted also accepts drive-relative and root-relative paths on .NET Framework.
    return (($text -match '^[A-Za-z]:[\\/]') -or ($text -match '^[\\/]{2}[^\\/]+[\\/][^\\/]+(?:[\\/]|$)'))
  }
  function Walk-Elements($root, [int]$limit) {
    $queue = New-Object 'System.Collections.Generic.Queue[System.Windows.Automation.AutomationElement]'
    $all = New-Object 'System.Collections.Generic.List[System.Windows.Automation.AutomationElement]'
    $queue.Enqueue($root)
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
    while ($queue.Count -gt 0) {
      if ($all.Count -ge $limit -or $watch.ElapsedMilliseconds -gt 7000) { throw 'UIA traversal limit reached; observation incomplete' }
      $element = $queue.Dequeue(); $all.Add($element)
      $child = $walker.GetFirstChild($element)
      while ($null -ne $child) {
        if (($all.Count + $queue.Count) -ge $limit -or $watch.ElapsedMilliseconds -gt 7000) { throw 'UIA traversal limit reached; observation incomplete' }
        $queue.Enqueue($child); $child = $walker.GetNextSibling($child)
      }
    }
    return ,$all
  }
  function Read-Element($element) {
    $c = $element.Current
    $handle = [IntPtr]([long]$c.NativeWindowHandle)
    $owner = [NativeWindowApi]::GetWindow($handle, 4)
    $modal = $null; $pattern = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern, [ref]$pattern)) { $modal = $pattern.Current.IsModal }
    $value = $null; $valuePattern = $null; $valueChannel = $null
    if (-not $c.IsPassword -and $element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) { $value = $valuePattern.Current.Value; $valueChannel = 'UIA.ValuePattern' }
    if (-not $c.IsPassword -and $null -eq $value -and $c.ClassName -eq 'Edit' -and $handle -ne [IntPtr]::Zero -and $c.ProcessId -eq $targetProcess.Id) {
      $text = New-Object Text.StringBuilder 32768
      $readResult = [IntPtr]::Zero
      $readSent = [NativeWindowApi]::ReadText($handle, 0x000D, [IntPtr]$text.Capacity, $text, 2, 2000, [ref]$readResult)
      if ($readSent -eq [IntPtr]::Zero) { throw ('Native edit text read failed; lastError=' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()) }
      if ($readResult.ToInt64() -ge ($text.Capacity - 1)) { throw 'Native edit text may be truncated; observation incomplete' }
      $value = $text.ToString(); $valueChannel = 'Win32.WM_GETTEXT'
    }
    return [pscustomobject]@{name=$c.Name; className=$c.ClassName; automationId=$c.AutomationId; controlType=$c.ControlType.ProgrammaticName; processId=$c.ProcessId; hwnd=$handle.ToInt64().ToString(); enabled=$c.IsEnabled; offscreen=$c.IsOffscreen; isModal=$modal; ownerHwnd=$owner.ToInt64().ToString(); ownerEnabled=$(if ($owner -ne [IntPtr]::Zero) {[NativeWindowApi]::IsWindowEnabled($owner)} else {$null}); value=$value; valueChannel=$valueChannel}
  }
  function Resolve-Dialog {
    $number = 0L
    if (-not [long]::TryParse([string]$req.dialogHwnd, [ref]$number) -or $number -le 0) { throw 'Positive decimal dialogHwnd required' }
    $handle = [IntPtr]$number
    if (-not [NativeWindowApi]::IsWindow($handle)) { throw 'Stale or invalid window handle' }
    $windowPid = [uint32]0
    [void][NativeWindowApi]::GetWindowThreadProcessId($handle, [ref]$windowPid)
    if ($windowPid -ne $targetProcess.Id) { throw 'Window process mismatch' }
    return [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  }
  function Describe-Dialog($element) {
    $records = @((Walk-Elements $element 600) | ForEach-Object {Read-Element $_})
    $window = $records[0]
    $edit = @($records | Where-Object {$_.className -eq 'Edit' -and $_.automationId -in @('1152','1148') -and $_.processId -eq $targetProcess.Id -and $_.hwnd -ne '0'})
    $confirm = @($records | Where-Object {$_.className -eq 'Button' -and $_.automationId -eq '1' -and $_.processId -eq $targetProcess.Id -and $_.hwnd -ne '0'})
    $cancel = @($records | Where-Object {$_.className -eq 'Button' -and $_.automationId -eq '2' -and $_.processId -eq $targetProcess.Id -and $_.hwnd -ne '0'})
    $shellStructure = @($records | Where-Object {$_.className -in @('DUIViewWndClassName','DUIListView','SysTreeView32','SysListView32')}).Count -gt 0
    $known = $window.className -eq '#32770' -and $shellStructure -and $edit.Count -eq 1 -and $confirm.Count -eq 1 -and $cancel.Count -eq 1
    return [pscustomobject]@{identity=$identity; window=$window; kind=$(if ($known) {'fileSelectorCandidate'} else {'unknown'}); controls=$records; knownSelectorStructure=$known; pathAutomationId=$(if ($edit.Count -eq 1) {$edit[0].automationId} else {$null})}
  }
  if ($req.mode -in @('list','probe')) {
    $desktop = [System.Windows.Automation.AutomationElement]::RootElement
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, [int]$targetProcess.Id)
    $roots = $desktop.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    if ($roots.Count -eq 0) { throw 'No accessible application UIA root; cannot assert absence of dialogs' }
    $seen = @{}; $windows = @()
    foreach ($root in $roots) {
      foreach ($element in (Walk-Elements $root 1800)) {
        $c = $element.Current
        if ($c.ProcessId -eq $targetProcess.Id -and $c.ControlType -eq [System.Windows.Automation.ControlType]::Window) {
          $record = Read-Element $element
          $key = $element.GetRuntimeId() -join ':'
          if (-not $seen.ContainsKey($key)) {$seen[$key]=$true; $windows += $record}
        }
      }
    }
    $dialogs = @($windows | Where-Object {$_.className -eq '#32770' -and $_.hwnd -ne '0' -and -not $_.offscreen})
    $blocking = @($dialogs | Where-Object {$_.isModal -eq $true -or $_.ownerEnabled -eq $false}).Count -gt 0
    $unknown = @($windows | Where-Object {$_.className -ne '#32770' -and $_.hwnd -ne '0' -and -not $_.offscreen -and ($_.isModal -eq $true -or $_.ownerEnabled -eq $false)})
    $result = @{identity=$identity; windows=$windows; dialogs=$dialogs; dialogCount=$dialogs.Count; unknownModalWindows=$unknown; blocking=($blocking -or $unknown.Count -gt 0); scope='target PID accessible UIA application roots'; complete=$true}
  } elseif ($req.mode -in @('describe','act')) {
    $element = Resolve-Dialog
    $before = Describe-Dialog $element
    if ($req.mode -eq 'describe') { $result = $before }
    else {
      if ([string]$req.expectedProcessStartTimeUtc -ne $identity.processStartTimeUtc) { throw 'Process identity mismatch' }
      if ([string]::IsNullOrWhiteSpace([string]$req.expectedTitle) -or [string]$req.expectedTitle -cne $before.window.name) { throw 'Window title mismatch' }
      if (-not $before.knownSelectorStructure -or -not $before.window.enabled -or $before.window.offscreen) { throw 'Unknown or unavailable selector; read-only evidence required' }
      $controlId = switch ([string]$req.action) {'setPath' {$before.pathAutomationId} 'confirm' {'1'} 'cancel' {'2'} default {throw 'Unsupported native action'}}
      $controlClass = if ($req.action -eq 'setPath') {'Edit'} else {'Button'}
      $control = @($before.controls | Where-Object {$_.automationId -eq $controlId -and $_.className -eq $controlClass -and $_.hwnd -ne '0' -and $_.processId -eq $targetProcess.Id})
      if ($control.Count -ne 1 -or -not $control[0].enabled) { throw 'Control missing, disabled or ambiguous' }
      $controlHandle = [IntPtr]([long]$control[0].hwnd)
      if (-not [NativeWindowApi]::IsWindow($controlHandle)) { throw 'Stale control handle' }
      $messageResult = [IntPtr]::Zero
      if ($req.action -eq 'setPath') {
        $text = [string]$req.pathValue
        if ($text -match '[\x00\r\n]' -or -not (Test-FullyQualifiedWindowsPath $text) -or -not (Test-Path -LiteralPath $text)) { throw 'Existing absolute pathValue required' }
        $sent = [NativeWindowApi]::Text($controlHandle, 0x000C, [IntPtr]::Zero, $text, 2, 2000, [ref]$messageResult)
      } else {$sent = [NativeWindowApi]::Message($controlHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero, 2, 2000, [ref]$messageResult)}
      if ($sent -eq [IntPtr]::Zero) { throw ('Win32 timeout or failure; lastError=' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()) }
      $handle = [IntPtr]([long]$req.dialogHwnd)
      $after = $null
      if ($req.action -eq 'setPath') {
        $after = Describe-Dialog (Resolve-Dialog)
        $observed = @($after.controls | Where-Object {$_.className -eq 'Edit' -and $_.automationId -eq $before.pathAutomationId})
        $script:diagnostics = @{before=$before; after=$after; expectedPathValue=[string]$req.pathValue; observedValues=@($observed | ForEach-Object {@{value=$_.value; valueChannel=$_.valueChannel}})}
        if ($observed.Count -ne 1 -or $observed[0].value -cne [string]$req.pathValue) { throw 'Path write not observed in UIA readback' }
      } else {
        $deadline = [Diagnostics.Stopwatch]::StartNew()
        while ([NativeWindowApi]::IsWindow($handle) -and $deadline.ElapsedMilliseconds -lt 2500) {Start-Sleep -Milliseconds 80}
        if ([NativeWindowApi]::IsWindow($handle)) {$after = Describe-Dialog (Resolve-Dialog)}
      }
      $result = @{identity=$identity; action=$req.action; before=$before; after=$after; dialogGone=(-not [NativeWindowApi]::IsWindow($handle)); messageResult=$messageResult.ToInt64().ToString(); businessVerified=$false}
    }
  } else {throw 'Unsupported native mode'}
  @{status='ok'; observations=$result; elapsedMs=$watch.ElapsedMilliseconds} | ConvertTo-Json -Depth 30 -Compress
} catch {
  @{status='error'; error=@{type=$_.Exception.GetType().FullName; message=$_.Exception.Message}; diagnostics=$script:diagnostics} | ConvertTo-Json -Depth 30 -Compress
  exit 1
}
