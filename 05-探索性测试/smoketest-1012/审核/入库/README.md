# smoketest-1012 工具入库记录

用户明确：测试结果已经判定，按原结果落盘测试项，新增工具合并共享库。本次不更改原用例、结果、问题清单、调用与代码快照。

新增27个共享登记，1个任务审批函数并入已有conversation.decideApproval，共28个任务函数均有归宿。共享库按11个场景导航，每个叶子2～3个候选。来源版本有真实调用；迁库路径和对象唯一性/错误传播调整完成静态验证，不声称迁库后已实机复测。

| 来源 | 共享入口 | 决定 |
|---|---|---|
| `task.readLoginPage` | `application.readLoginPage` | 新增登记；复用共享CDP/记录层 |
| `task.loginWithPassword` | `application.loginWithPassword` | 新增登记；复用共享CDP/记录层 |
| `task.readHomeAccount` | `application.readHomeAccount` | 新增登记；复用共享CDP/记录层 |
| `task.readAccountMenu` | `application.readAccountMenu` | 新增登记；复用共享CDP/记录层 |
| `task.logout` | `application.logout` | 新增登记；复用共享CDP/记录层 |
| `task.probeControls` | `conversation.probeControls` | 新增登记；复用共享CDP/记录层 |
| `task.probeSidebar` | `conversation.probeSidebar` | 新增登记；复用共享CDP/记录层 |
| `task.readArtifactLinks` | `conversation.readArtifactLinks` | 新增登记；复用共享CDP/记录层 |
| `task.newTask` | `conversation.newTaskOnly` | 新增登记；复用共享CDP/记录层 |
| `task.switchSession` | `conversation.switchSessionByTitle` | 新增登记；复用共享CDP/记录层 |
| `task.clickSelectProject` | `conversation.clickSelectProject` | 新增登记；复用共享CDP/记录层 |
| `task.readProjectRow` | `conversation.readProjectRow` | 新增登记；复用共享CDP/记录层 |
| `task.readProjectMenu` | `conversation.readProjectMenu` | 新增登记；复用共享CDP/记录层 |
| `task.removeProject` | `conversation.removeProject` | 新增登记；复用共享CDP/记录层 |
| `task.clickDialogButton` | `conversation.clickDialogButton` | 新增登记；复用共享CDP/记录层 |
| `task.clickMenuItem` | `conversation.clickMenuItem` | 新增登记；复用共享CDP/记录层 |
| `task.readProjectForm` | `conversation.readProjectForm` | 新增登记；复用共享CDP/记录层 |
| `task.fillProjectForm` | `conversation.fillProjectForm` | 新增登记；复用共享CDP/记录层 |
| `task.newSessionInProject` | `conversation.newSessionInProject` | 新增登记；复用共享CDP/记录层 |
| `task.openArtifactLink` | `conversation.openArtifactLink` | 新增登记；复用共享CDP/记录层 |
| `task.readSidePanel` | `conversation.readSidePanel` | 新增登记；复用共享CDP/记录层 |
| `task.sendAwait` | `conversation.sendAwait` | 新增登记；复用共享CDP/记录层 |
| `task.clickApproval` | `conversation.decideApproval` | 并入已有审批能力，保留decision参数与action_refs |
| `task.waitIdle` | `conversation.waitIdle` | 新增登记；复用共享CDP/记录层 |
| `task.readApprovalDialog` | `conversation.readApprovalDialog` | 新增登记；复用共享CDP/记录层 |
| `task.clickExactButton` | `conversation.clickExactButton` | 新增登记；复用共享CDP/记录层 |
| `task.clickButtonContaining` | `conversation.clickButtonContaining` | 新增登记；复用共享CDP/记录层 |
| `task.readQuestionCard` | `conversation.readQuestionCard` | 新增登记；复用共享CDP/记录层 |

## 复用审核

- application.open/inspectConnection不覆盖welcome.html登录表单；新增登录及首页账号能力。
- conversation.newTask含项目/模型设置，新任务仅点击并取值的newTaskOnly保留独立用途，避免继承旧模型按钮定位依赖。switchSessionByTitle用于按实际标题切换；openSession的ID契约保留。
- 项目既有readProjectControls/options仅观察选择器；新增项目行、表单、移除及项目内会话能力。此前openProject/createProject组合仍待专项验收，本轮手动组合结果不冒充其通过。
- readArtifact读取资源路径/文件，新能力处理产物链接与预览表面。
- 审批点击复用现有decideApproval名称，增强为唯一按钮及前后实际观察；sendAwait区分审批和结束，waitIdle仅当前会话空闲。
- 原生窗口继续复用nativeWindow.*，没有重复入库。

## 迁库修正及边界

目标页多匹配拒绝；可选expectedSession核验。去掉表单/菜单检查前first()掩盖多匹配的写法；审批读取异常不再伪装无弹窗。返回只代表实际观察，不改用户已判定结果。

任务源码、调用和失败保留原目录；[函数映射](函数映射.json)包含来源SHA与调用引用。原证据机械审计165次调用（161返回、4错误）、427事件、8968引用通过，未进行现场恢复核验。用户确认结果落盘[正式测试项](../../../../02-测试项/TPT Work冒烟测试/README.md)。
