---
name: get-latest-package-skill
description: 通过 FTP/FTPS 从局域网服务器下载构建包（如 TPT Work nightly exe），含列目录、按时间戳取最新、下载到本地、校验大小与 SHA-256 的可复用脚本与坑位清单。凡需要从 FTP 拉取安装包/构建产物时先读本 SOP。
---

# 获取最新构建包

本技能从 FTP/FTPS 服务器列出远端目录、按文件名模式与时间戳选出最新包、下载到本地并校验大小与 SHA-256，产出可复核的下载证据。脚本用 Python 标准库 `ftplib`，无需第三方依赖。

## 适用与不适用

- 适用：FTP/FTPS 上有按固定命名规律发布的构建包（默认筛选 TPT Work Windows x64 exe，文件名包含可解析的时间标签，不限定发布渠道）。
- 不适用：HTTP(S) 目录列表；SFTP/SCP（`ftplib` 不支持，需另配 ssh/sftp 客户端）。

下载完成需要安装时，再读 [silent-install-skill](../silent-install-skill/SKILL.md)。

## 文件

| 文件 | 作用 |
|---|---|
| `scripts/ftp_download.py` | 列目录 / 选最新 / 下载 / 校验，输出 JSON 结果 |
| `references/config.example.json` | 配置模板（**复制为本地配置，凭据不入库**） |

## 配置与优先级

脚本按以下优先级取配置，后者覆盖前者：

1. 配置文件（`--config` 指定，或环境变量 `FTP_CONFIG` 指向）
2. 环境变量（`FTP_*`）
3. 显式命令行参数（含时间标签规则）

**凭据纪律**：密码只放本地配置文件或环境变量，仓库内只保留 `config.example.json`。本地配置文件（`config.local.json`）已加入 `.gitignore`，不得提交、不得写入报告/证据。

## 用法

```powershell
$py = "03-测试技能\get-latest-package-skill\scripts\ftp_download.py"
$cfg = "03-测试技能\get-latest-package-skill\config.local.json"   # 由 config.example.json 复制并填真实值

# 1) 只列远端候选（按时间戳倒序），核对将下载哪个包
python $py --config $cfg list

# 2) 下载最新包到本地目录（默认 config 的 local_dir），并打印大小与 SHA-256
python $py --config $cfg download

# 3) 下载指定文件并校验 SHA-256（如服务器/清单给了期望值）
python $py --config $cfg download --file tpt-work-0.1.3-nightly.202610111943-win-x64.exe --sha256 <EXPECTED>

# 4) 复用已有同大小包：加 --reuse（大小一致则跳过下载）
python $py --config $cfg download --reuse
```

脚本结束输出 JSON（含 `remote_file`、`size`、`sha256`、`local_path`、`reused`、`verified`），供登记到 `nightly\state.json` 或任务证据。

## 如何判断最新包

先运行 `python $py --config $cfg latest`，只列出并选择，不下载。

1. 用 `pattern` 完整匹配所需产品、平台、渠道和包格式。渠道可以是release、beta、nightly，也可以不带渠道；由调用者决定是否混合比较。
2. 提取文件名中唯一的时间标签，解析成日期时间后选最大值。不按版本号、文件大小或FTP返回顺序判断。
3. 默认识别独立的8、12、14位数字：`YYYYMMDD`、`YYYYMMDDHHMM`、`YYYYMMDDHHMMSS`，不要求有nightly前缀。缺失、无效日期或多个时间标签会报错；多个标签时配置精确提取规则。
4. 其他格式使用 `timestamp_pattern`（必须含命名组 `(?P<timestamp>...)`）和 `timestamp_format`。例如 `build-2026-10-12_193000.zip`：规则 `build-(?P<timestamp>\d{4}-\d{2}-\d{2}_\d{6})`，格式 `%Y-%m-%d_%H%M%S`。
5. 同一最新时间有多个不同包时报告歧义，核对后用 `--file` 显式选择。无候选返回 `latest:null`。日期精度只有天时不能判断同日先后。

配置可通过 `--timestamp-pattern` / `--timestamp-format` 或 `FTP_TIMESTAMP_PATTERN` / `FTP_TIMESTAMP_FORMAT` 覆盖。所有候选的时间标签须采用一致的时区约定；没有时区的标签不会自动推断UTC。默认缺失的时分秒按零比较，发布方如混用不同精度，应先限定同一命名规则。时间标签只决定排序，不证明上传完成或文件完整性。

示例：`tpt-work-0.1.3-release.202610120100-win-x64.exe` 比 `tpt-work-0.1.4-beta.202610111943-win-x64.exe` 时间更新；是否把两个渠道纳入候选由pattern决定。

## 固定信息（TPT Work nightly 场景，按需替换）

| 项 | 说明 |
|---|---|
| 包命名 | `tpt-work-<版本>-nightly.<YYYYMMDDHHMM>-win-x64.exe`，取 `nightly.<时间戳>` 数值最大者 |
| 时间戳时区 | nightly 服务器常为 UTC；时间戳 `202610111943` 是 UTC 20:07 前后上架、北京时间约次日 04:00，判断发布时刻需 +8 |
| 本地默认目录 | `d:\code\test_agent_tpt_work\nightly\downloads\`（与 HTTP 流程一致，便于 `nightly\run-nightly.ps1` 复用） |
| 台账 | 下载结果登记 `d:\code\test_agent_tpt_work\nightly\state.json` |

## 已知坑

| # | 坑 | 处置 |
|---|---|---|
| 1 | 被动模式（PASV）在部分内网/防火墙下才通 | 默认**被动模式**；若数据连接超时，先确认服务器是否要求主动模式，再评估网络策略，不要盲目改脚本 |
| 2 | FTPS 分显式/隐式 | `--tls` 走**显式 FTPS**（`FTP_TLS`，默认 21 端口 AUTH TLS）；隐式 FTPS（990）需另配，本脚本不默认支持 |
| 3 | 中文/空格文件名 | `ftplib` 默认按 Latin-1 编解码；服务端若为 UTF-8 文件名可能乱码，遇乱码先 `--remote-dir` 用 ASCII 路径，必要时在脚本内切换编码 |
| 4 | 下载中断留下半包 | 脚本先下载到 `<file>.part` 再改名；中断后重跑会覆盖半包；不要用半包冒充完整包 |
| 5 | Windows 路径与盘符 | `local_dir` 用双反斜杠或正斜杠；脚本内部用 `os.path` 归一化，勿混用 shell 转义 |
| 6 | PowerShell 5.1 中文脚本被按 ANSI 解析 | 本技能脚本为 Python，不受影响；若另写 PS 包装脚本，存 UTF-8 带 BOM |
| 7 | 密码进入证据 | 只记录 `remote_file`/`size`/`sha256`/`local_path`；日志与 JSON 中一律不出现密码、webhook、token |
| 8 | 大小/哈希核对 | 下载后用 `size` 与 `sha256` 与服务器目录/清单比对；不一致即判下载失败，删除半包重下，最多 2 次 |

## 健康判定

`list` 能返回候选文件、`download` 退出码 0 且 JSON 中 `verified` 为 `true`（当提供 `--sha256` 或服务器可提供期望值时）。任一不满足即记失败并保留原始错误。
