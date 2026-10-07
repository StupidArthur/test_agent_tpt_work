"""Client resources only; no API traffic. Stop when the measured runner exits."""
import json,time,sys
from pathlib import Path
import psutil
task=Path(__file__).resolve().parents[1]
runner=None
for p in psutil.process_iter(['pid','cmdline']):
    try:
        if p.pid!=__import__('os').getpid() and any(str(c).endswith('run_performance.py') for c in p.info['cmdline'] or []):
            runner=p;break
    except psutil.Error:pass
if runner is None:raise SystemExit('No active performance runner')
out=task/'运行日志'/'客户端资源.jsonl';out.parent.mkdir(exist_ok=True)
with out.open('a',encoding='utf-8') as f:
    while runner.is_running():
        try:
            m=runner.memory_info(); cpu=runner.cpu_times()
            row={'utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'monotonic':time.monotonic(),
                 'pid':runner.pid,'rss_bytes':m.rss,'vms_bytes':m.vms,'cpu_user_s':cpu.user,'cpu_system_s':cpu.system,
                 'threads':runner.num_threads(),'machine_cpu_percent':psutil.cpu_percent(),
                 'machine_available_bytes':psutil.virtual_memory().available}
            try:row['tcp_connections']=len(runner.net_connections(kind='tcp'))
            except psutil.Error:row['tcp_connections']=None
            f.write(json.dumps(row)+'\n');f.flush()
        except psutil.Error:break
        time.sleep(5)
print('Resource monitor finished',flush=True)
