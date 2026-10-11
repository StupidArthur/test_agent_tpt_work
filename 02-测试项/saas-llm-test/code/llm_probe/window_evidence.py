"""Small evidence/validity helpers; no HTTP calls and no silent resume."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import threading
import time
import uuid

def fingerprint(config):
    return hashlib.sha256(json.dumps(config, sort_keys=True, ensure_ascii=False,
                                     separators=(',', ':')).encode()).hexdigest()


def failure_category(sample):
    """One primary cause; diagnostics such as protocol error remain separate tags."""
    if sample.get('gateway_service_success'):
        return 'success'
    error, status = sample.get('error_kind'), sample.get('http_status')
    if error in ('barrier', 'exception', 'client_error'):
        return 'client_error'
    if error in ('connect', 'dns', 'tls', 'http', 'other'):
        return 'connection'
    if error in ('read_idle_timeout', 'total_timeout'):
        return 'timeout'
    if status == 429:
        return 'http_429'
    if isinstance(status, int) and status >= 500:
        return 'http_5xx'
    if isinstance(status, int) and status >= 400:
        return 'http_4xx'
    if sample.get('terminal') == 'incomplete':
        return 'incomplete'
    if sample.get('terminal') == 'failed':
        return 'protocol'
    if sample.get('empty_text'):
        return 'empty_text'
    return 'protocol'


def window_status(window, threshold, rate=.99):
    """Invalid experiment never becomes an observed gateway boundary failure."""
    if (not window.get('complete') or not window.get('drained')
        or window.get('client_limited') is not False
        or window.get('resources_complete') is not True
        or window.get('load_isolation') != 'declared_exclusive'
        or window.get('elapsed_s', 0) < window.get('min_seconds', 600)
        or window.get('attempted', 0) < window.get('min_attempts', 100)
        or window.get('success_rate') is None or window.get('e2e_p95') is None):
        return 'invalid'
    return 'pass' if window['success_rate'] >= rate and window['e2e_p95'] <= threshold else 'fail'


def capacity_lines(windows, thresholds=(3, 5, 10), rate=.99):
    """Evaluate each valid window; aggregate p95 cannot hide a failing window."""
    result = {}
    for threshold in thresholds:
        tiers = {}
        for users in sorted({w['users'] for w in windows}):
            statuses = [window_status(w, threshold, rate) for w in windows if w['users'] == users]
            valid = [s for s in statuses if s != 'invalid']
            tiers[users] = 'unconfirmed' if len(valid) < 2 else ('pass' if all(s == 'pass' for s in valid) else 'fail')
        passing = [u for u,s in tiers.items() if s == 'pass']
        verified = max(passing) if passing else None
        non_monotonic = verified is not None and any(s == 'fail' and u < verified for u,s in tiers.items())
        if non_monotonic:
            verified = None
        failures = [u for u,s in tiers.items() if s == 'fail' and (verified is None or u > verified)]
        result[str(threshold)] = {'verified_users': verified,
            'first_valid_failing_tier': min(failures) if failures and not non_monotonic else None,
            'planning_users': verified * 5 if verified is not None else None,
            'tiers': tiers, 'non_monotonic': non_monotonic}
    return result


class WindowAttempt:
    """Immutable start/finish records; every invocation gets a new attempt path."""
    def __init__(self, store, logical_id, config):
        self.store, self.config = store, config
        self.prefix = f'capacity-suite/{logical_id}/attempts/{uuid.uuid4().hex}'
        self.config_sha256 = fingerprint(config)
        self.start = store.write_json(self.prefix + '/start.json',
            {'config': config, 'config_sha256': self.config_sha256, 'state': 'started'},
            instances=[logical_id], kind='window_start')

    def finish(self, window):
        return self.store.write_json(self.prefix + '/finish.json',
            {'config_sha256': self.config_sha256, 'window': window},
            instances=[self.prefix], kind='window_finish')

    @staticmethod
    def can_resume(path, expected_sha256, config):
        """Only an explicitly selected, hash-matched full window may be reused."""
        p = Path(path)
        if hashlib.sha256(p.read_bytes()).hexdigest().lower() != expected_sha256.lower():
            return False
        record = json.loads(p.read_text(encoding='utf-8'))
        w = record.get('window', {})
        return (record.get('config_sha256') == fingerprint(config)
                and w.get('complete') is True and w.get('drained') is True
                and w.get('elapsed_s', 0) >= config['min_seconds']
                and w.get('attempted', 0) >= config['min_attempts'])


def process_resources():
    import psutil  # Required for pressure measurements, not imported by preview.
    if not hasattr(process_resources, '_process'):
        process_resources._process = psutil.Process()
    p = process_resources._process
    return {'cpu_percent': p.cpu_percent(None), 'rss_bytes': p.memory_info().rss,
            'threads': p.num_threads(), 'tcp_connections': len(p.net_connections(kind='tcp')),
            'handles': p.num_handles() if hasattr(p, 'num_handles') else None}


class PressureSampler:
    """Sample throughout the window; flush each sample so interruption retains it."""
    def __init__(self, path, interval=.5, reader=process_resources):
        if not math.isfinite(interval) or interval <= 0:
            raise ValueError('sampling interval must be positive and finite')
        self.path, self.interval, self.reader = Path(path), interval, reader
        self.stop = threading.Event()
        self.samples, self.errors = [], []

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.file = self.path.open('x', encoding='utf-8')
        self.started = time.monotonic()
        def loop():
            while not self.stop.is_set():
                try:
                    row = {'elapsed_s': time.monotonic()-self.started, **self.reader()}
                except Exception as e:
                    row = {'elapsed_s': time.monotonic()-self.started, 'error': str(e)}
                    self.errors.append(str(e))
                self.samples.append(row)
                self.file.write(json.dumps(row, ensure_ascii=False)+'\n')
                self.file.flush()
                self.stop.wait(self.interval)
        self.thread = threading.Thread(target=loop, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.stop.set()
        self.thread.join()
        self.file.close()

    def summary(self):
        return {'complete': bool(self.samples) and not self.errors, 'sample_count': len(self.samples),
                'errors': self.errors, 'path': str(self.path), 'interval_s': self.interval,
                'note': 'periodic process samples, not exact peak or service-side metrics'}
