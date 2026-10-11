param(
  [string]$ProcName = 'tpt-work',
  [string]$Out = 'F:\electron-ui\.tpt-agent\win.png',
  [int]$MaxWidth = 1600
)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Cap {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

$procs = Get-Process -Name $ProcName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Sort-Object -Property @{Expression={$_.MainWindowTitle.Length}} -Descending

if (-not $procs) { Write-Output 'NO_WINDOW'; exit 1 }

$p = $procs | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1
if (-not $p) { $p = $procs[0] }
Write-Output ("window: pid={0} title=[{1}] hwnd={2}" -f $p.Id, $p.MainWindowTitle, $p.MainWindowHandle)

$r = New-Object Win32Cap+RECT
[void][Win32Cap]::GetWindowRect($p.MainWindowHandle, [ref]$r)
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top
Write-Output ("rect: {0},{1} {2}x{3}" -f $r.Left, $r.Top, $w, $h)
if ($w -le 0 -or $h -le 0) { Write-Output 'BAD_RECT'; exit 1 }

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][Win32Cap]::PrintWindow($p.MainWindowHandle, $hdc, 2)
$g.ReleaseHdc($hdc)
$g.Dispose()

if ($MaxWidth -gt 0 -and $w -gt $MaxWidth) {
  $nw = $MaxWidth
  $nh = [int]($h * $MaxWidth / $w)
  $small = New-Object System.Drawing.Bitmap($nw, $nh)
  $g2 = [System.Drawing.Graphics]::FromImage($small)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($bmp, 0, 0, $nw, $nh)
  $g2.Dispose()
  $small.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $small.Dispose()
  $bmp.Dispose()
  Write-Output ("saved: {0} ({1}x{2} scaled from {3}x{4})" -f $Out, $nw, $nh, $w, $h)
} else {
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("saved: {0} ({1}x{2})" -f $Out, $w, $h)
}
