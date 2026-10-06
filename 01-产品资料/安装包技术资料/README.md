# 安装包技术资料

本目录是产品知识的独立来源层，来自本机实际安装的 TPT Work。它提供组件技术说明、实现意图和已知边界；不直接等同于产品需求，也不代表运行验证通过。

## 阅读顺序

1. [检查结论](检查结论.md)：先了解找到了什么，以及未确认的内容。
2. [获取与来源说明](获取与来源说明.md)：了解安装定位、包身份、提取方式和选取范围。
3. 按下面的资料地图阅读原始提取；需要逐文件追溯时查 [来源清单](来源清单.json)。

## 资料地图

- [TPT 模型服务说明](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/llm-tpt/README.md)
- [TPT 沙箱模块说明与源码](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/sandbox/src/index.ts)
- [TPT 记忆包描述](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/memory/package.json)
- [TPT 任务侧栏包描述](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/sidebar/package.json)
- [TPT 自动化包描述](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/automation/package.json)
- [UI 原子组件说明（内容为上游组件）](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40tpt-work/dsh-ui-primitives-vendor/README.zh.md)
- [上游 Windows ACL 沙箱约定](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40deepseek-ai/dsh-sandbox-windows-acl/README.zh.md)
- [上游沙箱服务约定](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40deepseek-ai/dsh-sandbox/README.zh.md)
- [上游工作区权限策略](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40deepseek-ai/dsh-sandbox-policy/README.zh.md)
- [上游内置文件工具边界](%E5%8E%9F%E5%A7%8B%E6%8F%90%E5%8F%96/dsh/node_modules/%40deepseek-ai/dsh-fs-sandbox/README.zh.md)

## 使用边界

- 原始提取保持包内目录层级和字节；只提取部分文件，原文引用的其他源码、图片或链接可能没有收录。
- 包名为 @tpt-work 不代表文档全是 TPT 独有要求；UI vendor 文档实际描述上游组件。
- 组件描述与源码注释可能和外部设计或实测不同，应分别记录来源，不自动裁定谁正确。
- 本目录不包含用户聊天、配置密钥、运行日志或完整 app.asar；不修改安装文件。
