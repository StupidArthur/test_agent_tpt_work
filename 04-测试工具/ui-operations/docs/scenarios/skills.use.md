# 快捷引用、会话入口与实际调用

[返回技能](../modules/skills.md)

入口是否自行新建会话用 useSkillDirect；useSkill 先新建任务，quickUse 引入当前会话。实际生效看请求与轨迹。

| 候选函数 | 用途 |
|---|---|
| `skills.useSkill` | 新建会话后经快捷使用引入本轮技能引用；返回改前/改后会话身份与引用内部名 |
| `skills.useSkillRequest` | 发送技能固定回复规则请求并等待终态；返回助手正文与用户请求是否含输出串 |
| `skills.useSkillDirect` | 仅经快捷使用入口（不手动新建任务），观察入口是否自行新建会话 |
| `skills.readTraceSkillContent` | 读取本轮技能调用轨迹中的 skill_content 资源标识（限定轨迹表格） |
| `skills.quickUse` | 仅经快捷使用入口把技能引用注入当前会话 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.use`；场景内检索：`--find "关键词" --route skills.use --limit 3`。
