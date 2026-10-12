# TPT Work：Windows NSIS 静默安装

[返回静默安装技能](../SKILL.md)

适用于已确认采用对应electron-builder NSIS安装器的TPT Work Windows包。历史材料报告2026-10-08从0.1.2-alpha.1升级至0.1.3-nightly.202610051942成功；不是当前包或所有NSIS产品的验证结论。

## 安装前

- 输入完整安装包路径、预期版本及已核验的包身份。按本轮环境检测选择兼容的PowerShell语法。
- 覆盖升级按产品安装记录精确绑定注册表子键、InstallLocation和主exe；多条记录有歧义时不使用Select-Object -First 1猜选。首次安装没有现存记录时，在安装后发现并绑定新增记录。
- 主数据历史位置为`%USERPROFILE%\.tpt-work`，Chromium配置为`%APPDATA%\@tpt-work\vendored-desktop`；按实际版本核实备份范围。备份可能含凭据，不提交仓库。
- 应用必须已交付安装任务并退出。需要处理本轮遗留安装器时按PID、启动时间、exe路径和任务归属确认，不按模糊名称批量终止。

## 静默调用

历史验证参数为`/S /currentuser`，大写S。下例要求`$installerPath`已绑定本轮安装包，仅说明安装步骤，不自动关闭产品或备份数据：

```powershell
$installer = Get-Item -LiteralPath $installerPath -ErrorAction Stop
$installProcess = Start-Process -FilePath $installer.FullName -ArgumentList '/S','/currentuser' -WindowStyle Hidden -Wait -PassThru
$installExitCode = $installProcess.ExitCode
```

保存实际退出码。历史该安装器退出0成功、退出2曾对应初始化中止；非零时保留日志并核验现场，不能仅据2断定原因。历史自定义`/D`路径尝试失败，因此当前说明不推荐该参数；这不等于所有NSIS安装器都不支持自定义目录。

## 安装后核验

1. 用精确产品身份查HKCU卸载记录，核对DisplayVersion与预期包版本；同时读取InstallLocation。
2. 从实际InstallLocation定位`tpt-work.exe`，记录文件版本/产品版本，并解释其与完整构建版本的对应关系。不要写死默认路径，也不要只凭退出0判通过。
3. 需要启动时转[TPT Work接入技能](../../tpt-work-access/SKILL.md)，使用本轮已绑定实例和共享工具。安装结果与启动结果分开记录。

历史曾有首启短暂报“TPT Work 无法使用”的现象，必须保留原文和实际终态；不能预先认定都会自愈。HTTP 401最多表明对应服务有响应，不能证明应用健康或已登录。

失败不自动卸载、删除半成品目录或反复安装；先核对本轮安装器是否仍运行、当前版本和文件状态，再决定恢复步骤。
