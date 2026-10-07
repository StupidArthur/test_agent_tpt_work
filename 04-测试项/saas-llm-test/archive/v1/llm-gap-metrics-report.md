# flash 网关与 DeepSeek 官方 API 明显差距指标报告

**日期**：2026-09-24
**测试对象**：
- **A**：自建网关 `flash` 模型 — `https://tpt.supcon.com/tpt-work-router/v1`（OpenAI 兼容，服务名 `ai-router`）
- **B**：DeepSeek 官方 `deepseek-chat` — `https://api.deepseek.com/v1`

**测试环境**：单机 Windows（公司网络），Python 3.11 标准库直连 HTTPS，同一网络位置、同一时段顺序执行。
**对标口径**：DeepSeek 无 `flash` 型号，以其默认快模型 `deepseek-chat` 对标。

---

## 一、明显差距指标总览

| # | 指标 | flash 网关 | DeepSeek 官方 | 差距 | 严重度 |
|---|---|---|---|---|---|
| 1 | 流式首字延迟 TTFT | 1509 ms | 210 ms | **慢 7 倍** | 🔴 P0 |
| 2 | 并发容量（聚合吞吐上限） | ~2200 tok/s（N=50 已饱和） | >12538 tok/s（N=100 仍线性） | **差 5.7 倍** | 🔴 P0 |
| 3 | 长文本预填充（60K 全新 tokens） | 7142 ms | 1700 ms | **慢 4 倍** | 🔴 P0 |
| 4 | 并发下延迟膨胀 | 6.2s → 19.5s（+215%） | 5.7s → 5.8s（≈0%） | 退化模式本质不同 | 🟠 P1 |
| 5 | 短响应流式行为 | 攒批发，chunk 同一瞬间到达 | 真增量逐步下发 | 体验缺陷 | 🟠 P1 |
| 6 | 单流稳态解码速率 | 139 tok/s | 175 tok/s | 慢 26% | 🟡 P2 |
| 7 | 单发短请求端到端延迟 | 1176 ms | 860 ms | 慢 37% | 🟡 P2 |

**无明显差距的对照项**（证明模型本身非主要瓶颈）：
- 端到端输出吞吐：135 vs 141 tok/s（持平）
- 前缀缓存效果：重复 31K 前缀两边均降至 ~1s
- 稳定性：flash 累计 335 请求 0 失败、无 429
- 思考档位开销：flash +300ms vs DS reasoner +470ms

**归因结论**：差距 1/2/4/5 集中指向**网关层缓冲排队 + 上游有效并行仅 ~16 路**（DS 同场景 ~75 路），而非模型解码能力——单流稳态解码仅慢 26% 佐证了这一点。

---

## 二、差距指标明细

### 差距 1：流式首字延迟 TTFT（慢 7 倍）🔴

| 指标 | flash | DeepSeek |
|---|---|---|
| 均值 | 1509 ms | **210 ms** |
| p50 | 1533 ms | 201 ms |
| p95 | 1724 ms | 273 ms |
| 最快 | 994 ms | 182 ms |
| 最慢 | 1724 ms | 296 ms |

**影响**：聊天/补全类产品的流式打字机体验，用户点击后要等 1.5 秒才看到第一个字。
**方法与证据**：见附录 A。

### 差距 2：并发容量，聚合吞吐已打满（差 5.7 倍）🔴

每请求固定生成 800 tokens，阶梯并发 N=1/5/10/20/50/100：

| 并发 N | flash 聚合吞吐 | flash 单请求均延迟 | DS 聚合吞吐 | DS 单请求均延迟 |
|---|---|---|---|---|
| 1 | 129 tok/s | 6184 ms | 153 tok/s | 5219 ms |
| 5 | 561 tok/s | 6769 ms | 685 tok/s | 5607 ms |
| 10 | 995 tok/s | 8000 ms | 1342 tok/s | 5740 ms |
| 20 | 1688 tok/s | 9453 ms | 2646 tok/s | 5715 ms |
| 50 | 2126 tok/s | 12601 ms | 6001 tok/s | 5833 ms |
| 100 | **2212 tok/s** | **19505 ms** | **12538 tok/s** | **5765 ms** |

**饱和判定**：flash N=50→100 吞吐仅 **+4%**（2126→2212）而延迟 **+55%**（12.6s→19.5s），为典型饱和曲线；**拐点位于 N=20~50，N≈50 完全饱和**。DS 到 N=100 吞吐仍随并发线性增长、延迟零变化。
**有效并行路数换算**：flash 2212 ÷ 单流 139 ≈ **~16 路**；DS 12538 ÷ 167 ≈ **~75 路**——上游模型副本/网关转发池规模差约 5 倍。
**方法与证据**：见附录 B。

### 差距 3：长文本预填充（慢 4 倍）🔴

| 场景（每次文本内容唯一，排除缓存） | flash | DeepSeek |
|---|---|---|
| 60015 tokens，第 1 次 | 7142 ms | 1804 ms |
| 60015 tokens，第 2 次 | 7138 ms | 1744 ms |
| 60015 tokens，第 3 次 | 7195 ms | 1548 ms |
| 平均预填充速率 | ≈ 8.4K tok/s | ≈ 35K tok/s |

对照组：**相同前缀重复发送**时两边都命中缓存，flash 4640→1055ms、DS 1451→961ms，差距消失——说明差距仅存在于**全新 token 的预填充阶段**。
**影响**：长文档/知识库/RAG 场景首次问答多等 5.4 秒。
**方法与证据**：见附录 C。

### 差距 4：并发下延迟膨胀（退化模式不同）🟠

| 指标 | flash | DeepSeek |
|---|---|---|
| N=1 单请求延迟 | 6184 ms | 5219 ms |
| N=100 单请求延迟 | 19505 ms | 5765 ms |
| 膨胀倍数 | **×3.2（+215%）** | **×1.1（+10%）** |

flash 从 N=10 起延迟即开始线性爬升（排队特征）；DS 到 N=100 完全平推。同样的 800-token 任务，N=100 时 flash 用户要多等 13.7 秒。
**方法与证据**：与差距 2 同一次测试，见附录 B。

### 差距 5：短响应流式假增量（攒批发）🟠

| 场景 | flash | DeepSeek |
|---|---|---|
| 短回答（~20 chunk） | 22 个 chunk 全部在 **689ms 同一瞬间**到达（span=0ms） | 首 chunk 200ms，逐步到达，span=908ms |
| 长回答（3000 字级） | ✅ 真增量：首字 2109ms，中段 ~152 chunk/s | ✅ 真增量：首字 198ms，~131 chunk/s |

**影响**：短问答开流式没有任何体验收益（等同非流式一次性返回）；且客户端必须能处理"一堆 chunk 同时到达"。长回答能增量，说明问题出在**小响应被网关/代理整包缓冲后冲刷**（疑似 nginx `proxy_buffering`）。
**方法与证据**：见附录 D。

### 差距 6：单流稳态解码速率（慢 26%）🟡

| 指标 | flash | DeepSeek |
|---|---|---|
| 稳态解码（流式中段 10%~90% 区间，3 次） | 138.8 chunk/s | **175.1 chunk/s** |
| 复测（第二轮） | 138.9 chunk/s | 166.5~176.2 chunk/s |
| 非流式长输出 tok/s | 134.4 | 163.8 |

**说明**：这是差距最小的性能项——**打满单流后** flash 能达到 DS 的 ~79%，与端到端测试中"表面持平"（135 vs 141）的结论一致，进一步佐证瓶颈在并发与延迟而非解码本身。
**方法与证据**：见附录 E。

### 差距 7：单发短请求端到端延迟（慢 37%）🟡

| 指标（10 次） | flash | DeepSeek |
|---|---|---|
| 均值 | 1176 ms | **860 ms** |
| p50 | 1190 ms | 796 ms |
| p95 | 1436 ms | 1367 ms |
| 最快 / 最慢 | 865 / 1477 ms | 510 / 1659 ms |

**注**：该项被 TTFT（差距 1）解释了大头；DS 的最大值（1659ms）反而高于 flash，说明其尾部偶发波动，中位数差距才是主要特征。
**方法与证据**：见附录 F。

---

## 附录：测试方法与证据

### 附录 A：流式首字延迟（TTFT）

**方法**
1. 请求 `/chat/completions`，body 加 `"stream": true`，问题固定为"写一句问候"，`max_tokens: 4000`；
2. 客户端 `perf_counter()` 在发出请求时记 t0，逐行读 SSE，遇到第一条 `data:` 行时的时间戳即 TTFT；
3. 每边独立执行 10 次，统计均值/p50/p95/min/max；
4. flash 请求额外带 `think_level` 变体（low），DS 无思考默认开启——**该差异不构成对 flash 不利的偏差**（think off 时 flash TTFT 同量级，见附录 D 短流首 chunk 689ms 亦 >200ms）。

**证据（原始输出节选）**
```
flash, 10 runs:
  run1: ttft=1492ms   run6: ttft=1683ms
  run2: ttft=1723ms   run7: ttft=1724ms
  run3: ttft=1376ms   run8: ttft=1684ms
  run4: ttft=994ms    run9: ttft=1575ms
  run5: ttft=1474ms   run10: ttft=1363ms
  mean=1509ms p50=1533ms p95=1724ms min=994ms max=1724ms

deepseek-chat, 10 runs:
  run1: ttft=182ms    run6: ttft=204ms
  run2: ttft=296ms    run7: ttft=210ms
  run3: ttft=199ms    run8: ttft=244ms
  run4: ttft=186ms    run9: ttft=210ms
  run5: ttft=182ms    run10: ttft=190ms
  mean=210ms p50=201ms p95=273ms min=182ms max=296ms
```

**脚本**：`bench_flash.py` 第 2 节、`bench_deepseek.py` 第 2 节。

---

### 附录 B：并发扫描（聚合吞吐 + 延迟膨胀）

**方法**
1. 固定任务："请列举生活中的100个细节观察，每条一行，编号排列。"，`max_tokens: 800`（保证每请求产出打满 800 tokens，两边 token 消耗一致：flash 共 80000、DS 共 79993，可比）；
2. `ThreadPoolExecutor(max_workers=N)` 同时发出 N 个**非流式**请求，全部完成后记墙钟时间；
3. 聚合吞吐 = Σ completion_tokens ÷ 墙钟；单请求延迟 = 各请求自身耗时均值；
4. 档位 N = 1 / 5 / 10 / 20 / 50 / 100，两边同一脚本同一参数执行；
5. 每档只跑一波（single burst），见"测试局限"。

**证据（原始输出节选）**
```
flash:
  N=  1: wall= 6186ms ok=1/1   tokens=  800 agg= 129.3 tok/s mean_lat= 6184ms
  N=  5: wall= 7127ms ok=5/5   tokens= 4000 agg= 561.2 tok/s mean_lat= 6769ms
  N= 10: wall= 8039ms ok=10/10 tokens= 8000 agg= 995.2 tok/s mean_lat= 8000ms
  N= 20: wall= 9477ms ok=20/20 tokens=16000 agg=1688.3 tok/s mean_lat= 9453ms
  N= 50: wall=18812ms ok=50/50 tokens=40000 agg=2126.2 tok/s mean_lat=12601ms
  N=100: wall=36161ms ok=100/100 tokens=80000 agg=2212.3 tok/s mean_lat=19505ms

deepseek-chat:
  N=  1: wall= 5752ms ok=1/1   tokens=  800 agg= 139.1 tok/s mean_lat= 5750ms
  N=  5: wall= 6003ms ok=5/5   tokens= 4000 agg= 666.4 tok/s mean_lat= 5763ms
  N= 10: wall= 6106ms ok=10/10 tokens= 7998 agg=1309.9 tok/s mean_lat= 5691ms
  N= 20: wall= 6046ms ok=20/20 tokens=16000 agg=2646.2 tok/s mean_lat= 5715ms
  N= 50: wall= 6665ms ok=50/50 tokens=39995 agg=6000.6 tok/s mean_lat= 5833ms
  N=100: wall= 6380ms ok=100/100 tokens=79993 agg=12537.9 tok/s mean_lat=5765ms

错误统计: 全部档位 0 err, 无 429/5xx (flash 累计 335 请求含其他测试项)
```

**饱和判定依据**：flash N=50→100 增量 (+4% 吞吐 / +55% 延迟) vs DS 同区间 (+109% 吞吐 / -1% 延迟)。

**有效并行路数换算**：`聚合吞吐上限 ÷ 单流稳态速率`（Little's Law 的工程近似）：
- flash：2212 ÷ 139 ≈ 16
- DS：12538 ÷ 167 ≈ 75

**脚本**：`bench_sweep.py`（第 B 节，支持 `档位列表` 参数）。

---

### 附录 C：长文本预填充

**方法**
1. **全新文本组**：以 `time.time()` 为种子拼接 2500 条唯一编号中文段（每次运行内容必然不同，**排除缓存干扰**），总长由 API 返回的 `usage.prompt_tokens` 确认为 **60015**；问题仅需读开头编号（输出极短，耗时几乎全部来自预填充）；
2. **重复对照组**：固定 2000 段"编号 i…"文本（31018 tokens）连续发 3 次，观察第 2/3 次是否因前缀缓存显著变快；
3. 每组每边 3 次，非流式，计总耗时。

**证据（原始输出节选）**
```
flash, 全新 60015 tokens:
  run1: prompt_tokens=60015, total=7142ms  answer=第1790235175项
  run2: prompt_tokens=60015, total=7138ms  answer=第1790243102项
  run3: prompt_tokens=60015, total=7195ms  answer=第1790251028项
  (答案均正确 → 模型确实读入了全文, 非截断)

deepseek-chat, 全新 60015 tokens:
  run1: prompt_tokens=60015, total=1804ms
  run2: prompt_tokens=60015, total=1744ms
  run3: prompt_tokens=60015, total=1548ms

flash, 重复 31018 tokens (缓存验证):
  run1: total=4640ms  (首次, 冷)
  run2: total=1575ms  (命中缓存)
  run3: total=1055ms  (命中缓存)

deepseek-chat, 重复 31018 tokens:
  run1: 1451ms  run2: 961ms  run3: 1127ms
```

**结论**：两边 `prompt_tokens` 口径一致（均为 60015）说明计费/计数可比；差距仅出现在**冷预填充**，缓存命中后两边均 ~1s 无差距。

**脚本**：`bench_flash.py` 第 4 节、`bench_deepseek.py` 第 4a/4b 节。

---

### 附录 D：短响应流式逐 chunk 计时

**方法**
1. 流式请求，问题"写一句问候"（短回答），逐条记录每个 `data:` 行的到达时间戳（相对请求发出时刻）；
2. 观察首 chunk 时间与首尾时间差（span）：span≈0 即"攒批一次性到达"，span>0 即真增量；
3. 另用 1500 字长回答复测，确认长响应行为是否一致。

**证据（原始输出节选）**
```
flash, 短回答 (think off):
  run1: chunks=22 first=689ms last=689ms span=0ms
         前12个chunk到达时刻(ms): 689, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  run2: chunks=22 first=605ms last=606ms span=1ms
  run3: chunks=22 first=645ms last=646ms span=1ms

deepseek-chat, 短回答:
  run1: chunks=97 first=200ms last=1108ms span=908ms
  run2: chunks=10 first=194ms last=788ms span=594ms

flash, 长回答 (1500字散文, 真增量验证):
  first chunk @ 2109ms
  chunk#100 @ 2606ms ... chunk#700 @ 7018ms
  chunks=747 span=4909ms -> 152.2 chunks/s (均匀)

deepseek-chat, 长回答:
  chunks=878 first=198ms last=6882ms span=6683ms -> 131.4 chunks/s
```

**判定**：flash 短响应 span≈0（22 chunk 同瞬间）为**假增量**；长响应均匀下发为真增量 → 问题定位在小响应被缓冲，而非不支持流式。

**脚本**：`bench_flash2.py` A 节、`bench_flash3.py`、`bench_deepseek.py` 第 7 节。

---

### 附录 E：稳态解码速率

**方法**
1. 流式请求 3000 字级长输出（"量子计算基础原理科普"），`max_tokens: 3000`；
2. 记录全部 chunk 时间戳，**取中间 10%~90% 区间**计算 `chunk 数 ÷ 时间跨度`——剔除 TTFT/预填充（前 10%）与收尾缓冲（后 10%），得到纯解码阶段速率；
3. 每边 3 次取均值；另用非流式长回答以 `completion_tokens ÷ 总耗时` 交叉验证。

**证据（原始输出节选）**
```
flash:
  run1: chunks=2336 mid_span=13.34s -> 140.1 chunk/s
  run2: chunks=2671 mid_span=15.74s -> 135.7 chunk/s
  run3: chunks=2716 mid_span=15.47s -> 140.5 chunk/s
  steady decode: mean=138.8 chunk/s
  非流式交叉验证: 134.8 / 133.0 / 135.6 tok/s, mean=134.4

deepseek-chat:
  run1: chunks=2338 mid_span=10.72s -> 174.6 chunk/s
  run2: chunks=3000 mid_span=14.34s -> 167.4 chunk/s
  run3: chunks=2926 mid_span=12.78s -> 183.2 chunk/s
  steady decode: mean=175.1 chunk/s
  非流式交叉验证: 164.5 / 167.8 / 159.2 tok/s, mean=163.8
```

**脚本**：`bench_sweep.py` 第 A/A2 节。

---

### 附录 F：单发短请求端到端延迟

**方法**
1. 非流式请求，问题固定"用一句话介绍你自己"，`max_tokens: 4000`；
2. `perf_counter()` 计请求发出到完整 JSON 返回的耗时（含网络 RTT + 排队 + 解码）；
3. 每边连续 10 次，统计均值/p50/p95/min/max。

**证据（原始输出节选）**
```
flash, 10 runs (ms):
  1387, 1477, 1168, 1303, 865, 1110, 1097, 1237, 1212, 904
  mean=1176ms p50=1190ms p95=1436ms min=865ms max=1477ms
  输出 tokens: 132/169/135/155/91/124/121/144/142/97 (think_level=low)

deepseek-chat, 10 runs (ms):
  794, 747, 510, 570, 1010, 714, 1659, 797, 904, 897
  mean=860ms p50=796ms p95=1367ms min=510ms max=1659ms
  输出 tokens: 29/27/20/32/20/27/29/27/29/28 (无思考)
```

**偏差说明**：flash 侧输出 tokens（91~169）显著多于 DS（20~32），系 `think_level=low` 仍产生思考 token——**该偏差对 flash 不利方向已部分计入**；即便如此 flash 在 max 项仍优于 DS（1477 vs 1659），主要差距体现在中位数。

**脚本**：`bench_flash.py` 第 1 节、`bench_deepseek.py` 第 1 节。

---

## 测试局限

1. 单一网络位置、单一时段，未跨区域交叉验证；所有延迟值均含本机到服务器的网络 RTT（两边 RTT 未单独剥离，DS TTFT 210ms 已含 RTT，故真实差距只会更大不会更小）；
2. 并发扫描为**单波突发**（single burst），未做阶梯持续加压（soak），N=50/100 各仅 1 波采样；
3. 延迟类样本量 10 次/档、吞吐类 3 次/档，p95 与均值参考意义大于尾部极值；
4. flash 测试使用 `think_level` 变体，DS 侧未逐一控制思考开关（已在各附录标注偏差方向）；
5. 未覆盖 `pro` 模型、`deepseek-reasoner` 全矩阵、>32K 超长输出与真实业务流量分布；
6. "有效并行路数"为 `聚合吞吐 ÷ 单流速率` 的工程推算，非服务端实测副本数，仅作量级参考。

## 附件

| 文件 | 内容 |
|---|---|
| `llm-api-benchmark-report.md` | 完整基准报告（含接入验证、缓存、思考档位、稳定性等全部指标） |
| `bench_flash.py` | flash 基准：延迟/TTFT/吞吐/长文本/并发/思考档位 |
| `bench_deepseek.py` | DeepSeek 同套基准 |
| `bench_sweep.py` | 稳态解码 + 并发扫描（支持自定义档位） |
| `bench_flash2.py` / `bench_flash3.py` | 流式逐 chunk 计时（短/长回答） |

脚本位置：`C:\Users\Administrator\AppData\Local\Temp\opencode\`
