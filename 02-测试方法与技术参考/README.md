# 测试方法与技术参考

Agent 操作 TPT Work 真实界面时，先按[启动与测试实操指南中的默认执行路线](portable-agent-exe-ui-api-guide.md#agent-默认执行路线先读)使用 Playwright 连接应用开放的 CDP 端口；API / wire 测试另走测试网关。

探索性测试产出先进入[待审核区](../探索性测试/README.md)。本轮[Test Agent 方法论草案](../探索性测试/2026-10-05-TPT-Work/Test-Agent探索性测试规则.md)尚待审核，获批后再并入正式测试规范。

按下列顺序渐进阅读；原始材料保持不变。

- [整合接入指南](%E6%B5%8B%E8%AF%95%E6%8E%A5%E5%85%A5%E4%B8%8E%E6%89%A7%E8%A1%8C%E6%8C%87%E5%8D%97.md)
- [原实操指南](portable-agent-exe-ui-api-guide.md)
- [批次原始参考入口](../03-%E6%B5%8B%E8%AF%95%E6%89%B9%E6%AC%A1/README.md)

下一轮任务准备时阅读[测试代码分层设计](下一轮测试代码分层设计.md)，按功能组织业务函数和软件操作支撑。LLM通过tool call优先复用业务函数，能力缺失时补写并留存代码。此设计从下一轮落实，当前执行任务保持原流程。
