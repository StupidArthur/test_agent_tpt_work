# LLM 标准化性能测试套件（llm-bench-kit）

用于在**不同网络环境**（公网 / 内网）对 LLM API 跑**完全相同**的性能测试，
产出统一格式的 JSON 结果，再一键合并成多方对比报告。

- **kit 版本**：1.0.0（与 2026-09-24 基准测试同源：同 prompt、同参数、同统计口径）
- **依赖**：仅 Python 3.8+ 标准库，**无需 pip 安装任何东西**（内网无外网也能跑）
- **网络要求**：只需能访问目标 `base_url`，不依赖其他外部服务

---

## 目录结构

```
llm-bench-kit/
├── AGENTS.md          # 🤖 给 AI 的入口文档: 拿到内网地址/key 后照此独立完成测试+出报告
├── README.md          # 人类版使用说明
├── config.json        # 测试目标(endpoint/key/model) + 套件参数(suite 段严禁改)
├── bench.py           # 执行器: 跑全部/部分测试节, 产出 results/*.json
├── report.py          # 报告器: 读 2~N 个结果 JSON, 生成 Markdown 对比报告
├── results/           # 结果落盘 (统一口径: 双方 think/effort=low, 全量)
│   ├── flash-public-low_*.json     # 基线① 公网网关 think=low 全量
│   └── deepseek-flash-low_*.json   # 基线② deepseek-flash effort=low 全量
└── examples/
    └── report_2way_example.md      # 双基线自动生成的对比报告示例
```

> **给 AI 使用者**：内网测试请直接读 `AGENTS.md`，它包含完整的取信息→改配置→跑测试→
> 合并三方报告→自检的流程，人类只需提供内网 base_url / key / 模型名。
>
> **统一口径**：所有对象一律 `think_level=low` / `effort=low`（见"注意事项"5 的原因）。

## 测试节一览

| key | 内容 | 样本量(全量/quick) |
|---|---|---|
| `short_latency` | 短请求非流式延迟 | 10 / 3 |
| `ttft` | 流式首字延迟 | 10 / 3 |
| `throughput` | 1500 字长回答吞吐 | 3 / 1 |
| `prefill` | 31K 重复(缓存) + 60K 全新(预填充) | 3+3 / 1+1 |
| `concurrency_short` | 10 并发短请求 | 1 波 |
| `think_levels` | 思考档位 off/low/medium/high | 各 3 / 各 1 |
| `steady_decode` | 稳态解码速率(流式中段 10%~90%) | 3 / 1 |
| `nonstream_long` | 非流式长输出 tok/s | 3 / 1 |
| `stream_timing` | 流式逐 chunk 节奏(假增量检测) | 短2+长1 / 短1 |
| `sweep` | 并发扫描 N=1,5,10,20,50,100 | 全档 / 1,10,50 |

全量单 target 约 **5~8 分钟**；`--quick` 约 **2 分钟**。

---

## 使用步骤

### ① 配置目标（config.json）

在 `targets` 数组里增改目标。**内网测试**示例：

```json
{
  "name": "intranet",
  "display_name": "内网环境",
  "base_url": "http://<内网地址>/<路径>/v1",
  "api_key": "<内网key>",
  "model": "flash",
  "think_level": "low",
  "supports_think": true
}
```

字段说明：
- `name`：目录/文件用的短标识，只能用字母数字短横线
- `display_name`：报告里显示的名字
- `supports_think`：是否接受 `think_level` 请求字段（非该网关的设 false）
- `extra_fields`：厂商专有请求字段（DeepSeek 系用 `{"effort": "low"}`），会并入每个请求体

> ⚠️ **可比性红线**：
> 1. 对比各方必须使用**同一份 suite 参数**（config.json 的 `suite` 段），`--quick` 或改档位
>    都会被 report.py 自动标警告；
> 2. **思考档位必须保持 low**（网关 `think_level: "low"` / DeepSeek `effort: "low"`）——
>    改档位 = 改口径 = 结果不可比（原因见"注意事项"5）。

### ② 执行测试

```bash
# 全量（推荐, 与基线口径完全一致）
python bench.py --target intranet

# 快速模式（冒烟/时间紧时用, 报告会标注 quick）
python bench.py --target intranet --quick

# 只跑部分节
python bench.py --target intranet --only ttft,sweep
python bench.py --list          # 查看所有节名
```

结果写入 `results/<target>_<时间戳>.json`，控制台同步打印进度。
**单节出错不会中断**，错误记录在 JSON 的 `meta.section_errors` 里。

### ③ 带回结果并合并报告

把内网生成的 JSON 拷回本目录 `results/`，然后：

```bash
# 三方对比: 公网网关 vs DeepSeek vs 内网 (全部为对齐 low 口径)
python report.py results/flash-public-low_*.json results/deepseek-flash-low_*.json results/intranet_*.json -o report-3way.md

# 指定第一列基准
python report.py results/*.json -o report-3way.md --reference intranet
```

生成的报告结构：
- §0 测试对象（endpoint/参数一致性自动校验）
- §1 延迟 → §2 吞吐 → §3 长文本 → §4 并发扫描 → §5 容量与退化分析 → §6 流式行为 → §7 思考档位
- §8 差距判定汇总（自动算倍数、标 🔴🟠✅）
- 附录 A 测试方法（固定口径说明）
- 附录 B 原始证据（各 target 逐次运行数据）

### ④ 并入主报告

`report-3way.md` 为独立成文的三方对比稿，可整体并入 `llm-gap-metrics-report.md`
或 `llm-api-benchmark-report.md`（保留其"测试对象/差距判定"两节即可无缝衔接）。

---

## 排查"是不是走了太多网关到公网"

跑完内网 target 后，重点看报告里这三项与公网 target 的差值：

| 若内网明显优于公网 | 说明 |
|---|---|
| **TTFT** 大幅下降 | 公网链路/网关缓冲是首字延迟主因 |
| **prefill 冷启动** 大幅下降 | 公网出口带宽/传输是长文本瓶颈 |
| **sweep 聚合吞吐** 提升 | 公网链路限制并发；若不变则瓶颈在模型/网关池本身 |

反之若三项与公网持平 → 瓶颈在服务端（模型副本、网关转发池），与网络无关。
（对照基准：稳态解码 `steady_decode` 与网络弱相关，可作为"模型本身"的参照线。）

---

## 注意事项

1. **key 不会外泄**：结果 JSON 中 key 自动脱敏（`sk-gw-e99...` 形式）；
2. **测试时段**：建议与基线同一网络时段重跑基线（公网波动会影响对比）；
3. **样本量**：quick 模式仅供冒烟，出正式结论用全量；
4. **token 口径**：`prompt_tokens` 以各 API 返回为准，跨 tokenizer 不做折算；
5. **统一思考口径（重要）**：2026-09-27 实测发现网关 `think_level=off` 并未真关思考
   （content 仅几 token 却计 ~150 completion token，且无 reasoning 字段）；而 DeepSeek
   无思考档仅 3 token——"off vs 无思考"是不等量工作，端到端延迟差距是口径假象
   （曾测 1.6×，对齐后打平 1.0×）。故本 kit **统一采用 low 档对齐**：网关
   `think_level=low` ~145 tok vs DS `effort=low` ~141 tok，工作量对等。
   已验证与档位无关的稳定结论：**网关 TTFT 差 DeepSeek ~5.7×**（缓冲问题，与思考无关）；
6. **证据为可复现的原始数据**，脚本与 case 均在本包内，无外部依赖。
