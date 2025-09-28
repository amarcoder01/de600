#!/usr/bin/env node
/*
 Cross-platform prebuild installer for Python dependencies.
 - On Linux/macOS: runs the existing bash script scripts/install-python-deps.sh
 - On Windows: attempts to use 'py -m pip' or 'python -m pip' to install requirements
 This ensures local builds on Windows don't fail due to missing bash.
*/

const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const reqFile = path.join(projectRoot, 'requirements-python.txt');

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  return res.status === 0;
}

function tryPythonPip(pythonCmd) {
  console.log(`🔎 Trying ${pythonCmd} -m pip ...`);
  if (!run(pythonCmd, ['-m', 'pip', '--version'])) return false;
  if (existsSync(reqFile)) {
    console.log('📦 Installing Python dependencies from requirements-python.txt...');
    if (!run(pythonCmd, ['-m', 'pip', 'install', '--no-cache-dir', '-r', 'requirements-python.txt'])) {
      console.warn('⚠️ Failed to install from requirements file, trying core packages...');
      run(pythonCmd, ['-m', 'pip', 'install', '--no-cache-dir', 'yfinance==0.2.28']);
      run(pythonCmd, ['-m', 'pip', 'install', '--no-cache-dir', 'requests>=2.31.0']);
      run(pythonCmd, ['-m', 'pip', 'install', '--no-cache-dir', 'pandas>=2.0.0']);
      run(pythonCmd, ['-m', 'pip', 'install', '--no-cache-dir', 'numpy>=1.24.0']);
    }
  } else {
    console.log('ℹ️ requirements-python.txt not found, skipping Python deps.');
  }
  console.log('🧪 Verifying key Python packages...');
  run(pythonCmd, ['-c', "import pandas, aiohttp, dotenv; print('✅ Python deps OK')" ]);
  return true;
}

(async () => {
  const platform = process.platform;
  const isRender = process.env.RENDER === 'true';

  // On Linux/macOS (Render), defer to bash script
  if (platform === 'linux' || platform === 'darwin' || isRender) {
    const bashPath = process.env.SHELL || 'bash';
    const scriptPath = path.join(projectRoot, 'scripts', 'install-python-deps.sh');
    if (!existsSync(scriptPath)) {
      console.log('ℹ️ install-python-deps.sh not found, skipping.');
      process.exit(0);
    }
    console.log('🐍 Running bash installer for Python deps...');
    const ok = run(bashPath, [scriptPath]);
    process.exit(ok ? 0 : 1);
  }

  // On Windows, try py then python
  if (platform === 'win32') {
    if (tryPythonPip('py')) process.exit(0);
    if (tryPythonPip('python')) process.exit(0);
    console.warn('⚠️ No suitable Python found (py/python). Skipping Python deps install.');
    process.exit(0);
  }

  // Other platforms: no-op
  process.exit(0);
})();
