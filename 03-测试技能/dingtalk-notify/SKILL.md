---
name: dingtalk-notify
description: 通过钉钉自定义机器人 Webhook 发送 Markdown 消息，适用于用户已指定渠道的测试任务结果通知，支持可选加签。
---

# 钉钉 Markdown 通知

使用 `scripts/dingtalk_webhook.py` 中的 `send_markdown`。Python 3.10+，仅使用标准库。

## 配置与调用

通过运行环境提供 `DINGTALK_WEBHOOK_URL`，加签机器人另提供 `DINGTALK_WEBHOOK_SECRET`。不要将真实 Webhook、token 或密钥写进仓库、报告或证据。

```python
import sys
from pathlib import Path

# repo_root 为当前资料库根目录；不要依赖调用者的工作目录。
sys.path.insert(0, str(Path(repo_root) / "03-测试技能/dingtalk-notify/scripts"))
from dingtalk_webhook import send_markdown

result = send_markdown(
    title="测试任务完成",
    text="## 测试任务完成\n\n- 已执行：48\n- 通过：47\n- 存在差异：1\n- 报告：05-探索性测试/任务目录/任务报告.md",
)
```

函数也接受显式 `webhook_url`、`secret` 和 `timeout`（秒）。`None` 从环境变量读取；`secret=""` 明确禁用加签。返回钉钉成功响应字典；失败抛出 `DingTalkError`，输入错误抛出 `ValueError`。

## 测试任务通知规则

- 用户配置并授权任务结果通知后，按约定发送；创建本 skill 本身不触发发送。
- 以最终台账生成消息：区分实际执行、阻塞、暂缓和待审核差异，不能将“全部登记”写成“全部执行通过”。未审核问题标为待审核。
- 消息给出任务名称、计数、主要发现和报告位置。本地路径仅作位置说明，接收者未必能访问。
- 钉钉的关键词或 IP 安全规则需要与机器人配置匹配；启用加签时提供对应 secret。
- HTTP 成功不代表发送成功：函数同时检查业务 `errcode`。超时或连接中断可能已送达，不自动重试；先核对群消息再决定是否重发。
- 通知失败不改变测试结果；记录发送失败或送达不确定，并保留原报告。

接口参考：[钉钉自定义机器人](https://open.dingtalk.com/document/orgapp/custom-robot-access)、[机器人安全设置](https://open.dingtalk.com/document/robots/customize-robot-security-settings)。
