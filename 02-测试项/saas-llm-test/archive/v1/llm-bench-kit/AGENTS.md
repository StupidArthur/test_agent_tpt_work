# AGENTS.md — 给 AI 的任务说明：在本环境跑标准化 LLM 性能测试并生成对比报告

> **如果你是一个 AI 助手/Agent，读完本文即可独立完成测试与出报告，无需额外上下文。**
> 本文档是唯一入口。人类操作员只需告诉你：内网 LLM 服务的地址、key、模型名。

---

## 0. 你的任务

在**当前网络环境**（通常是内网）对一个 LLM API 跑基准测试，然后与已有的两条公网基线
合并，生成一份 **三方对比 Markdown 报告**。

**统一测试口径（全局唯一，必须遵守）**：所有对象一律使用**低档思考**——
网关类服务 `think_level: "low"`，DeepSeek 类服务 `extra_fields: {"effort": "low"}`。
（理由见 §3：只有双方都开低档思考，输出 token 量才对等，延迟类指标才可比。）

**交付物**：
1. `results/<target>_<时间戳>.json` — 本环境的测试结果（全量 10 节）
2. `report-3way.md` — 三方对比报告（公网网关 vs DeepSeek vs 本环境）

## 1. 套件结构（先读这些文件）

| 文件 | 作用 | 可否修改 |
|---|---|---|
| `config.json` | 测试目标（endpoint/key/model/思考档位）+ **suite 测试参数** | 只允许改 `targets` 段的连接信息；**`suite` 段严禁改动**；思考档位保持 low |
| `bench.py` | 执行器，产出结果 JSON | **禁止修改**（kit_version 必须保持 1.0.0） |
| `report.py` | 合并 2~N 个结果 JSON → 对比报告 | **禁止修改** |
| `results/` | 已有基线（2026-09-27 公网跑的对齐口径全量） | 只增不删 |
| `examples/report_2way_example.md` | 报告长什么样的参考 | 只读 |
| `README.md` | 人类版使用说明 | 只读 |

已有基线（无需重跑，直接合并）：
- `results/flash-public-low_*.json` — 公网网关，`think_level=low`，**全量**
- `results/deepseek-flash-low_*.json` — `deepseek-flash`，`effort=low`，**全量**

> 注意：kit 中**只保留对齐口径（low）的基线**。早期"网关 off vs DS 无思考"的口径A结果
> 已按操作员决策移除，勿恢复。

## 2. 操作步骤

### Step 1：向操作员获取内网服务信息（缺什么问什么）

```
- base_url（形如 http://xxx/v1，注意必须能拼上 /chat/completions 且返回非 404）
- api_key
- 模型名（model id）
- 思考控制：接受 think_level 字段吗？档位有哪些？（若与网关同款软件：off/low/medium/high）
```

### Step 2：改 `config.json`

`targets` 数组里已有占位 target `intranet`，把它改成真实信息：

```json
{
  "name": "intranet",
  "display_name": "内网环境",
  "base_url": "http://真实地址/路径/v1",
  "api_key": "真实key",
  "model": "真实模型名",
  "think_level": "low",
  "supports_think": true
}
```

若内网服务是 DeepSeek 系（用 `effort` 而非 `think_level`），照抄 `deepseek-flash-low`
的写法：`"think_level": null, "supports_think": false, "extra_fields": {"effort": "low"}`。

**红线**：
- `suite` 段一个字都不能动（这是"三方结果可比"的全部依据）
- 思考档位保持 **low**，不要改成 off/medium/high 或去掉——口径变了结果就不可比
- `supports_think`：只有确认服务接受 `think_level` 字段才设 true
- 验证连通：`curl <base_url>/models`（带 Bearer key），确认 200 且能看到模型列表

### Step 3：跑测试

```bash
python bench.py --target intranet
```
- 全量约 5~8 分钟，控制台实时打印每节数值
- **单节失败不中断**，会记入 JSON 的 `meta.section_errors`
- 进度正常的标准：每节都有输出、末尾打印 `== DONE in ...s -> results/...json`

### Step 4：验证结果文件

检查三点，任一不满足要处理：
1. 文件存在于 `results/`
2. `meta.section_errors` 为空 `{}`
3. `meta.suite` 与基线的 `meta.suite` 逐字段一致（`--quick` 跑的不算合格，重跑）

### Step 5：生成三方报告

```bash
python report.py results/flash-public-low_*.json results/deepseek-flash-low_*.json results/intranet_<时间戳>.json -o report-3way.md
```
（列顺序 = 命令行顺序；想让内网列放第一就放第一个）

### Step 6：出报告前的自检

- [ ] 报告 §0 显示 `✅ 各对象运行参数完全一致`（若出现 ⚠️ 不一致/quick，作废重跑 Step 3）
- [ ] §0 的 think_level 列全部为 `low`
- [ ] §8 差距判定表每行都有数值（没有 `—`）
- [ ] §5 有本环境的"聚合吞吐上限/饱和点/有效并行路数"
- [ ] 若服务响应里的 `model` 与请求不一致（别名路由），§0 model 列会有 `x → y` 映射
      （bench 自动记录 `meta.model_actual`）
- [ ] 报告是纯本地生成的（report.py 不发网络请求）

## 3. 口径说明（解读报告必须知道的事实）

1. **为什么统一用 low**：实测网关 `think_level=off` 并没有真关思考——content 只有
   "9.9" 却计 ~150 completion token，且响应不返回 reasoning 字段（隐藏思考）；
   而 DeepSeek 无思考档（别名）只有 3 token。两者直接比 = 工作量不等，端到端延迟差距
   是口径假象（口径A 曾测得 1.6×，对齐后实测 **1.0× 打平**）。
2. **已验证的稳定结论（口径对齐后依然成立）**：网关 **TTFT 差 DeepSeek ~5.7×**
   （1327ms vs 232ms），且换思考档几乎不变——归因于网关响应缓冲/攒批发，
   与思考、与模型无关。**这是本网关最核心的缺陷指标。**
3. **判读方向**：若内网 TTFT/预填充/聚合吞吐显著优于公网 → 公网链路/网关是瓶颈；
   若持平 → 瓶颈在服务端（模型副本、转发池），与网络无关。
   `steady_decode`（稳态解码）与网络弱相关，是"模型本身"的参照线。
4. **工作量核对**：报告 §7/附录可比对双方 `completion_tokens` 量级（low 档下网关
   ~145 vs DS ~141，应当接近）；若内网数值明显异常，先查思考档位是否真的生效。

## 4. 常见故障

| 现象 | 处理 |
|---|---|
| 401 `missing API key` | key 错/没带；确认 `Authorization: Bearer` 头（bench 已实现） |
| 404 `route not found` | base_url 少了路径前缀；用 `/models` 探活再填 |
| `think_level` 报错不认识 | 把 target 的 `supports_think` 改 false（同时与操作员确认口径怎么替代） |
| `effort` 报错 | 删掉该 target 的 `extra_fields` |
| 连接超时/代理 | 内网可能要绕过系统代理；检查环境变量 `HTTP_PROXY/HTTPS_PROXY` |
| 某节 `SECTION ERROR` | 看 `meta.section_errors`；偶发网络错误可 `--only 该节` 补跑，再决定是否整轮重跑 |
| 内网只有 quick 时间 | `--quick` 可跑，但报告会标 ⚠️ 不建议出正式结论 |

## 5. 禁止事项

- ❌ 修改 `suite` 参数、`bench.py`、`report.py`（三方可比性的根基；如确有必要，必须同步
  重跑全部基线，并把 JSON 里 `meta.kit_version` 改为新版本号且在报告中注明）
- ❌ 改动思考档位口径（必须 low；勿把内网或基线改成 off/其他档）
- ❌ 删除或覆盖 `results/` 中已有的基线文件
- ❌ 把完整 API key 写进报告（bench 已自动脱敏，保持即可）
- ❌ 用不同 `max_tokens`/prompt"优化"测试——所有 case 的意义就是不可改
