#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_RUNTIME_DIR = path.resolve(projectRoot, '..', 'knolquiz-runtime');
const DEFAULT_EDITOR_DIR = path.resolve(projectRoot, '..', 'knolquiz-editor');

const RUNTIME_REQUIRED = [
  'public/index.html',
  'public/play/index.html',
  'public/play/app.js',
  'public/jumpmap-play/index.html',
  'public/jumpmap-play/app.js',
  'public/jumpmap-runtime/index.html',
  'public/jumpmap-runtime/app.js',
  'public/jumpmap-runtime/legacy/index.html',
  'public/jumpmap-runtime/legacy/app.js',
  'public/jumpmap-runtime/legacy/compat/index.html',
  'public/jumpmap-runtime/legacy/compat/app.js',
  'public/jumpmap-runtime/legacy/compat/runtime-owned/index.html',
  'public/jumpmap-runtime/legacy/compat/runtime-owned/editor.js',
  'public/jumpmap-runtime/legacy/compat/runtime-owned/textures/hanji.svg',
  'public/jumpmap-runtime/legacy/compat/quiz/core/engine.js',
  'public/jumpmap-runtime/legacy/compat/quiz/data/quiz-settings.default.json',
  'public/jumpmap-runtime/legacy/compat/quiz/nets/cube-01.svg',
  'public/jumpmap-runtime/legacy/compat/shared/local-game-records.js',
  'public/jumpmap-runtime/legacy/compat/quiz_background/Geumgangjeondo.jpg',
  'public/jumpmap-runtime/legacy/compat/quiz_plate/plate_canon.png',
  'public/jumpmap-runtime/legacy/compat/quiz_sejong/sejong_walk1.png',
  'public/shared/jumpmap-runtime-launcher.js',
  'public/shared/maps/jumpmap-01.json',
  'scripts/jumpmap-local-serve.mjs'
];

const RUNTIME_FORBIDDEN = [
  'public/jumpmap-editor'
];

const EDITOR_REQUIRED = [
  'public/jumpmap-editor/index.html',
  'public/jumpmap-editor/editor.js',
  'public/jumpmap-editor/map-io-utils.js',
  'scripts/jumpmap-local-serve.mjs',
  'scripts/jumpmap-publish-runtime-map.mjs',
  'scripts/jumpmap-sync-runtime-legacy-physics.mjs',
  'scripts/jumpmap-sync-runtime-legacy-compat-source-html.mjs',
  'scripts/jumpmap-sync-runtime-legacy-compat-assets.mjs',
  'scripts/jumpmap-verify-legacy-compat-fallback-logic.mjs',
  'scripts/jumpmap-verify-legacy-compat-inject-logic.mjs',
  'scripts/jumpmap-verify-legacy-compat-pipeline.mjs',
  'scripts/jumpmap-verify-legacy-compat-e2e.mjs',
  'scripts/jumpmap-audit-legacy-play-paths.mjs',
  'scripts/jumpmap-audit-legacy-compat-assets.mjs',
  'docs/contracts/legacy-play-path-audit.json',
  'docs/contracts/legacy-compat-asset-audit.json',
  'save_map/jumpmap-01.json'
];

const RUNTIME_SYNTAX = [
  'scripts/jumpmap-local-serve.mjs',
  'public/shared/jumpmap-runtime-launcher.js',
  'public/shared/legacy/test-physics-utils.js',
  'public/play/app.js',
  'public/jumpmap-play/app.js',
  'public/jumpmap-runtime/app.js',
  'public/jumpmap-runtime/legacy/app.js',
  'public/jumpmap-runtime/legacy/compat/app.js',
  'public/jumpmap-runtime/native-runtime.js'
];

const EDITOR_SYNTAX = [
  'scripts/jumpmap-local-serve.mjs',
  'scripts/jumpmap-publish-runtime-map.mjs',
  'scripts/jumpmap-sync-runtime-legacy-physics.mjs',
  'scripts/jumpmap-sync-runtime-legacy-compat-source-html.mjs',
  'scripts/jumpmap-sync-runtime-legacy-compat-assets.mjs',
  'scripts/jumpmap-verify-legacy-compat-fallback-logic.mjs',
  'scripts/jumpmap-verify-legacy-compat-inject-logic.mjs',
  'scripts/jumpmap-verify-legacy-compat-pipeline.mjs',
  'scripts/jumpmap-verify-legacy-compat-e2e.mjs',
  'scripts/jumpmap-audit-legacy-play-paths.mjs',
  'scripts/jumpmap-audit-legacy-compat-assets.mjs',
  'public/jumpmap-editor/editor.js',
  'public/jumpmap-editor/map-io-utils.js',
  'public/jumpmap-editor/test-runtime.js'
];

const printHelp = () => {
  console.log(
    [
      'jumpmap-verify-split',
      '',
      'Usage:',
      '  node scripts/jumpmap-verify-split.mjs [options]',
      '',
      'Options:',
      '  --runtime-dir <dir>   Runtime split repo directory (default: ../knolquiz-runtime)',
      '  --editor-dir <dir>    Editor split repo directory (default: ../knolquiz-editor)',
      '  --skip-smoke          Skip local server route smoke tests',
      '  --with-browser-e2e    Run optional Playwright browser E2E against runtime split (requires local playwright + chromium)',
      '  --browser-e2e-headed  Pass --headed to browser E2E script (requires GUI session)',
      '  --browser-e2e-timeout-ms <ms>  Pass custom timeout to browser E2E script',
      '  --help                Show this help',
      '',
      'Checks:',
      '  1) required paths in runtime/editor split repos',
      '  2) syntax checks via node --check',
      '  3) editor publish dry-run toward runtime repo',
      '  4) local server route smoke test for runtime/editor',
      '  5) (optional) browser E2E for legacy compat runtime-owned cutover path'
    ].join('\n')
  );
};

const resolveMaybeRelative = (value, fallback) => {
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
};

const parseArgs = (argv) => {
  const opts = {
    runtimeDir: DEFAULT_RUNTIME_DIR,
    editorDir: DEFAULT_EDITOR_DIR,
    skipSmoke: false,
    withBrowserE2E: false,
    browserE2EHeaded: false,
    browserE2ETimeoutMs: 0,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--runtime-dir') {
      opts.runtimeDir = resolveMaybeRelative(argv[i + 1], DEFAULT_RUNTIME_DIR);
      i += 1;
      continue;
    }
    if (arg === '--editor-dir') {
      opts.editorDir = resolveMaybeRelative(argv[i + 1], DEFAULT_EDITOR_DIR);
      i += 1;
      continue;
    }
    if (arg === '--skip-smoke') {
      opts.skipSmoke = true;
      continue;
    }
    if (arg === '--with-browser-e2e') {
      opts.withBrowserE2E = true;
      continue;
    }
    if (arg === '--browser-e2e-headed') {
      opts.browserE2EHeaded = true;
      continue;
    }
    if (arg === '--browser-e2e-timeout-ms') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('missing value for --browser-e2e-timeout-ms');
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`invalid --browser-e2e-timeout-ms: ${raw}`);
      }
      opts.browserE2ETimeoutMs = Math.round(parsed);
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
};

const verifyRequiredPaths = (rootDir, requiredList) => {
  const missing = [];
  requiredList.forEach((relPath) => {
    const absolute = path.join(rootDir, relPath);
    if (!fs.existsSync(absolute)) missing.push(relPath);
  });
  return missing;
};

const verifyForbiddenPaths = (rootDir, forbiddenList) => {
  const present = [];
  forbiddenList.forEach((relPath) => {
    const absolute = path.join(rootDir, relPath);
    if (fs.existsSync(absolute)) present.push(relPath);
  });
  return present;
};

const runNodeCheck = (rootDir, relPath) => {
  const absolute = path.join(rootDir, relPath);
  const result = spawnSync('node', ['--check', absolute], {
    encoding: 'utf8'
  });
  return {
    relPath,
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim()
  };
};

const runCommand = ({ cwd, cmd, args }) => {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8'
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim()
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isListenPermissionError = (error) => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  if (code === 'EPERM' || code === 'EACCES') return true;
  return message.includes('listen') && message.includes('operation not permitted');
};

const findAvailablePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', (error) => reject(error));
  server.listen({ port: 0, host: '127.0.0.1' }, () => {
    const selected = Number(server.address()?.port) || 0;
    server.close(() => {
      if (selected > 0 && selected < 65536) {
        resolve(selected);
      } else {
        reject(new Error(`invalid ephemeral port: ${selected}`));
      }
    });
  });
});

const startLocalServer = ({ repoDir, port }) => new Promise((resolve, reject) => {
  const child = spawn('node', ['scripts/jumpmap-local-serve.mjs', `--host=127.0.0.1`, `--port=${port}`], {
    cwd: repoDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let settled = false;
  let output = '';
  const finish = (ok, value) => {
    if (settled) return;
    settled = true;
    if (ok) resolve(value);
    else reject(value);
  };

  const onData = (chunk) => {
    const text = String(chunk || '');
    output += text;
    if (output.includes('Jumpmap local server running:')) {
      finish(true, { child, output });
    }
  };

  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => {
    finish(false, new Error(`local server exited early (code=${code})`));
  });

  setTimeout(() => {
    finish(false, new Error(`local server start timeout (${port})`));
  }, 6000);
});

const stopLocalServer = async (child) => {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  await sleep(120);
  if (!child.killed) {
    child.kill('SIGKILL');
  }
};

const fetchJson = async (url) => {
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_error) {
    // keep null
  }
  return { ok: res.ok, status: res.status, text, json };
};

const fetchText = async (url) => {
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
};

const pushTextSmokeCheck = async (checks, label, url, contains = []) => {
  checks.push({
    label,
    kind: 'text',
    contains,
    result: await fetchText(url)
  });
};

const pushTextAbsentSmokeCheck = async (checks, label, url) => {
  checks.push({
    label,
    kind: 'text-absent',
    result: await fetchText(url)
  });
};

const pushJsonSmokeCheck = async (checks, label, url) => {
  checks.push({
    label,
    kind: 'json',
    result: await fetchJson(url)
  });
};

const markSmokeChecks = (checks, mark) => {
  checks.forEach((check) => {
    const { label, result } = check;
    const contains = Array.isArray(check.contains) ? check.contains : [];
    if (check.kind === 'text-absent') {
      const ok = !result.ok;
      mark(ok, `${label} (status=${result.status})`);
      return;
    }
    const missingMarkers =
      check.kind === 'text' && result.ok && contains.length > 0
        ? contains.filter((needle) => !result.text.includes(needle))
        : [];
    const ok = result.ok && missingMarkers.length === 0;
    mark(ok, `${label} (status=${result.status})`);
    if (missingMarkers.length > 0) {
      console.log(`  missing markers: ${missingMarkers.join(', ')}`);
    }
  });
};

const smokeRuntimeRoutes = async (runtimeDir, port) => {
  const base = `http://127.0.0.1:${port}`;
  const checks = [];
  await pushTextSmokeCheck(checks, 'runtime /', `${base}/`);
  await pushTextSmokeCheck(checks, 'runtime /play/', `${base}/play/`);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-play/', `${base}/jumpmap-play/`);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/', `${base}/jumpmap-runtime/`);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/legacy/', `${base}/jumpmap-runtime/legacy/`, [
    'legacy-frame',
    'src="./app.js"'
  ]);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/legacy/?legacyCompatTarget=1', `${base}/jumpmap-runtime/legacy/?legacyCompatTarget=1`, [
    'legacy-frame',
    'src="./app.js"'
  ]);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/legacy/?legacyCompatTarget=0', `${base}/jumpmap-runtime/legacy/?legacyCompatTarget=0`, [
    'legacy-frame',
    'src="./app.js"'
  ]);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/legacy/?legacyCompatTarget=0&legacyCompatDebug=1', `${base}/jumpmap-runtime/legacy/?legacyCompatTarget=0&legacyCompatDebug=1`, [
    'legacy-frame',
    'src="./app.js"'
  ]);
  await pushTextSmokeCheck(checks, 'runtime /jumpmap-runtime/legacy/compat/', `${base}/jumpmap-runtime/legacy/compat/`, [
    'status-text',
    'src="./app.js"'
  ]);
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/?legacyCompatSource=runtimeOwned',
    `${base}/jumpmap-runtime/legacy/compat/?legacyCompatSource=runtimeOwned`,
    ['status-text', 'src="./app.js"']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/?legacyCompatSource=runtimeOwned&legacyCompatAssetBase=runtimeOwned',
    `${base}/jumpmap-runtime/legacy/compat/?legacyCompatSource=runtimeOwned&legacyCompatAssetBase=runtimeOwned`,
    ['status-text', 'src="./app.js"']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor',
    `${base}/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor`,
    ['status-text', 'src="./app.js"']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor&legacyCompatDebug=1',
    `${base}/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor&legacyCompatDebug=1`,
    ['status-text', 'src="./app.js"']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/?legacyCompatTarget=1',
    `${base}/jumpmap-runtime/legacy/compat/?legacyCompatTarget=1`,
    ['status-text', 'src="./app.js"']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/runtime-owned/',
    `${base}/jumpmap-runtime/legacy/compat/runtime-owned/`,
    ['점프맵 에디터', 'jumpmap-runtime legacy compat runtime-owned source snapshot']
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/runtime-owned/editor.js',
    `${base}/jumpmap-runtime/legacy/compat/runtime-owned/editor.js`
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/runtime-owned/textures/hanji.svg',
    `${base}/jumpmap-runtime/legacy/compat/runtime-owned/textures/hanji.svg`
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/quiz/core/engine.js',
    `${base}/jumpmap-runtime/legacy/compat/quiz/core/engine.js`
  );
  await pushJsonSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/quiz/data/quiz-settings.default.json',
    `${base}/jumpmap-runtime/legacy/compat/quiz/data/quiz-settings.default.json`
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/quiz/nets/cube-01.svg',
    `${base}/jumpmap-runtime/legacy/compat/quiz/nets/cube-01.svg`
  );
  await pushTextSmokeCheck(
    checks,
    'runtime /jumpmap-runtime/legacy/compat/shared/local-game-records.js',
    `${base}/jumpmap-runtime/legacy/compat/shared/local-game-records.js`
  );
  await pushTextAbsentSmokeCheck(checks, 'runtime /jumpmap-editor/ (removed)', `${base}/jumpmap-editor/`);
  await pushTextSmokeCheck(checks, 'runtime /quiz/', `${base}/quiz/`);
  await pushJsonSmokeCheck(checks, 'runtime /shared/maps/jumpmap-01.json', `${base}/shared/maps/jumpmap-01.json`);
  await pushJsonSmokeCheck(checks, 'runtime /__jumpmap/runtime-map.json', `${base}/__jumpmap/runtime-map.json`);
  return checks;
};

const smokeEditorRoutes = async (editorDir, port) => {
  const base = `http://127.0.0.1:${port}`;
  const checks = [];
  await pushTextSmokeCheck(checks, 'editor /jumpmap-editor/', `${base}/jumpmap-editor/`);
  await pushJsonSmokeCheck(checks, 'editor /__jumpmap/plates.json', `${base}/__jumpmap/plates.json`);
  await pushJsonSmokeCheck(checks, 'editor /__jumpmap/runtime-map.json', `${base}/__jumpmap/runtime-map.json`);
  return checks;
};

const logSection = (title) => {
  console.log(`\n[${title}]`);
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  let failCount = 0;
  let passCount = 0;
  const mark = (ok, message) => {
    if (ok) {
      passCount += 1;
      console.log(`PASS ${message}`);
    } else {
      failCount += 1;
      console.log(`FAIL ${message}`);
    }
  };

  logSection('split roots');
  mark(fs.existsSync(opts.runtimeDir), `runtime dir exists: ${opts.runtimeDir}`);
  mark(fs.existsSync(opts.editorDir), `editor dir exists: ${opts.editorDir}`);

  logSection('required paths');
  const runtimeMissing = verifyRequiredPaths(opts.runtimeDir, RUNTIME_REQUIRED);
  const runtimeForbiddenPresent = verifyForbiddenPaths(opts.runtimeDir, RUNTIME_FORBIDDEN);
  const editorMissing = verifyRequiredPaths(opts.editorDir, EDITOR_REQUIRED);
  mark(runtimeMissing.length === 0, `runtime required ${RUNTIME_REQUIRED.length - runtimeMissing.length}/${RUNTIME_REQUIRED.length}`);
  if (runtimeMissing.length) {
    console.log(`  missing(runtime): ${runtimeMissing.join(', ')}`);
  }
  mark(runtimeForbiddenPresent.length === 0, `runtime forbidden absent ${RUNTIME_FORBIDDEN.length - runtimeForbiddenPresent.length}/${RUNTIME_FORBIDDEN.length}`);
  if (runtimeForbiddenPresent.length) {
    console.log(`  present(runtime-forbidden): ${runtimeForbiddenPresent.join(', ')}`);
  }
  mark(editorMissing.length === 0, `editor required ${EDITOR_REQUIRED.length - editorMissing.length}/${EDITOR_REQUIRED.length}`);
  if (editorMissing.length) {
    console.log(`  missing(editor): ${editorMissing.join(', ')}`);
  }

  logSection('syntax check');
  RUNTIME_SYNTAX.forEach((relPath) => {
    const result = runNodeCheck(opts.runtimeDir, relPath);
    mark(result.ok, `runtime node --check ${relPath}`);
    if (!result.ok && result.output) console.log(`  ${result.output}`);
  });
  EDITOR_SYNTAX.forEach((relPath) => {
    const result = runNodeCheck(opts.editorDir, relPath);
    mark(result.ok, `editor node --check ${relPath}`);
    if (!result.ok && result.output) console.log(`  ${result.output}`);
  });

  logSection('publish dry-run');
  const publish = runCommand({
    cwd: opts.editorDir,
    cmd: 'node',
    args: ['scripts/jumpmap-publish-runtime-map.mjs', '--runtime-repo', opts.runtimeDir, '--dry-run']
  });
  mark(publish.ok, 'editor publish dry-run to runtime repo');
  if (publish.output) console.log(publish.output);

  logSection('legacy physics sync check');
  const legacyPhysicsSync = runCommand({
    cwd: opts.editorDir,
    cmd: 'node',
    args: ['scripts/jumpmap-sync-runtime-legacy-physics.mjs', '--runtime-repo', opts.runtimeDir, '--check']
  });
  mark(legacyPhysicsSync.ok, 'editor legacy physics snapshot matches runtime shared copy');
  if (legacyPhysicsSync.output) console.log(legacyPhysicsSync.output);

  logSection('legacy play path audit');
  const legacyPlayPathAudit = runCommand({
    cwd: opts.editorDir,
    cmd: 'node',
    args: ['scripts/jumpmap-audit-legacy-play-paths.mjs', '--check']
  });
  mark(legacyPlayPathAudit.ok, 'editor legacy play path audit snapshot is up to date');
  if (legacyPlayPathAudit.output) console.log(legacyPlayPathAudit.output);

  logSection('legacy compat asset audit');
  const legacyCompatAssetAudit = runCommand({
    // This snapshot intentionally includes runtime-owned compat dependencies
    // (e.g. /quiz, /shared), so it is checked against the monorepo source tree.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-audit-legacy-compat-assets.mjs', '--check']
  });
  mark(legacyCompatAssetAudit.ok, 'monorepo legacy compat asset audit snapshot is up to date');
  if (legacyCompatAssetAudit.output) console.log(legacyCompatAssetAudit.output);

  logSection('legacy compat canary asset sync check');
  const legacyCompatCanaryAssetSync = runCommand({
    // Canary mirror lives under monorepo runtime compat path.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-sync-runtime-legacy-compat-assets.mjs', '--check']
  });
  mark(legacyCompatCanaryAssetSync.ok, 'monorepo legacy compat canary asset mirror is in sync');
  if (legacyCompatCanaryAssetSync.output) console.log(legacyCompatCanaryAssetSync.output);

  logSection('legacy compat source html sync check');
  const legacyCompatSourceHtmlSync = runCommand({
    // runtime-owned/index.html snapshot is generated from editor source in monorepo.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-sync-runtime-legacy-compat-source-html.mjs', '--check']
  });
  mark(legacyCompatSourceHtmlSync.ok, 'monorepo legacy compat source html snapshot is in sync');
  if (legacyCompatSourceHtmlSync.output) console.log(legacyCompatSourceHtmlSync.output);

  logSection('legacy compat fallback logic check');
  const legacyCompatFallbackLogic = runCommand({
    // Import split runtime browser modules in Node and verify fallback helper behavior.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-verify-legacy-compat-fallback-logic.mjs', '--runtime-dir', opts.runtimeDir]
  });
  mark(legacyCompatFallbackLogic.ok, 'runtime split legacy compat fallback logic helpers behave as expected');
  if (legacyCompatFallbackLogic.output) console.log(legacyCompatFallbackLogic.output);

  logSection('legacy compat inject logic check');
  const legacyCompatInjectLogic = runCommand({
    // Import split runtime compat module in Node and verify HTML inject transformation helpers.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-verify-legacy-compat-inject-logic.mjs', '--runtime-dir', opts.runtimeDir]
  });
  mark(legacyCompatInjectLogic.ok, 'runtime split legacy compat inject logic helpers behave as expected');
  if (legacyCompatInjectLogic.output) console.log(legacyCompatInjectLogic.output);

  logSection('legacy compat pipeline check');
  const legacyCompatPipeline = runCommand({
    // Import split runtime legacy/compat modules in Node and verify combined pipeline decisions + inject transform.
    cwd: projectRoot,
    cmd: 'node',
    args: ['scripts/jumpmap-verify-legacy-compat-pipeline.mjs', '--runtime-dir', opts.runtimeDir]
  });
  mark(legacyCompatPipeline.ok, 'runtime split legacy compat pipeline helpers behave as expected');
  if (legacyCompatPipeline.output) console.log(legacyCompatPipeline.output);

  if (opts.withBrowserE2E) {
    logSection('legacy compat browser e2e');
    const browserE2EArgs = ['scripts/jumpmap-verify-legacy-compat-e2e.mjs', '--runtime-dir', opts.runtimeDir];
    if (opts.browserE2EHeaded) browserE2EArgs.push('--headed');
    if (opts.browserE2ETimeoutMs > 0) {
      browserE2EArgs.push('--timeout-ms', String(opts.browserE2ETimeoutMs));
    }
    const legacyCompatBrowserE2E = runCommand({
      // Runs split runtime local server + Playwright headless Chromium to validate iframe/compat runtime-owned path.
      cwd: projectRoot,
      cmd: 'node',
      args: browserE2EArgs
    });
    mark(legacyCompatBrowserE2E.ok, 'runtime split legacy compat browser E2E behaves as expected');
    if (legacyCompatBrowserE2E.output) console.log(legacyCompatBrowserE2E.output);
  }

  if (!opts.skipSmoke) {
    logSection('local route smoke');
    let runtimeServer = null;
    let editorServer = null;
    try {
      const runtimePort = await findAvailablePort();
      const editorPort = await findAvailablePort();
      runtimeServer = await startLocalServer({ repoDir: opts.runtimeDir, port: runtimePort });
      editorServer = await startLocalServer({ repoDir: opts.editorDir, port: editorPort });
      const runtimeChecks = await smokeRuntimeRoutes(opts.runtimeDir, runtimePort);
      markSmokeChecks(runtimeChecks, mark);
      const editorChecks = await smokeEditorRoutes(opts.editorDir, editorPort);
      markSmokeChecks(editorChecks, mark);
    } catch (error) {
      if (isListenPermissionError(error)) {
        mark(true, 'local route smoke skipped (listen permission denied in current environment)');
        console.log('  note: rerun this script on local host terminal to execute route smoke tests.');
      } else {
        mark(false, `local route smoke failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      await stopLocalServer(runtimeServer?.child);
      await stopLocalServer(editorServer?.child);
    }
  }

  console.log(`\n[summary] pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-verify-split] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
