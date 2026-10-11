"""llm_probe：TPT Work 网关 API 测试执行器（传输为标准库，资源采样需psutil）。

层次：
- sse.py        纯 SSE 帧解析
- transport.py  HTTP/SSE 传输与时间点
- protocol.py   Responses/Chat 请求构造与事件归一化
- evidence.py   证据落盘与 SHA-256 索引、脱敏
- stats.py      统计、SLO、容量结论守卫
- capacity.py   闭环用户 / 开放到达调度
- runner.py     实例执行与台账
- cli.py        命令行
"""
__version__ = "2026.10.08-r1"
__all__ = ["sse", "transport", "protocol", "evidence", "stats", "capacity", "window_evidence"]
