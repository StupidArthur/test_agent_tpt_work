// Resolve from the selected tool project, not global npm or this script's directory.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const localRequire = createRequire(path.join(process.cwd(), 'package.json'));
const packages = ['playwright-core', 'playwright'].map(name => {
  let packagePath;
  try { packagePath = localRequire.resolve(name + '/package.json'); }
  catch (error) {
    return {name, status: error.code === 'MODULE_NOT_FOUND' ? 'missing' : 'execution_error', error: {code: error.code, message: error.message}};
  }
  try {
    const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const imported = localRequire(name);
    if (typeof imported.chromium?.connectOverCDP !== 'function') throw new Error('chromium.connectOverCDP API unavailable');
    const executable = imported.chromium.executablePath();
    return {name, status: 'ok', version: metadata.version, path: packagePath, chromium_executable: {path: executable, exists: fs.existsSync(executable)}};
  } catch (error) { return {name, status: 'execution_error', path: packagePath, error: {code: error.code, message: error.message}}; }
});
process.stdout.write(JSON.stringify({packages}));
