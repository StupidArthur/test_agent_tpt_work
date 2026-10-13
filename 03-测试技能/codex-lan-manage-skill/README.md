# Codex LAN Manage Skill

通过 Codex CLI 的 **App Server WebSocket / JSON-RPC** 管理局域网多台 Codex 工作机。**默认沿用每台工作机已生效的 Provider、Model 和认证配置**，不重复实现模型接入。

- [SKILL.md](SKILL.md)：分层职责、完整协议、远程接入、审批安全、机器分支与主控验收规程。
- [scripts/codexctl.py](scripts/codexctl.py)：Python 3.11+ + `websockets>=14,<17`。
- [scripts/test_codexctl.py](scripts/test_codexctl.py)：不依赖真实工作机的本地单元/模拟协议测试。
- [references/servers.example.json](references/servers.example.json)：主控机器地址与 token **环境变量名称**示例（不存密钥）。

## 设计

| 层次 | 命令 | 能力 |
|---|---|---|
| 完整协议 | `rpc METHOD --params-file FILE` | 透传任何 RPC 方法和支持的可选字段，不设置模型白名单 |
| 完整双向 | `bridge` | JSONL/stdin ↔ WebSocket：保留原生通知及服务端反向请求，调用方自己回应 |
| 快捷操作 | `info / servers / ps / ls / run / messages / events / interrupt` | 多机派单、会话管理、跟踪、打断 |
| Git 治理 | `SKILL.md` | 固定 PC 分支、主控审核合并、一机一任务、台账 |

**底层“全量”表示原生协议无损透传**，不表示每一个版本的所有 RPC 方法均已独立封装成快捷命令；也不表示未经验证的新实验方法一定在旧工作机上可用。

## 快速开始（Windows PowerShell）

```powershell
py -3.11 -m pip install "websockets>=14,<17"
Copy-Item '03-测试技能/codex-lan-manage-skill/references/servers.example.json' '.lan-codex.json'

# 工作机：现有用户身份，默认模型和服务商已在 Codex 配置中设好
codex app-server --listen ws://127.0.0.1:4500

# 主控：另一个窗口建立 SSH 转发（示意）
ssh -N -L 127.0.0.1:4588:127.0.0.1:4500 user@PC88

$ctl = '03-测试技能/codex-lan-manage-skill/scripts/codexctl.py'
py -3.11 $ctl servers
py -3.11 $ctl ps
py -3.11 $ctl --server PC88 info
py -3.11 $ctl --server PC88 --json run --cwd 'D:/work/project-a' '简要检查当前仓库结构'
```

主控项目的 `.lan-codex.json` 已被本仓库根部 .gitignore 忽略；若 Skill 被复制到其它项目，该项目需自行添加忽略规则。生产型远程连接优先本地监听加安全 SSH 隧道；非回环地址只接受 `wss://` 加 Bearer token。App Server WebSocket 官方仍标记实验性，**不得裸露无认证端口**。

## 测试

```powershell
py -3.11 -m unittest discover -s '03-测试技能/codex-lan-manage-skill/scripts' -p 'test_*.py' -v
```

官方文档：[Codex App Server](https://developers.openai.com/codex/app-server/)。
