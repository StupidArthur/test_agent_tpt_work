# 模型及API初算.adoc

> 来源: https://alidocs.dingtalk.com/i/nodes/3NwLYZXWyn3qM4NYUGXyP4x0VkyEqBQm?utm_scene=team_space
> 路径: 模型及API初算.adoc

---

我们的资源：

字节云，5个8卡H20的实例

每个实例可以运行qwen-3.8-next-flash 256K上下文，最高并发12个，实际用起来按9个算 

每个实例可以运行deepseek-v4.1-flash并发数待定





请求量超量时，根据排队情况开始转接外部api资源，用作弹性支撑



0914决策后模型分三档：

初级，对应qwen-3.8-next-flash 0918：该模型maas需要授权，考虑换其它轻快低成本模型，暂定dsv4

中级，对应deepseek-v4.1-flash 

高级，对应国内最强模型，准备连接api



性能规格暂定支持全局5000个并发，单用户限制10个并发



计费规则，对外积分制，消耗规则不透明。内部开发需统计各种行动用以计费计算，包括但不限于token的各项统计



待决策：公司的token费用预算以及报账，拟定早期（10月）小规模灵活走账，后续公对公采购。但实际的责任部门尚未落实。





附表：不同模型性能及费用（能力统一采用 Artificial Analysis Intelligence Index v4.3，覆盖编码、推理、知识与实际工作任务；分数越高越好，不是正确率百分比）

[table]

以下计算缓存命中率有效均价，缓存命中率按照页面缓存计算，实际harness工具调用各有差异。dsv4flash在dsh的缓存命中率可能超过99%

[table]

[table]


