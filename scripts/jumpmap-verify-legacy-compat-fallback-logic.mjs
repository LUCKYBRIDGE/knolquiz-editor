#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_RUNTIME_DIR = path.resolve(projectRoot, '..', 'nolquiz-runtime');

const parseArgs = (argv) => {
  const opts = { runtimeDir: DEFAULT_RUNTIME_DIR, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--runtime-dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('missing value for --runtime-dir');
      opts.runtimeDir = path.isAbsolute(next) ? next : path.resolve(projectRoot, next);
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
};

const printHelp = () => {
  console.log([
    'jumpmap-verify-legacy-compat-fallback-logic',
    '',
    'Usage:',
    '  node scripts/jumpmap-verify-legacy-compat-fallback-logic.mjs [--runtime-dir <dir>]',
    '',
    'Checks:',
    '  - legacy host fallback target mode parsing and auto-fallback probe logic',
    '  - compat source/asset-base mode defaults and editor-path recovery logic',
    '  - URL builders for runtime-owned compat routes'
  ].join('\n'));
};

const createTempModuleCopy = (absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const tempName = `jumpmap-fallback-verify-${path.basename(absolutePath, '.js')}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`;
  const tempPath = path.join(os.tmpdir(), tempName);
  const wrapped = `${source}\n\n// source-origin: ${absolutePath.replaceAll('\\', '\\\\')}\n`;
  fs.writeFileSync(tempPath, wrapped, 'utf8');
  return tempPath;
};

const removeTempFileQuietly = (filePath) => {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (_error) {
    // no-op
  }
};

const importModuleFrom = async (absolutePath) => {
  const tempPath = createTempModuleCopy(absolutePath);
  const url = pathToFileURL(tempPath);
  url.searchParams.set('t', String(Date.now()));
  try {
    return await import(url.href);
  } finally {
    removeTempFileQuietly(tempPath);
  }
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const legacyAppPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/app.js');
  const compatAppPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/compat/app.js');

  const legacyMod = await importModuleFrom(legacyAppPath);
  const compatMod = await importModuleFrom(compatAppPath);

  const {
    resolveCompatTargetMode,
    buildLegacyEditorTargetUrl,
    buildLegacyCompatTargetUrl,
    applyLegacyDirectFallbackProbe
  } = legacyMod;
  const {
    normalizeCompatSourceMode,
    normalizeCompatAssetBaseMode,
    buildCompatSourceUrls,
    applyEditorFallbackAvailabilityProbe
  } = compatMod;

  assert.equal(typeof resolveCompatTargetMode, 'function', 'legacy export resolveCompatTargetMode missing');
  assert.equal(typeof buildLegacyEditorTargetUrl, 'function', 'legacy export buildLegacyEditorTargetUrl missing');
  assert.equal(typeof buildLegacyCompatTargetUrl, 'function', 'legacy export buildLegacyCompatTargetUrl missing');
  assert.equal(typeof applyLegacyDirectFallbackProbe, 'function', 'legacy export applyLegacyDirectFallbackProbe missing');
  assert.equal(typeof normalizeCompatSourceMode, 'function', 'compat export normalizeCompatSourceMode missing');
  assert.equal(typeof normalizeCompatAssetBaseMode, 'function', 'compat export normalizeCompatAssetBaseMode missing');
  assert.equal(typeof buildCompatSourceUrls, 'function', 'compat export buildCompatSourceUrls missing');
  assert.equal(typeof applyEditorFallbackAvailabilityProbe, 'function', 'compat export applyEditorFallbackAvailabilityProbe missing');

  const cases = [];
  const check = (label, fn) => {
    fn();
    cases.push(label);
  };

  check('legacy target mode defaults to compat-default', () => {
    assert.equal(resolveCompatTargetMode('http://127.0.0.1:4900/jumpmap-runtime/legacy/'), 'compat-default');
  });

  check('legacy target mode parses explicit fallback and compat flags', () => {
    assert.equal(resolveCompatTargetMode('http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatTarget=0'), 'editor-fallback');
    assert.equal(resolveCompatTargetMode('http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatTarget=1'), 'compat-explicit');
  });

  check('legacy direct fallback probe switches to compat-auto-fallback when unavailable', () => {
    const okResult = applyLegacyDirectFallbackProbe('editor-fallback', { ok: true, status: 200 });
    assert.equal(okResult.targetMode, 'editor-fallback');
    assert.equal(okResult.changed, false);
    const badResult = applyLegacyDirectFallbackProbe('editor-fallback', { ok: false, status: 404 });
    assert.equal(badResult.targetMode, 'compat-auto-fallback');
    assert.equal(badResult.changed, true);
  });

  check('legacy compat/editor URL builders preserve params and runtime routes', () => {
    const base = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatTarget=0&legacyCompatDebug=1';
    const compatUrl = buildLegacyCompatTargetUrl(base);
    const editorUrl = buildLegacyEditorTargetUrl(base);
    assert.equal(compatUrl.pathname, '/jumpmap-runtime/legacy/compat/');
    assert.equal(editorUrl.pathname, '/jumpmap-editor/');
    assert.equal(compatUrl.searchParams.get('legacyCompatDebug'), '1');
    assert.equal(compatUrl.searchParams.get('launchMode'), 'play');
    assert.equal(editorUrl.searchParams.get('launchMode'), 'play');
  });

  check('compat mode normalizers default to runtime-owned and parse editor aliases', () => {
    assert.equal(normalizeCompatSourceMode(null), 'runtime-owned');
    assert.equal(normalizeCompatAssetBaseMode(undefined), 'runtime-owned');
    assert.equal(normalizeCompatSourceMode('editor'), 'editor');
    assert.equal(normalizeCompatSourceMode('0'), 'editor');
    assert.equal(normalizeCompatAssetBaseMode('off'), 'editor');
  });

  check('compat URL builder defaults to runtime-owned source and asset-base', () => {
    const urls = buildCompatSourceUrls('http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/');
    assert.equal(urls.sourceMode, 'runtime-owned');
    assert.equal(urls.assetBaseMode, 'runtime-owned');
    assert.equal(urls.sourceIndexUrl.pathname, '/jumpmap-runtime/legacy/compat/runtime-owned/index.html');
    assert.equal(urls.assetBaseUrl.pathname, '/jumpmap-runtime/legacy/compat/runtime-owned/');
  });

  check('compat editor-mode request auto-recovers to runtime-owned on missing editor path', () => {
    const requested = buildCompatSourceUrls(
      'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor'
    );
    assert.equal(requested.sourceMode, 'editor');
    assert.equal(requested.assetBaseMode, 'editor');
    const recovered = applyEditorFallbackAvailabilityProbe(requested, { ok: false, status: 404 });
    assert.equal(recovered.changed, true);
    assert.equal(recovered.compatSource.requestedSourceMode, 'editor');
    assert.equal(recovered.compatSource.requestedAssetBaseMode, 'editor');
    assert.equal(recovered.compatSource.sourceMode, 'runtime-owned');
    assert.equal(recovered.compatSource.assetBaseMode, 'runtime-owned');
    assert.equal(recovered.compatSource.sourceIndexUrl.pathname, '/jumpmap-runtime/legacy/compat/runtime-owned/index.html');
    assert.equal(recovered.compatSource.assetBaseUrl.pathname, '/jumpmap-runtime/legacy/compat/runtime-owned/');
  });

  check('compat editor-mode request remains editor when editor path probe succeeds', () => {
    const requested = buildCompatSourceUrls(
      'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor'
    );
    const kept = applyEditorFallbackAvailabilityProbe(requested, { ok: true, status: 200 });
    assert.equal(kept.changed, false);
    assert.equal(kept.compatSource.sourceMode, 'editor');
    assert.equal(kept.compatSource.assetBaseMode, 'editor');
    // compat page lives under /jumpmap-runtime/legacy/compat/, so ../../jumpmap-editor resolves here.
    assert.equal(kept.compatSource.sourceIndexUrl.pathname, '/jumpmap-runtime/jumpmap-editor/index.html');
    assert.equal(kept.compatSource.assetBaseUrl.pathname, '/jumpmap-runtime/jumpmap-editor/');
  });

  check('compat mixed editor/runtime-owned request only recovers missing editor side', () => {
    const requested = buildCompatSourceUrls(
      'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=runtimeOwned'
    );
    const recovered = applyEditorFallbackAvailabilityProbe(requested, { ok: false, status: 404 });
    assert.equal(recovered.changed, true);
    assert.equal(recovered.compatSource.sourceMode, 'runtime-owned');
    assert.equal(recovered.compatSource.assetBaseMode, 'runtime-owned');
  });

  console.log('[jumpmap-verify-legacy-compat-fallback-logic] ok');
  console.log(`  runtime : ${opts.runtimeDir}`);
  console.log(`  cases   : ${cases.length}`);
};

try {
  await main();
} catch (error) {
  console.error('[jumpmap-verify-legacy-compat-fallback-logic] failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
}
