import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Only the probe child is terminated on timeout; never the application under test.
export function runNative(request, {timeoutMs = 15000, executionPolicy} = {}) {
  if (process.platform !== 'win32') throw Error('Native windows require Windows');
  const host = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = fileURLToPath(new URL(['state','restore'].includes(request.mode) ? './window-state.ps1' : './native-window.ps1', import.meta.url));
  const payload = Buffer.from(JSON.stringify(request), 'utf8').toString('base64');
  if (executionPolicy && !['Bypass', 'RemoteSigned'].includes(executionPolicy)) throw Error('Unsupported explicit native execution policy');
  const policyArgs = executionPolicy ? ['-ExecutionPolicy', executionPolicy] : [];
  return new Promise((resolve, reject) => {
    const child = spawn(host, ['-NoProfile', '-NonInteractive', '-Sta', ...policyArgs, '-File', script, '-RequestBase64', payload], {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', settled = false;
    const finish = (error, result) => {if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(result);};
    const timer = setTimeout(() => {child.kill(); finish(Error('Native window probe timeout; application was not terminated'));}, timeoutMs);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {stdout += chunk; if (stdout.length > 4 * 1024 * 1024) {child.kill(); finish(Error('Native window output limit exceeded'));}});
    child.stderr.on('data', chunk => {stderr = (stderr + chunk).slice(-16000);});
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (settled) return;
      let packet;
      try {packet = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());} catch {finish(Error(`Native host invalid JSON (exit ${code}): ${stderr || stdout.slice(-4000)}`)); return;}
      if (code !== 0 || packet.status !== 'ok') {finish(Error(`Native host failed: ${JSON.stringify(packet)}; ${stderr}`)); return;}
      finish(null, {...packet, host, executionPolicy: executionPolicy || 'host default', exitCode: code, stderr});
    });
  });
}
