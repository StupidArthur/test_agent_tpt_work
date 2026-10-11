# Gateway Compatibility Smoke

C 层轻量可信前置，不是22项同等级全测。只对生产实际模型/reasoning/Responses做下表；每独立正/负路径至少一次，复用同一工具往返及history证据。参数、预期、原始返回在任务冻结和记录。

|能力|动作与通过断言|详细断言库|
|---|---|---|
|模型发现|读取模型目录，目标可发现，记录实际 wire ID和字段，不要求默认唯一除非契约约定|[API](01-通用API.md)、[TPT](02-TPT网关契约.md)|
|Authentication|有效凭据正请求；无/无效凭据独立拒绝，错误可读|同上鉴权断言|
|Responses + Streaming|固定标记文本，取得有效正文与完整正常终态；逐事件解析，不以空role帧通过|同上文本/流/终态断言|
|History|第二轮使用第一轮唯一信息，内容正确，关联上下文未丢失|同上多轮断言|
|Tool Calling|首轮取得合法tool name/ID/参数；回填对应结果，第二轮最终内容使用该结果|同上工具调用与回填断言|
|Incomplete handling|受控低输出预算触发截断，或使用服务声明的可复现路径；明确识别 incomplete而非completed，不计完整回答成功|同上截断断言|
|失败后健康|上述一次可控失败后发正常短请求，正文与终态正常，错误未污染后续|同上错误恢复断言|

未触发截断不能算 incomplete通过；记未验证及影响。故障注入、人为EOF或流内error不作为这张表的默认替代实测。

最终报告仅列 Responses、Streaming、History、Tool Calling、Incomplete Handling、Authentication 六项状态；模型发现附在配置条件，失败才展开。详细 case编号与实际覆盖进附录。Smoke通过不证明全部 API/TPT库通过，更不证明用户容量。
