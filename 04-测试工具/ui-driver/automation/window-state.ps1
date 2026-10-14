param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
try {
 Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class WindowStateApi {
 public delegate bool Callback(IntPtr h, IntPtr extra);
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int left,top,right,bottom;}
 [DllImport("user32.dll",SetLastError=true)] static extern bool EnumWindows(Callback callback,IntPtr extra);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect rect);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder text,int count);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder text,int count);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int command);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 public static IntPtr[] ForPid(uint target) {
  var handles=new List<IntPtr>();
  Callback callback=(h,extra)=>{uint pid;GetWindowThreadProcessId(h,out pid);if(pid==target)handles.Add(h);return true;};
  if(!EnumWindows(callback,IntPtr.Zero))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
  GC.KeepAlive(callback);return handles.ToArray();
 }
}
'@
 $req=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64))|ConvertFrom-Json
 if([int]$req.processId -le 0){throw 'Positive processId required'}
 $target=[Diagnostics.Process]::GetProcessById([int]$req.processId)
 if($target.SessionId -ne [Diagnostics.Process]::GetCurrentProcess().SessionId){throw 'Target is not in this interactive session'}
 $identity=@{processId=$target.Id;processName=$target.ProcessName;processStartTimeUtc=$target.StartTime.ToUniversalTime().ToString('o');sessionId=$target.SessionId}
 function Read-State([IntPtr]$handle) {
  if(-not [WindowStateApi]::IsWindow($handle)){throw 'Stale or invalid window handle'}
  $windowPid=[uint32]0;[void][WindowStateApi]::GetWindowThreadProcessId($handle,[ref]$windowPid)
  if($windowPid -ne $target.Id){throw 'Window process mismatch'}
  $name=New-Object Text.StringBuilder 1024;$class=New-Object Text.StringBuilder 256
  [void][WindowStateApi]::GetWindowText($handle,$name,$name.Capacity);[void][WindowStateApi]::GetClassName($handle,$class,$class.Capacity)
  $rect=New-Object WindowStateApi+Rect
  if(-not [WindowStateApi]::GetWindowRect($handle,[ref]$rect)){throw 'Window rectangle unavailable'}
  return @{hwnd=$handle.ToInt64().ToString();title=$name.ToString();className=$class.ToString();processId=$windowPid;visible=[WindowStateApi]::IsWindowVisible($handle);minimized=[WindowStateApi]::IsIconic($handle);enabled=[WindowStateApi]::IsWindowEnabled($handle);foreground=($handle -eq [WindowStateApi]::GetForegroundWindow());rect=@{left=$rect.left;top=$rect.top;right=$rect.right;bottom=$rect.bottom;width=($rect.right-$rect.left);height=($rect.bottom-$rect.top)};occlusionVerified=$false}
 }
 if($req.mode -eq 'state') {
  $windows=@([WindowStateApi]::ForPid([uint32]$target.Id)|ForEach-Object {Read-State $_})
  $result=@{identity=$identity;windows=$windows;windowCount=$windows.Count;scope='Win32 top-level windows for target PID';complete=$true;businessVerified=$false}
 } elseif($req.mode -eq 'restore') {
  $number=0L
  if(-not [long]::TryParse([string]$req.windowHwnd,[ref]$number) -or $number -le 0){throw 'Positive decimal windowHwnd required'}
  $handle=[IntPtr]$number;$before=Read-State $handle
  if([string]$req.expectedProcessStartTimeUtc -cne $identity.processStartTimeUtc){throw 'Process identity mismatch'}
  if([string]::IsNullOrWhiteSpace([string]$req.expectedTitle) -or [string]$req.expectedTitle -cne $before.title){throw 'Window title mismatch'}
  $sent=[WindowStateApi]::ShowWindowAsync($handle,9)
  $foregroundRequested=$false
  if($req.requestForeground -eq $true){$foregroundRequested=[WindowStateApi]::SetForegroundWindow($handle)}
  $watch=[Diagnostics.Stopwatch]::StartNew();$after=Read-State $handle
  $samples=New-Object 'System.Collections.Generic.List[object]'
  $samples.Add($after);$stateStable=$false
  # Window styles may update before the restore animation moves the rectangle.
  # Require two consecutive observations with normal flags and stable geometry;
  # do not reject legitimate negative coordinates on multiple monitors.
  while($watch.ElapsedMilliseconds -lt 2500){
   Start-Sleep -Milliseconds 80
   $previous=$after;$after=Read-State $handle;$samples.Add($after)
   $normal=($after.visible -and -not $after.minimized -and $after.rect.width -gt 0 -and $after.rect.height -gt 0)
   $previousNormal=($previous.visible -and -not $previous.minimized)
   $sameRect=($after.rect.left -eq $previous.rect.left -and $after.rect.top -eq $previous.rect.top -and $after.rect.right -eq $previous.rect.right -and $after.rect.bottom -eq $previous.rect.bottom)
   if($normal -and $previousNormal -and $sameRect){$stateStable=$true;break}
  }
  $result=@{identity=$identity;before=$before;after=$after;showRequestAccepted=$sent;foregroundRequestAccepted=$foregroundRequested;restored=($after.visible -and -not $after.minimized -and $stateStable);stateStable=$stateStable;stateSamples=@($samples.ToArray());businessVerified=$false}
 } else {throw 'Unsupported window state mode'}
 @{status='ok';observations=$result}|ConvertTo-Json -Depth 12 -Compress
} catch {
 @{status='error';error=@{type=$_.Exception.GetType().FullName;message=$_.Exception.Message}}|ConvertTo-Json -Depth 5 -Compress
 exit 1
}
