# MEM-15 预算边界准备：经面板添加连续样本，累计字符以逼近用户级日预算（4000 字符/日）。
# 通过 call.mjs 主库 memory.addEntry 执行；保留脚本供审核。UTF-8 无 BOM 写参数。
param([int]$Count = 25, [int]$Start = 1)
$ErrorActionPreference = 'Continue'
$d = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$root = Split-Path -Parent (Split-Path -Parent $d)
$argsFile = Join-Path $d 'args-mem15-add.json'
for ($i = $Start; $i -lt ($Start + $Count); $i++) {
  $n = '{0:D2}' -f $i
  $content = "MEM88R2-PC88-20261007-r2-01-MEM-15-b$n 预算边界样本，用于测试用户级日预算（4000字符每日）是否限制 MEMORY.md 写入。本行重复填充常规说明文字以累计字符数：工业设备巡检、仓库物料盘点、安全复核、异常记录与上报等流程描述，不含真实数据，仅作长度填充，标记唯一。"
  $json = @{ type = '事实'; content = $content } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($argsFile, $json, (New-Object System.Text.UTF8Encoding($false)))
  $raw = & node (Join-Path $root 'tools\ui-operations\call.mjs') memory.addEntry --task $d --args-file $argsFile 2>&1 | Out-String
  try {
    $o = $raw | ConvertFrom-Json
    $t = $o.observations.observations.after.value.surface.text
    $wrote = ([regex]::Match($t, '已写入 #\d+')).Value
    $rows = $o.observations.observations.after.value.matchingRows.Count
    Write-Output ("b$n wrote='$wrote' rows=$rows len=" + $content.Length)
  } catch {
    Write-Output ("b$n ERROR: " + ($raw.Substring(0, [Math]::Min(200, $raw.Length))))
  }
}
