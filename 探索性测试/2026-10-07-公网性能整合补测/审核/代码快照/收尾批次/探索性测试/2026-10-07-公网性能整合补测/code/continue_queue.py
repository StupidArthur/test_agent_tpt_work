"""Serialize remaining API batches after the active performance process drains."""
import json,subprocess,sys
from pathlib import Path
import psutil
task=Path(__file__).resolve().parents[1]
rows=(task/'运行日志'/'客户端资源.jsonl').read_text(encoding='utf-8').splitlines()
pid=json.loads(rows[-1])['pid']
try:
    p=psutil.Process(pid)
    if not any(str(c).endswith('run_performance.py') for c in p.cmdline()):raise RuntimeError('PID identity changed')
    print('Waiting for performance runner to drain',flush=True)
    p.wait()
except psutil.NoSuchProcess:pass
for script in ['run_complete_burst.py','run_wire_recheck.py','run_capacity_measurement.py','audit_results.py']:
    print('BEGIN '+script,flush=True)
    result=subprocess.run([sys.executable,str(task/'code'/script)])
    if result.returncode:raise SystemExit(result.returncode)
    print('END '+script,flush=True)
