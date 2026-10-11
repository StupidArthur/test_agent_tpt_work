"""Offline acceptance report builder for 2026-10-07-LLM网关最终容量验收."""
import json, math
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]


def load_dir(sub):
    d = TASK / 'results' / sub
    out = {}
    if d.exists():
        for p in sorted(d.glob('*.json')):
            if p.name.endswith('-recovery.json'):
                continue
            out[p.stem] = json.loads(p.read_text(encoding='utf-8'))
    return out


def main():
    wins = load_dir('responses-boundary')
    agent = load_dir('standard-agent')
    base = agent.get('u1', {})
    bsum = base.get('summary', {})

    exec_summary = {
        'responses_boundary': {
            'status': 'deferred' if not wins else 'partial',
            'initial_screen': {'p95<=3s': {'pass': 55, 'first_fail': 60},
                               'p95<=5s': {'pass': 80, 'first_fail': 85},
                               'p95<=10s': {'pass': 200, 'first_fail': 210}},
            'sustained_windows': {k: v for k, v in wins.items()},
            'note': 'Responses 3/5/10s 初筛容量 = 55/80/200；持续窗口验收未执行。',
        },
        'standard_agent': {k: {'users': v['users'], 'attempted_tasks': v['attempted_tasks'],
                               'duration_s': v['duration_s'], 'peak_in_flight': v['peak_in_flight'],
                               'summary': v['summary']} for k, v in agent.items()},
        'client_limits': {},
        'recovery': {},
        'issues': [] if bsum.get('gateway_success_rate') == 100 else ['gateway failures present'],
    }
    (TASK / '结果汇总.json').write_text(json.dumps(exec_summary, ensure_ascii=False, indent=2), encoding='utf-8')

    L = ['# LLM 网关最终容量验收报告（待审）', '',
         'Responses API / flash / reasoning.effort=low / 单 key。成功分层：Gateway Service Success（协议+completed+非空内容/合法工具调用）'
         '与 Agent Task Success 分开；marker 措辞、模型未调工具等计 Model/Task Quality，不压低网关成功率。', '']

    L += ['## 1. Responses 简单请求（初筛；持续窗口验收未执行）', '',
          '| 体验线 | 初筛通过档 | 初筛首失败档 | ×5 总用户 | 持续窗口 |', '|---|---:|---:|---:|---|',
          '| p95≤3s | 55 | 60 | 275 | 未执行 |',
          '| p95≤5s | 80 | 85 | 400 | 未执行 |',
          '| p95≤10s | 200 | 210 | 1000 | 未执行 |', '',
          '> 来源：`../2026-10-07-LLM网关服务评估/补测/todo_2-容量延迟曲线/`。可升级为“持续验证容量”的双窗口复核本轮未做。', '']

    L += ['## 2. standard Agent 真实负载（docs/07 workload）', '']
    if base:
        L += ['### 单用户基线（>=30 任务）', '',
              '| 项目 | 结果 |', '|---|---|',
              f"| 任务数 | {bsum.get('tasks')} |",
              f"| Agent Task Success Rate | {bsum.get('task_success_rate')}% ({bsum.get('task_success')}/{bsum.get('tasks')}) |",
              f"| Gateway Service Success Rate | {bsum.get('gateway_success_rate')}% ({bsum.get('gateway_requests_success')}/{bsum.get('llm_requests')}) |",
              f"| 首有效反馈 p50 / p95 | {(bsum.get('first_feedback') or {}).get('p50')} / {(bsum.get('first_feedback') or {}).get('p95')} s |",
              f"| Task E2E p50 / p95 | {(bsum.get('task_e2e') or {}).get('p50')} / {(bsum.get('task_e2e') or {}).get('p95')} s |",
              f"| 工具调用成功率 | {bsum.get('tool_call_success')}% |",
              f"| 每任务 LLM 请求数 | {bsum.get('llm_requests_per_task')} |",
              f"| Requests/s | {bsum.get('requests_per_s')} |",
              f"| Agent turns/s | {bsum.get('turns_per_s')} |",
              f"| 失败分类 | {bsum.get('attribution')} |", '']
        fail_3 = (bsum.get('task_success_rate') or 0) < 99 or ((bsum.get('task_e2e') or {}).get('p95') or 0) > 10
        if fail_3:
            L += ['**判定**：单用户 Agent Task Success < 99% 或 Task E2E p95 > 10s →',
                  '- 3 秒容量：已测 1 个活跃 Agent 即不满足该体验线，因此该阈值下没有已验证的正整数容量。',
                  '- 5 秒容量：同上。',
                  '- 10 秒容量：同上。',
                  '- 只继续观测 2/5/10 用户的并发退化趋势，不再做容量搜索。', '']
    L += ['### 并发退化趋势（2/5/10 用户，各 >=30 任务）', '',
          '| 档位 | 任务数 | Agent成功率% | 网关成功率% | 首反馈p95 | 任务E2E p50 / p95 | 工具成功率% | 失败分类 |',
          '|---|---:|---:|---:|---:|---|---:|---|']
    for k in sorted(agent, key=lambda x: agent[x]['users']):
        s = agent[k]['summary']
        ff = s.get('first_feedback') or {}
        te = s.get('task_e2e') or {}
        L.append(f"| {agent[k]['users']} 用户 | {s.get('tasks')} | {s.get('task_success_rate')} | {s.get('gateway_success_rate')} | "
                 f"{ff.get('p95')} | {te.get('p50')} / {te.get('p95')} | {s.get('tool_call_success')} | {s.get('attribution')} |")
    L += ['', '> 这些档位只用于观察真实 Agent 随并发增加的 E2E/TTFT/任务成功率变化，不作为 3/5/10 秒容量通过档。', '',
          '## 3. 归因说明', '',
          '- Gateway Service Success 只由协议/传输/终态/非空内容（或合法工具调用）决定；模型未按要求调用工具、最终数字/格式错误属 Agent Task Success 失败，不自动等于网关失败。',
          '- 单用户 1 次 `tool_not_called` 记为 Agent 任务失败、网关请求成功。', '']
    (TASK / '验收报告.md').write_text('\n'.join(L), encoding='utf-8')
    print('wrote 结果汇总.json + 验收报告.md')
    print('agent tiers:', {k: agent[k]['summary']['task_success_rate'] for k in agent})


if __name__ == '__main__':
    main()
