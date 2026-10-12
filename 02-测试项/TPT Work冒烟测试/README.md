# TPT Work 冒烟测试

[返回测试项](../README.md)

覆盖登录/退出、任务与会话、项目创建/选择/移除、产物预览、三种任务权限及审批。用户已确认smoketest-1012结果，本次按确认结果归档，不重新裁定模型输出。

| 需要什么 | 入口 |
|---|---|
| 分派下一轮 | [测试用例](测试用例.md)：15个编号，含原轮与对照轮 |
| 查本轮已判定结果 | [smoketest-1012用户确认结果](smoketest-1012-用户确认结果.md) |
| 查函数对应关系 | [工具映射](工具映射.json)，再对选中函数--describe |
| 查原始调用、错误与残留 | [原任务](../../05-探索性测试/smoketest-1012/README.md)及其问题清单 |
| 查迁库决定 | [函数入库记录](../../05-探索性测试/smoketest-1012/审核/入库/README.md) |

执行按本轮授权替换环境和样本。对目录清空、退出登录、模型请求、项目移除分别沿用用例授权范围；先记录原值和恢复边界。历史中的首次安装/已有数据状态、提示措辞差异及保留资产说明原样留存。历史结果不等于新版本通过。

按目标查工具：登录/退出→application.login/account；空白任务/标题切换→conversation.session.basic；项目入口/表单/移除/项目内新会话→conversation.project对应叶子；产物预览→conversation.artifact.preview；审批等待→conversation.approval.observe；允许/拒绝→现有conversation.decideApproval；问题卡→conversation.question。无需通读全部工具。

本次只整理和静态验证，没有重新操作产品。原始来源SHA-256：13205ccc57ad2b5b27fe1945c1819219597bf1c311548a5983b1f9f5fbb390c0。
