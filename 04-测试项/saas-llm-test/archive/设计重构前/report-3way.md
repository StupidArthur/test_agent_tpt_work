# LLM 性能对比报告

**生成时间**：2026-09-27 10:53  
**套件版本**：kit 1.0.0（同 prompt / 同参数 / 同统计口径，结果可直接横比）  
**对比对象**：flash网关(公网,think=low) vs deepseek-flash(effort=low) vs 内网环境

## 0. 测试对象

| 对象 | model | endpoint | think_level | 开始时间(UTC) | 总耗时 | key |
|---|---|---|---|---|---|---|
| **flash网关(公网,think=low)** | flash | `https://tpt.supcon.com/tpt-work-router/v1` | low | 2026-09-27T02:31:34+00:00 | 326.9s | sk-gw-e9...1eea |
| **deepseek-flash(effort=low)** | deepseek-flash | `https://api.deepseek.com/v1` | — | 2026-09-27T02:37:09+00:00 | 210.8s | sk-94491...6870 |
| **内网环境** | flash | `http://nlb-2weu6cb4a97uoz9cqu39kvmj.nlb.cn-beijing.volces.com:30880/v1` | low | 2026-09-27T02:47:50+00:00 | 321.9s | sk-gw-fc...427d |

> ✅ 各对象运行参数完全一致（suite 相同），结果可直接横比。

## 1. 延迟

| 指标 | flash网关(公网,think=low) | deepseek-flash(effort=low) | 内网环境 |
|---|---|---|---|
| 短请求均值 (ms) | 1253 | 1287 | 1091 |
| 短请求 p50 (ms) | 1217 | 1307 | 1026 |
| 短请求 p95 (ms) | 1461 | 1619 | 1371 |
| **TTFT 均值 (ms)** | 1349 | 199 | 921 |
| TTFT p50 (ms) | 1381 | 179 | 872 |
| TTFT p95 (ms) | 1673 | 280 | 1099 |

**TTFT 差距**：flash网关(公网,think=low) / deepseek-flash(effort=low) = **6.8×**（1349ms vs 199ms）

## 2. 吞吐

| 指标 | flash网关(公网,think=low) | deepseek-flash(effort=low) | 内网环境 |
|---|---|---|---|
| 稳态解码 (chunk/s) | 138 | 175 | 137 |
| 非流式长输出 (tok/s) | 136 | 163 | 137 |
| 1500字端到端 (tok/s) | 137 | 134 | 135 |

**单流解码差距**：deepseek-flash(effort=low) / 内网环境 = **1.3×**（175 vs 137 chunk/s）

## 3. 长文本预填充

| 指标 | flash网关(公网,think=low) | deepseek-flash(effort=low) | 内网环境 |
|---|---|---|---|
| 全新 60K 均值 (ms) | 6738 | 2105 | 6422 |
| 全新文本 prompt_tokens | 57516 | 57542 | 57516 |
| 重复31K 首次 (ms) | 1175 | 2088 | 940 |
| 重复31K 缓存命中 (ms) | 970 | 2245 | 1021 |

**冷预填充差距**：flash网关(公网,think=low) / deepseek-flash(effort=low) = **3.2×**（6738ms vs 2105ms；缓存命中后差距见上表末行）

## 4. 并发扫描（每请求 800 tokens）

| 并发 | flash网关(公网,think=low) | deepseek-flash(effort=low) | 内网环境 |
|---|---|---|---|
| N=1 | 134.5 tok/s / 5949ms (1✓ 0✗) | 150.6 tok/s / 5311ms (1✓ 0✗) | 134.9 tok/s / 5931ms (1✓ 0✗) |
| N=5 | 577.1 tok/s / 6630ms (5✓ 0✗) | 679.1 tok/s / 5664ms (5✓ 0✗) | 494.4 tok/s / 8083ms (5✓ 0✗) |
| N=10 | 995.4 tok/s / 7627ms (10✓ 0✗) | 1226.3 tok/s / 5588ms (10✓ 0✗) | 849.8 tok/s / 9046ms (10✓ 0✗) |
| N=20 | 1609.3 tok/s / 8671ms (19✓ 1✗) | 2543.3 tok/s / 5595ms (20✓ 0✗) | 1314.1 tok/s / 10071ms (20✓ 0✗) |
| N=50 | 2168.7 tok/s / 12241ms (50✓ 0✗) | 6210.1 tok/s / 5572ms (50✓ 0✗) | 2148.1 tok/s / 12522ms (50✓ 0✗) |
| N=100 | 2236.4 tok/s / 19041ms (97✓ 3✗) | 12864.5 tok/s / 5511ms (100✓ 0✗) | 2211.7 tok/s / 19673ms (100✓ 0✗) |

> 单元格 = 聚合吞吐 / 单请求均延迟 (成功✓ 失败✗)

## 5. 容量与退化分析

| 对象 | 聚合吞吐上限 | 延迟膨胀(首档→末档) | 饱和点 | 有效并行路数 | 总错误数 |
|---|---|---|---|---|---|
| flash网关(公网,think=low) | **2236** tok/s | ×3.2 | N=100 | ~16 | 4 |
| deepseek-flash(effort=low) | **12864** tok/s | ×1.0 | 未饱和 | ~74 | 0 |
| 内网环境 | **2212** tok/s | ×3.3 | N=100 | ~16 | 0 |

> 有效并行路数 = 聚合吞吐上限 ÷ 稳态单流速率（工程近似，非服务端实测副本数）

## 6. 流式行为

| 对象 | 短回答(首尾span/判定) | 长回答增量速率 |
|---|---|---|
| flash网关(公网,think=low) | 0.3ms → 攒批(假增量) | 150/s |
| deepseek-flash(effort=low) | 861ms → 真增量 | 127/s |
| 内网环境 | 600ms → 真增量 | 139/s |

## 7. 思考档位开销

| 档位 | flash网关(公网,think=low) | 内网环境 |
|---|---|---|
| off | 1209ms / 136tok | 1131ms / 136tok |
| low | 1189ms / 132tok | 1088ms / 135tok |
| medium | 1573ms / 187tok | 877ms / 106tok |
| high | 1083ms / 112tok | 1126ms / 139tok |

> 单元格 = 均值延迟 / 平均输出 tokens

## 8. 差距判定汇总

| 指标 | 最优 | 最差 | 差距 | 判定 |
|---|---|---|---|---|
| 流式首字延迟 TTFT (ms, 越低越好) | 199（deepseek-flash(effort=low)） | 1349（flash网关(公网,think=low)） | **6.8×** | 🔴 明显差距 |
| 单发短请求延迟 (ms, 越低越好) | 1091（内网环境） | 1287（deepseek-flash(effort=low)） | **1.2×** | ✅ 基本相当 |
| 稳态解码 (chunk/s, 越高越好) | 175（deepseek-flash(effort=low)） | 137（内网环境） | **1.3×** | ✅ 基本相当 |
| 冷预填充 60K (ms, 越低越好) | 2105（deepseek-flash(effort=low)） | 6738（flash网关(公网,think=low)） | **3.2×** | 🔴 明显差距 |
| 聚合吞吐上限 (tok/s, 越高越好) | 12864（deepseek-flash(effort=low)） | 2212（内网环境） | **5.8×** | 🔴 明显差距 |
| 并发末档延迟 (ms, 越低越好) | 5511（deepseek-flash(effort=low)） | 19673（内网环境） | **3.6×** | 🔴 明显差距 |

> 判定阈值：≥3× 🔴 明显差距，1.5~3× 🟠 中等差距，<1.5× ✅ 基本相当

---

## 附录 A：测试方法

### A1. `short_latency`

非流式请求, 固定 prompt『用一句话介绍你自己』, max_tokens=4000; perf_counter 计『发出请求→完整 JSON 返回』耗时(含 RTT/排队/解码); 每 target 连续 10 次, 统计 mean/p50/p95/min/max。

### A2. `ttft`

流式请求(固定 prompt『写一句问候』), 逐行读 SSE, 首条 data: 行的到达时间戳即 TTFT; 每 target 10 次, 统计均值分位。

### A3. `throughput`

非流式 1500 字级长回答(『写一篇约1500字的散文，主题是秋天』); tok/s = usage.completion_tokens ÷ 端到端耗时(含首字延迟); 3 次取均值。

### A4. `prefill`

两组: ①重复组—固定 31K tokens 文本连发, 第 2/3 次观察前缀缓存; ②全新组—以 time.time() 为种子生成内容唯一文本(排除缓存), 以 usage.prompt_tokens 确认长度, 输出极短使耗时几乎全为预填充; 每组 3 次。

### A5. `concurrency_short`

ThreadPoolExecutor 同时发 10 个短请求(『回答：1+1=?』), 记录墙钟、成功率、单请求延迟分位。

### A6. `think_levels`

固定问题(『9.11和9.9哪个大？只答数字』), 对支持 think_level 的 target 依次以 off/low/medium/high 各发 3 次, 比较延迟与输出 token 数; 不支持的 target 标记 skipped。

### A7. `steady_decode`

流式 3000 字级长输出, 取时间戳序列中间 10%~90% 区间计算 chunk/s —— 剔除 TTFT/预填充(前10%)与收尾缓冲(后10%), 得到纯解码阶段速率; 3 次取均值。这是与并发无关的『模型吐字速度』口径。

### A8. `nonstream_long`

同一 3000 字 prompt 非流式, tok/s = completion_tokens ÷ 总耗时; 与 steady_decode 交叉验证。

### A9. `stream_timing`

逐 chunk 记录到达时间戳: 短回答看首尾时间差 span(span≤50ms 判定为攒批/假增量), 长回答看中段均匀速率(是否真增量)。

### A10. `sweep`

阶梯并发 N∈{1,5,10,20,50,100}, 每请求固定生成 800 tokens(『请列举生活中的100个细节观察…』), 单波突发(single burst): 聚合吞吐 = Σcompletion_tokens ÷ 墙钟; 同时记单请求均延迟与错误数。饱和判定: 相邻两档吞吐增幅<10% 且延迟增幅>20% → 记为饱和点。有效并行路数 = 聚合吞吐上限 ÷ steady_decode 单流速率(工程近似)。

---

## 附录 B：原始证据（逐次运行数据，节选前 4000 字符）

### flash网关(公网,think=low)

- 文件: `results/flash-public-low_20260927-023134.json`  
- endpoint: `https://tpt.supcon.com/tpt-work-router/v1` / model `flash`  
- kit 1.0.0, started 2026-09-27T02:31:34+00:00, quick=False, host=Windows-10-10.0.26200-SP0, key=sk-gw-e9...1eea

**short_latency**

```json
{
  "runs_ms": [
    1053.9,
    1363.5,
    1136.8,
    1348.1,
    1410.9,
    1115.2,
    1181.6,
    1165.7,
    1502.8,
    1252.2
  ],
  "out_tokens": [
    113,
    154,
    131,
    161,
    170,
    125,
    136,
    131,
    168,
    134
  ],
  "stats_ms": {
    "mean": 1253.1,
    "p50": 1216.9,
    "p95": 1461.4,
    "min": 1053.9,
    "max": 1502.8
  }
}
```

**ttft**

```json
{
  "runs": [
    {
      "ttft_ms": 1137.7,
      "total_ms": 1138.1,
      "chunks": 17
    },
    {
      "ttft_ms": 1586.6,
      "total_ms": 2089.4,
      "chunks": 134
    },
    {
      "ttft_ms": 1744.1,
      "total_ms": 1767.7,
      "chunks": 74
    },
    {
      "ttft_ms": 1562.0,
      "total_ms": 2094.8,
      "chunks": 135
    },
    {
      "ttft_ms": 1540.2,
      "total_ms": 2225.0,
      "chunks": 167
    },
    {
      "ttft_ms": 1367.0,
      "total_ms": 1590.3,
      "chunks": 101
    },
    {
      "ttft_ms": 979.6,
      "total_ms": 979.9,
      "chunks": 23
    },
    {
      "ttft_ms": 1395.7,
      "total_ms": 1884.1,
      "chunks": 139
    },
    {
      "ttft_ms": 830.4,
      "total_ms": 830.8,
      "chunks": 32
    },
    {
      "ttft_ms": 1348.4,
      "total_ms": 1940.9,
      "chunks": 154
    }
  ],
  "stats_ms": {
    "mean": 1349.2,
    "p50": 1381.3,
    "p95": 1673.2,
    "min": 830.4,
    "max": 1744.1
  }
}
```

**throughput**

```json
{
  "runs": [
    {
      "total_ms": 9755.2,
      "completion_tokens": 1344,
      "tok_per_s": 137.8
    },
    {
      "total_ms": 11473.0,
      "completion_tokens": 1567,
      "tok_per_s": 136.6
    },
    {
      "total_ms": 10351.0,
      "completion_tokens": 1426,
      "tok_per_s": 137.8
    }
  ],
  "mean_tok_per_s": 137.4
}
```

**prefill**

```json
{
  "repeated": [
    {
      "error": "<urlopen error [SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1006)>"
    },
    {
      "prompt_tokens": 29019,
      "total_ms": 1175.2
    },
    {
      "prompt_tokens": 29019,
      "total_ms": 969.8
    }
  ],
  "fresh": [
    {
      "prompt_tokens": 57516,
      "total_ms": 6727.5,
      "answer_head": "第1790476362项"
    },
    {
      "prompt_tokens": 57516,
      "total_ms": 6621.1,
      "answer_head": "第1790484287项"
    },
    {
      "prompt_tokens": 57516,
      "total_ms": 6866.7,
      "answer_head": "第1790492213项"
    }
  ],
  "fresh_mean_ms": 6738.4
}
```

**concurrency_short**

```json
{
  "n": 10,
  "wall_ms": 926.3,
  "ok": 10,
  "err": 0,
  "lat_ms": [
    846.8,
    923.8,
    517.6,
    720.0,
    883.9,
    877.5,
    826.8,
    898.1,
    771.4,
    567.5
  ],
  "mean_ms": 783.3,
  "p95_ms": 912.2,
  "errors": []
}
```

**think_levels**

```json
{
  "off": {
    "mean_ms": 1208.6,
    "mean_out_tokens": 136,
    "runs_ms": [
      869.5,
      1474.2,
      1282.0
    ]
  },
  "low": {
    "mean_ms": 1189.1,
    "mean_out_tokens": 132,
    "runs_ms": [
      1230.9,
      1108.8,
      1227.5
    ]
  },
  "medium": {
    "mean_ms": 1572.6,
    "mean_out_tokens": 187.3,
    "runs_ms": [
      1706.4,
      1290.3,
      1721.1
    ]
  },
  "high": {
    "mean_ms": 1082.9,
    "mean_out_tokens": 112.3,
    "runs_ms": [
      827.6,
      1671.8,
      749.3
    ]
  }
}
```

**steady_decode**

```json
{
  "runs": [
    {
      "chunks": 2859,
      "mid_chunk_per_s": 139.7,
      "completion_tokens": 2947
    },
    {
      "chunks": 2902,
      "mid_chunk_per_s": 138.7,
      "completion_tokens": 3000
    },
    {
      "chunks": 2603,
      "mid_chunk_per_s": 136.8,
      "completion_tokens": 2700
    }
  ],
  "mean_chunk_per_s": 138.4
}
```

**nonstream_long**

```json
{
  "runs": [
    {
      "total_ms": 20006.9,
      "completion_tokens": 2730,
      "tok_per_s": 136.5
    },
    {
      "total_ms": 22006.4,
      "completion_tokens": 3000,
      "tok_per_s": 136.3
    },
    {
      "total_ms": 22367.9,
      "completion_tokens": 3000,
      "tok_per_s": 134.1
    }
  ],
  "mean_tok_per_s": 135.6
}
```

**stream_timing**

```json
{
  "short": [
    {
      "chunks": 27,
      "first_ms": 1155.7,
      "last_ms": 1156.0,
      "span_ms": 0.3
    },
    {
      "chunks": 150,
      "first_ms": 1510.6,
      "last_ms": 2093.0,
      "span_ms": 582.3
    }
  ],
  "long": [
    {
      "chunks": 950,
      "first_ms": 1894.9,
      "span_ms": 6355.0,
      "chunk_per_s": 149.5
    }
  ]
}
```

**sweep**

```json
{
  "1": {
    "wall_ms": 5949.7,
    "ok": 1,
    "err": 0,
    "total_tokens": 800,
    "agg_tok_per_s": 134.5,
    "mean_lat_ms": 5949.0,
    "errors": []
  },
  "5": {
    "wall_ms": 6931.7,
    "ok": 5,
    "err": 0,
    "total_tokens": 4000,
    "agg_tok_per_s": 577.1,
    "mean_lat_ms": 6630.0,
    "errors": []
  },
  "10": {
    "wall_ms": 8037.0,
    "ok": 10,
    "err": 0,
    "total_tokens": 8000,
    "agg_tok_per_s": 995.4,
    "mean_lat_ms": 7627.3,
    "errors": []
  },
  "20": {
    "wall_ms": 9445.2,
    "ok": 19,
    "err": 1,
    "total_tokens": 15200,
    "agg_tok_per_s": 1609.3,
    "mean_lat_ms": 8671.0,
    "errors": [
      "<urlopen error [SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1006)>"
    ]
  },
  "50": {
    "wall_ms": 18444.4,
    "ok": 50,
    "err": 0,
    "total_tokens": 40000,
    "agg_tok_per_s": 2168.7,
    "mean_lat_ms": 12241.0,
    "errors": []
  },
  "100": {
    "wall_ms": 34698.0,
    "ok": 97,
    "err": 3,
    "total_tokens": 77600,
    "agg_tok_per_s": 2236.4,
    "mean_lat_ms": 19041.3,
    "errors": [
      "<urlopen error [SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1006)>",
      "<urlopen error [SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1006)>",
      "<urlopen error [SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1006)>"
    ]
  }
}
```

### deepseek-flash(effort=low)

- 文件: `results/deepseek-flash-low_20260927-023709.json`  
- endpoint: `https://api.deepseek.com/v1` / model `deepseek-flash`  
- kit 1.0.0, started 2026-09-27T02:37:09+00:00, quick=False, host=Windows-10-10.0.26200-SP0, key=sk-94491...6870

**short_latency**

```json
{
  "runs_ms": [
    1503.6,
    1460.0,
    848.4,
    1220.0,
    1385.9,
    1174.2,
    1690.7,
    1531.0,
    1228.4,
    823.6
  ],
  "out_tokens": [
    153,
    141,
    109,
    83,
    156,
    117,
    114,
    157,
    113,
    110
  ],
  "stats_ms": {
    "mean": 1286.6,
    "p50": 1307.2,
    "p95": 1618.8,
    "min": 823.6,
    "max": 1690.7
  }
}
```

**ttft**

```json
{
  "runs": [
    {
      "ttft_ms": 173.2,
      "total_ms": 755.2,
      "chunks": 85
    },
    {
      "ttft_ms": 161.1,
      "total_ms": 1013.1,
      "chunks": 74
    },
    {
      "ttft_ms": 162.8,
      "total_ms": 1202.4,
      "chunks": 101
    },
    {
      "ttft_ms": 174.1,
      "total_ms": 977.9,
      "chunks": 105
    },
    {
      "ttft_ms": 174.2,
      "total_ms": 840.3,
      "chunks": 60
    },
    {
      "ttft_ms": 219.3,
      "total_ms": 1078.8,
      "chunks": 71
    },
    {
      "ttft_ms": 187.0,
      "total_ms": 1134.1,
      "chunks": 87
    },
    {
      "ttft_ms": 289.3,
      "total_ms": 1249.3,
      "chunks": 92
    },
    {
      "ttft_ms": 268.8,
      "total_ms": 876.1,
      "chunks": 65
    },
    {
      "ttft_ms": 183.1,
      "total_ms": 835.6,
      "chunks": 64
    }
  ],
  "stats_ms": {
    "mean": 199.3,
    "p50": 178.6,
    "p95": 280.1,
    "min": 161.1,
    "max": 289.3
  }
}
```

**throughput**

```json
{
  "runs": [
    {
      "total_ms": 8235.9,
      "completion_tokens": 1145,
      "tok_per_s": 139.0
    },
    {
      "total_ms": 7619.7,
      "completion_tokens": 1066,
      "tok_per_s": 139.9
    },
    {
      "total_ms": 7667.8,
      "completion_tokens": 948,
      "tok_per_s": 123.6
    }
  ],
  "mean_tok_per_s": 134.2
}
```

**prefill**

```json
{
  "repeated": [
    {
      "prompt_tokens": 29045,
      "total_ms": 2088.4
    },
    {
      "prompt_tokens": 29045,
      "total_ms": 2078.9
    },
    {
      "prompt_tokens": 29045,
      "total_ms": 2411.2
    }
  ],
  "fresh": [
    {
      "prompt_tokens": 57542,
      "total_ms": 2126.7,
      "answer_head": "第1790476682项"
    },
    {
      "prompt_tokens": 57542,
      "total_ms": 2242.5,
      "answer_head": "第1790484603项"
    },
    {
      "prompt_tokens": 57542,
      "total_ms": 1945.8,
      "answer_head": "第1790492524项"
    }
  ],
  "fresh_mean_ms": 2105.0
}
```

**concurrency_short**

```json
{
  "n": 10,
  "wall_ms": 1079.0,
  "ok": 10,
  "err": 0,
  "lat_ms": [
    531.7,
    751.1,
    1075.7,
    534.5,
    804.0,
    786.4,
    734.7,
    834.1,
    993.9,
    765.8
  ],
  "mean_ms": 781.2,
  "p95_ms": 1038.9,
  "errors": []
}
```

**think_levels**

```json
{
  "skipped": "target 不支持 think_level"
}
```

**steady_decode**

```json
{
  "runs": [
    {
      "chunks": 2999,
      "mid_chunk_per_s": 164.1,
      "completion_tokens": 2999
    },
    {
      "chunks": 2997,
      "mid_chunk_per_s": 179.4,
      "completion_tokens": 3000
    },
    {
      "chunks": 2997,
      "mid_chunk_per_s": 181.1,
      "completion_tokens": 3000
    }
  ],
  "mean_chunk_per_s": 174.9
}
```

**nonstream_long**

```json
{
  "runs": [
    {
      "total_ms": 18332.7,
      "completion_tokens": 3000,
      "tok_per_s": 163.6
    },
    {
      "total_ms": 14743.1,
      "completion_tokens": 2311,
      "tok_per_s": 156.8
    },
    {
      "total_ms": 17655.8,
      "completion_tokens": 3000,
      "tok_per_s": 169.9
    }
  ],
  "mean_tok_per_s": 163.4
}
```

**stream_timing**

```json
{
  "short": [
    {
      "chunks": 81,
      "first_ms": 214.0,
      "last_ms": 1075.0,
      "span_ms": 861.0
    },
    {
      "chunks": 76,
      "first_ms": 334.8,
      "last_ms": 1220.7,
      "span_ms": 886.0
    }
  ],
  "long": [
    {
      "chunks": 857,
      "first_ms": 182.7,
      "span_ms": 6731.2,
      "chunk_per_s": 127.3
    }
  ]
}
```

**sweep**

```json
{
  "1": {
    "wall_ms": 5311.7,
    "ok": 1,
    "err": 0,
    "total_tokens": 800,
    "agg_tok_per_s": 150.6,
    "mean_lat_ms": 5311.0,
    "errors": []
  },
  "5": {
    "wall_ms": 5890.3,
    "ok": 5,
    "err": 0,
    "total_tokens": 4000,
    "agg_tok_per_s": 679.1,
    "mean_lat_ms": 5664.2,
    "errors": []
  },
  "10": {
    "wall_ms": 6523.4,
    "ok": 10,
    "err": 0,
    "total_tokens": 8000,
    "agg_tok_per_s": 1226.3,
    "mean_lat_ms": 5587.8,
    "errors": []
  },
  "20": {
    "wall_ms": 6289.9,
    "ok": 20,
    "err": 0,
    "total_tokens": 15997,
    "agg_tok_per_s": 2543.3,
    "mean_lat_ms": 5595.1,
    "errors": []
  },
  "50": {
    "wall_ms": 6440.5,
    "ok": 50,
    "err": 0,
    "total_tokens": 39996,
    "agg_tok_per_s": 6210.1,
    "mean_lat_ms": 5571.5,
    "errors": []
  },
  "100": {
    "wall_ms": 6218.4,
    "ok": 100,
    "err": 0,
    "total_tokens": 79997,
    "agg_tok_per_s": 12864.5,
    "mean_lat_ms": 5511.4,
    "errors": []
  }
}
```

### 内网环境

- 文件: `results/intranet_20260927-024750.json`  
- endpoint: `http://nlb-2weu6cb4a97uoz9cqu39kvmj.nlb.cn-beijing.volces.com:30880/v1` / model `flash`  
- kit 1.0.0, started 2026-09-27T02:47:50+00:00, quick=False, host=Windows-10-10.0.19044-SP0, key=sk-gw-fc...427d

**short_latency**

```json
{
  "runs_ms": [
    953.5,
    895.4,
    802.7,
    1434.2,
    1261.7,
    1292.9,
    986.1,
    961.9,
    1250.7,
    1066.7
  ],
  "out_tokens": [
    111,
    105,
    92,
    185,
    162,
    165,
    122,
    119,
    158,
    129
  ],
  "stats_ms": {
    "mean": 1090.6,
    "p50": 1026.4,
    "p95": 1370.6,
    "min": 802.7,
    "max": 1434.2
  }
}
```

**ttft**

```json
{
  "runs": [
    {
      "ttft_ms": 868.8,
      "total_ms": 1504.0,
      "chunks": 92
    },
    {
      "ttft_ms": 861.0,
      "total_ms": 1862.0,
      "chunks": 143
    },
    {
      "ttft_ms": 1107.4,
      "total_ms": 1300.0,
      "chunks": 30
    },
    {
      "ttft_ms": 1080.9,
      "total_ms": 2110.9,
      "chunks": 146
    },
    {
      "ttft_ms": 754.1,
      "total_ms": 1436.7,
      "chunks": 98
    },
    {
      "ttft_ms": 875.2,
      "total_ms": 1771.3,
      "chunks": 128
    },
    {
      "ttft_ms": 821.3,
      "total_ms": 1443.7,
      "chunks": 88
    },
    {
      "ttft_ms": 1088.2,
      "total_ms": 1634.7,
      "chunks": 79
    },
    {
      "ttft_ms": 1041.9,
      "total_ms": 1585.6,
      "chunks": 79
    },
    {
      "ttft_ms": 712.3,
      "total_ms": 820.1,
      "chunks": 18
    }
  ],
  "stats_ms": {
    "mean": 921.1,
    "p50": 872.0,
    "p95": 1098.8,
    "min": 712.3,
    "max": 1107.4
  }
}
```

**throughput**

```json
{
  "runs": [
    {
      "total_ms": 11242.2,
      "completion_tokens": 1507,
      "tok_per_s": 134.0
    },
    {
      "total_ms": 9815.6,
      "completion_tokens": 1332,
      "tok_per_s": 135.7
    },
    {
      "total_ms": 9107.7,
      "completion_tokens": 1220,
      "tok_per_s": 134.0
    }
  ],
  "mean_tok_per_s": 134.6
}
```

**prefill**

```json
{
  "repeated": [
    {
      "prompt_tokens": 29019,
      "total_ms": 939.8
    },
    {
      "prompt_tokens": 29019,
      "total_ms": 751.2
    },
    {
      "prompt_tokens": 29019,
      "total_ms": 1290.8
    }
  ],
  "fresh": [
    {
      "prompt_tokens": 57516,
      "total_ms": 6375.0,
      "answer_head": "第1790477329项"
    },
    {
      "prompt_tokens": 57516,
      "total_ms": 6499.7,
      "answer_head": "以上文本以第1790485255项开头。"
    },
    {
      "prompt_tokens": 57516,
      "total_ms": 6391.5,
      "answer_head": "第1790493180项"
    }
  ],
  "fresh_mean_ms": 6422.1
}
```

**concurrency_short**

```json
{
  "n": 10,
  "wall_ms": 1292.4,
  "ok": 10,
  "err": 0,
  "lat_ms": [
    860.9,
    609.8,
    753.8,
    586.7,
    567.6,
    904.0,
    979.0,
    714.6,
    1179.5,
    1277.0
  ],
  "mean_ms": 843.3,
  "p95_ms": 1233.1,
  "errors": []
}
```

**think_levels**

```json
{
  "off": {
    "mean_ms": 1131.3,
    "mean_out_tokens": 136.3,
    "runs_ms": [
      681.6,
      1569.8,
      1142.6
    ]
  },
  "low": {
    "mean_ms": 1087.8,
    "mean_out_tokens": 135.3,
    "runs_ms": [
      1416.7,
      1121.9,
      724.9
    ]
  },
  "medium": {
    "mean_ms": 876.8,
    "mean_out_tokens": 105.7,
    "runs_ms": [
      623.8,
      946.9,
      1059.6
    ]
  },
  "high": {
    "mean_ms": 1126.1,
    "mean_out_tokens": 139.3,
    "runs_ms": [
      902.4,
      1313.3,
      1162.6
    ]
  }
}
```

**steady_decode**

```json
{
  "runs": [
    {
      "chunks": 2618,
      "mid_chunk_per_s": 138.0,
      "completion_tokens": 2828
    },
    {
      "chunks": 2905,
      "mid_chunk_per_s": 136.7,
      "completion_tokens": 3000
    },
    {
      "chunks": 2917,
      "mid_chunk_per_s": 137.3,
      "completion_tokens": 3000
    }
  ],
  "mean_chunk_per_s": 137.3
}
```

**nonstream_long**

```json
{
  "runs": [
    {
      "total_ms": 21671.4,
      "completion_tokens": 3000,
      "tok_per_s": 138.4
    },
    {
      "total_ms": 22142.3,
      "completion_tokens": 3000,
      "tok_per_s": 135.5
    },
    {
      "total_ms": 18935.9,
      "completion_tokens": 2582,
      "tok_per_s": 136.4
    }
  ],
  "mean_tok_per_s": 136.8
}
```

**stream_timing**

```json
{
  "short": [
    {
      "chunks": 153,
      "first_ms": 929.2,
      "last_ms": 2046.3,
      "span_ms": 1117.1
    },
    {
      "chunks": 87,
      "first_ms": 819.6,
      "last_ms": 1419.7,
      "span_ms": 600.1
    }
  ],
  "long": [
    {
      "chunks": 939,
      "first_ms": 1261.9,
      "span_ms": 6767.2,
      "chunk_per_s": 138.8
    }
  ]
}
```

**sweep**

```json
{
  "1": {
    "wall_ms": 5931.5,
    "ok": 1,
    "err": 0,
    "total_tokens": 800,
    "agg_tok_per_s": 134.9,
    "mean_lat_ms": 5931.0,
    "errors": []
  },
  "5": {
    "wall_ms": 8090.3,
    "ok": 5,
    "err": 0,
    "total_tokens": 4000,
    "agg_tok_per_s": 494.4,
    "mean_lat_ms": 8083.2,
    "errors": []
  },
  "10": {
    "wall_ms": 9413.8,
    "ok": 10,
    "err": 0,
    "total_tokens": 8000,
    "agg_tok_per_s": 849.8,
    "mean_lat_ms": 9045.5,
    "errors": []
  },
  "20": {
    "wall_ms": 12176.0,
    "ok": 20,
    "err": 0,
    "total_tokens": 16000,
    "agg_tok_per_s": 1314.1,
    "mean_lat_ms": 10071.0,
    "errors": []
  },
  "50": {
    "wall_ms": 18621.1,
    "ok": 50,
    "err": 0,
    "total_tokens": 40000,
    "agg_tok_per_s": 2148.1,
    "mean_lat_ms": 12521.7,
    "errors": []
  },
  "100": {
    "wall_ms": 36171.9,
    "ok": 100,
    "err": 0,
    "total_tokens": 80000,
    "agg_tok_per_s": 2211.7,
    "mean_lat_ms": 19673.2,
    "errors": []
  }
}
```
