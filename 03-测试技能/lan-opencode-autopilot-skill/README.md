# lan-opencode-autopilot-skill

无人值守主控 Skill：初始交互式 OpenCode 部署独立的主控 OpenCode Server 和 Python watchdog；watchdog 周期性唤醒服务中同一个主控 Session；主控每轮读取 current_state.md，使用现有 LAN Skill 管理 N 台执行机。

| 文件 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 启动、权限、周期规则及边界 |
| [scripts/bootstrap.ps1](scripts/bootstrap.ps1) | Windows 初始化和独立后台进程启动 |
| [scripts/watchdog.py](scripts/watchdog.py) | 单进程锁、定时循环、状态恢复、去重与阻塞保护 |
| [scripts/test_watchdog.py](scripts/test_watchdog.py) | 离线模拟测试 |
| [references/manager.example.json](references/manager.example.json) | 管理配置模板，无 API 凭据 |
| [references/current_state.example.md](references/current_state.example.md) | 管理目标、PC 清单、任务视图模板 |

将示例复制到管理项目根目录的 .ocautopilot/ 后填写真实路径与管理目标；该目录须被 Git 忽略。模型/Provider 不由本 Skill 配置。

Bootstrap 只负责当前登录会话中启动，不等于已安装跨重启的 Windows 服务；长期运行需另行设置计划任务或服务管理器来监督两个独立进程。不要给无人值守主控默认全部允许。详见 SKILL.md。
