"""Offline statistics + SLO judgement for the TPT gateway SLO boundary run.

Reads the per-wave JSON files written by slo_boundary.py, emits
latency-summary.json / failure-details.json / slo-analysis.json and prints
tables. Sends no network requests.
"""
import json, math, re
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
SHORT_LADDER = [250, 300, 350, 400, 500, 600]
LONG_LADDER = [50, 100, 200]
STRICT_P95, LOOSE_P95, MIN_SUCCESS = 5.0, 10.0, 99.5


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    return s[max(0, math.ceil(q / 100.0 * len(s)) - 1)]


def stats(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return {'n': len(vals), 'mean': round(sum(vals) / len(vals), 6), 'p50': round(pct(vals, 50), 6),
            'p95': round(pct(vals, 95), 6), 'p99': round(pct(vals, 99), 6),
            'min': round(min(vals), 6), 'max': round(max(vals), 6)}


def load(label_glob):
    out = []
    for p in sorted(TASK.glob(label_glob)):
        try:
            d = json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            continue
        d['_file'] = p.name
        out.append(d)
    return out


def analyse(w):
    rows = w['rows']
    complete = [r for r in rows if r.get('complete')]
    e2e = [r['end'] - r['start'] for r in complete]
    ttft = [r.get('first_bytes_at') for r in complete if r.get('first_bytes_at') is not None]
    no_status = w['statuses'].get('no_http_status', 0)
    gw_denom = w['planned'] - no_status
    usages = [r['usage'] for r in rows if r.get('usage')]
    pt = sorted(u.get('prompt_tokens', 0) for u in usages)
    ct = sorted(u.get('completion_tokens', 0) for u in usages)
    med = (lambda s: s[len(s) // 2] if s else None)
    return {
        'label': w['label'], 'planned': w['planned'], 'complete': len(complete),
        'success_rate': round(len(complete) / w['planned'] * 100, 3),
        'gateway_success_rate': round(len(complete) / gw_denom * 100, 3) if gw_denom else None,
        'no_http_status': no_status,
        'usage_median': {'prompt_tokens': med(pt), 'completion_tokens': med(ct), 'n_usage': len(usages)},
        'headers_sent_peak': w['headers_sent_peak'],
        'http200_unfinished_peak': w['http200_unfinished_peak'],
        'duration': round(w['duration'], 3),
        'statuses': w['statuses'], 'client_errors': w['client_errors'],
        'e2e': stats(e2e), 'ttft': stats(ttft),
    }


def main():
    shorts = [analyse(w) for w in load('wave-*.json') if 'smoke' not in w['label']]
    longs = [analyse(w) for w in load('long-*.json')]
    recs = [analyse(w) for w in load('recovery-*.json')]
    for r in shorts + longs + recs:
        r['percentiles_note'] = 'nearest-rank'
    (TASK / 'latency-summary.json').write_text(json.dumps(shorts + longs + recs, ensure_ascii=False, indent=2), encoding='utf-8')

    # failures across all waves
    failures = []
    for gl in ('wave-*.json', 'long-*.json', 'recovery-*.json'):
        for w in load(gl):
            if 'smoke' in w['label']:
                continue
            for r in w['rows']:
                if not r.get('complete'):
                    failures.append(r)
    (TASK / 'failure-details.json').write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding='utf-8')

    # SLO analysis on the short ladder, grouped by concurrency n
    def n_of(label):
        m = re.search(r'(\d+)', label.split('-', 1)[1] if '-' in label else label)
        return int(m.group(1)) if m else None

    groups = {}
    for r in shorts:
        groups.setdefault(n_of(r['label']), []).append(r)

    slo = {'thresholds': {'strict_p95': STRICT_P95, 'loose_p95': LOOSE_P95, 'min_success_pct': MIN_SUCCESS},
           'success_definitions': {
               'literal': 'complete / planned (includes client-side connect failures)',
               'gateway_observed': 'complete / (planned - no_http_status); only requests that received an HTTP response'},
           'short_ladder': {}}
    for n in sorted(k for k in groups if k is not None):
        reps = sorted(groups[n], key=lambda x: x['label'])
        p95s = [r['e2e']['p95'] for r in reps if r['e2e']]
        succ = [r['success_rate'] for r in reps]
        gsucc = [r['gateway_success_rate'] for r in reps]
        strict_over = sum(1 for p in p95s if p >= STRICT_P95)
        loose_over = sum(1 for p in p95s if p >= LOOSE_P95)
        full = len(p95s) == len(reps)
        lat_strict = full and all(p < STRICT_P95 for p in p95s)
        lat_loose = full and all(p < LOOSE_P95 for p in p95s)
        succ_ok = full and all(s >= MIN_SUCCESS for s in succ)
        gsucc_ok = full and all(s is not None and s >= MIN_SUCCESS for s in gsucc)
        slo['short_ladder'][n] = {
            'reps': len(reps), 'p95_by_rep': p95s, 'success_by_rep': succ,
            'gateway_success_by_rep': gsucc,
            'p95_median': round(sorted(p95s)[len(p95s) // 2], 6) if p95s else None,
            'latency_strict_all': lat_strict, 'latency_loose_all': lat_loose,
            'literal_success_all': succ_ok, 'gateway_success_all': gsucc_ok,
            'meet_strict_literal': lat_strict and succ_ok,
            'meet_loose_literal': lat_loose and succ_ok,
            'meet_strict_gateway': lat_strict and gsucc_ok,
            'meet_loose_gateway': lat_loose and gsucc_ok,
            'strict_candidate': strict_over >= 2,
            'loose_candidate': loose_over >= 2,
            'all_reps_meet_strict': lat_strict and succ_ok,
            'all_reps_meet_loose': lat_loose and succ_ok,
        }
    (TASK / 'slo-analysis.json').write_text(json.dumps(slo, ensure_ascii=False, indent=2), encoding='utf-8')

    # ---- print ----
    print('\n== SHORT (nearest-rank P95/P99 over complete responses) ==')
    print(f"{'label':>12} {'ok/plan':>9} {'succ%':>7} {'mean':>7} {'p50':>7} {'p95':>7} {'p99':>7} {'max':>7} {'dur':>7} {'stat':>16}")
    for r in shorts:
        e = r['e2e']
        print(f"{r['label']:>12} {str(r['complete'])+'/'+str(r['planned']):>9} {r['success_rate']:>7} "
              f"{e['mean']:>7} {e['p50']:>7} {e['p95']:>7} {e['p99']:>7} {e['max']:>7} {r['duration']:>7} {str(r['statuses']):>16}")
    if longs:
        print('\n== LONG ==')
        for r in longs:
            e = r['e2e']
            print(f"{r['label']:>12} {str(r['complete'])+'/'+str(r['planned']):>9} {e['mean']:>8} {e['p95']:>8} {r['duration']:>8} {str(r['statuses'])}")
    print('\n== RECOVERY ==')
    for r in recs:
        e = r['e2e']
        print(f"{r['label']:>12} {str(r['complete'])+'/'+str(r['planned']):>9} {e['mean'] if e else None} {str(r['statuses'])}")
    print('\n== SLO (short) ==')
    for n, v in slo['short_ladder'].items():
        print(f"n={n:<5} p95_med={v['p95_median']:<9} strict_ok={v['all_reps_meet_strict']} "
              f"loose_ok={v['all_reps_meet_loose']} strict_cand={v['strict_candidate']} loose_cand={v['loose_candidate']}")
    print(f"\nfailures={len(failures)} requests_total={sum(r['planned'] for r in shorts + longs + recs)}")


if __name__ == '__main__':
    main()
