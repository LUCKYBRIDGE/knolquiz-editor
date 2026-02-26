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
    'jumpmap-verify-legacy-compat-pipeline',
    '',
    'Usage:',
    '  node scripts/jumpmap-verify-legacy-compat-pipeline.mjs [--runtime-dir <dir>]',
    '',
    'Checks:',
    '  - legacy host target mode + fallback probe resolution',
    '  - compat source/asset-base resolution + editor-path auto-recovery',
    '  - compat HTML inject transform against runtime-owned snapshot'
  ].join('\n'));
};

const createTempModuleCopy = (absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const tempName = `jumpmap-pipeline-verify-${path.basename(absolutePath, '.js')}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`;
  const tempPath = path.join(os.tmpdir(), tempName);
  fs.writeFileSync(tempPath, `${source}\n`, 'utf8');
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

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const legacyAppPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/app.js');
  const compatAppPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/compat/app.js');
  const runtimeOwnedIndexPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/compat/runtime-owned/index.html');

  const legacyMod = await importModuleFrom(legacyAppPath);
  const compatMod = await importModuleFrom(compatAppPath);

  const {
    resolveCompatTargetMode,
    buildLegacyEditorTargetUrl,
    buildLegacyCompatTargetUrl,
    applyLegacyDirectFallbackProbe
  } = legacyMod;
  const {
    buildCompatSourceUrls,
    applyEditorFallbackAvailabilityProbe,
    injectCompatHead
  } = compatMod;

  assert.equal(typeof resolveCompatTargetMode, 'function');
  assert.equal(typeof buildLegacyEditorTargetUrl, 'function');
  assert.equal(typeof buildLegacyCompatTargetUrl, 'function');
  assert.equal(typeof applyLegacyDirectFallbackProbe, 'function');
  assert.equal(typeof buildCompatSourceUrls, 'function');
  assert.equal(typeof applyEditorFallbackAvailabilityProbe, 'function');
  assert.equal(typeof injectCompatHead, 'function');

  const runtimeOwnedSnapshotHtml = fs.readFileSync(runtimeOwnedIndexPath, 'utf8');
  const cases = [];
  const check = (label, fn) => {
    fn();
    cases.push(label);
  };

  const injectSanity = (compatSource) => {
    const injected = injectCompatHead(runtimeOwnedSnapshotHtml, compatSource.assetBaseUrl);
    assert.match(injected, /jumpmap-runtime legacy compat target/);
    assert.match(injected, new RegExp(`<base href="${escapeRegExp(compatSource.assetBaseUrl.toString())}">`));
    assert.ok(injected.includes('__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__'));
    return injected;
  };

  check('default legacy route resolves to compat pipeline with runtime-owned source+assetBase', () => {
    const legacyUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatDebug=1';
    assert.equal(resolveCompatTargetMode(legacyUrl), 'compat-default');
    const compatTarget = buildLegacyCompatTargetUrl(legacyUrl);
    assert.equal(compatTarget.pathname, '/jumpmap-runtime/legacy/compat/');
    const compatSource = buildCompatSourceUrls(compatTarget.toString());
    assert.equal(compatSource.sourceMode, 'runtime-owned');
    assert.equal(compatSource.assetBaseMode, 'runtime-owned');
    const injected = injectSanity(compatSource);
    assert.match(injected, /compat-head-injected/);
  });

  check('legacy direct fallback request auto-recovers to compat in split runtime (probe 404)', () => {
    const legacyUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatTarget=0&legacyCompatDebug=1';
    assert.equal(resolveCompatTargetMode(legacyUrl), 'editor-fallback');
    const fallback = applyLegacyDirectFallbackProbe('editor-fallback', { ok: false, status: 404 });
    assert.equal(fallback.targetMode, 'compat-auto-fallback');
    const compatTarget = buildLegacyCompatTargetUrl(legacyUrl);
    const compatSource = buildCompatSourceUrls(compatTarget.toString());
    assert.equal(compatSource.sourceMode, 'runtime-owned');
    assert.equal(compatSource.assetBaseMode, 'runtime-owned');
    injectSanity(compatSource);
  });

  check('legacy direct fallback request remains editor path in dev/monorepo when probe succeeds', () => {
    const legacyUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/?legacyCompatTarget=0';
    const fallback = applyLegacyDirectFallbackProbe('editor-fallback', { ok: true, status: 200 });
    assert.equal(fallback.targetMode, 'editor-fallback');
    const editorTarget = buildLegacyEditorTargetUrl(legacyUrl);
    assert.equal(editorTarget.pathname, '/jumpmap-editor/');
    assert.equal(editorTarget.searchParams.get('launchMode'), 'play');
  });

  check('compat editor source/asset-base request auto-recovers to runtime-owned before inject when editor path missing', () => {
    const compatUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor';
    const requested = buildCompatSourceUrls(compatUrl);
    assert.equal(requested.sourceMode, 'editor');
    assert.equal(requested.assetBaseMode, 'editor');
    const recovered = applyEditorFallbackAvailabilityProbe(requested, { ok: false, status: 404 });
    assert.equal(recovered.changed, true);
    assert.equal(recovered.compatSource.sourceMode, 'runtime-owned');
    assert.equal(recovered.compatSource.assetBaseMode, 'runtime-owned');
    const injected = injectSanity(recovered.compatSource);
    assert.ok(injected.includes(JSON.stringify(recovered.compatSource.assetBaseUrl.toString())));
  });

  check('compat editor source-only request recovers source while preserving runtime-owned assetBase request', () => {
    const compatUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=runtimeOwned';
    const requested = buildCompatSourceUrls(compatUrl);
    const recovered = applyEditorFallbackAvailabilityProbe(requested, { ok: false, status: 404 });
    assert.equal(recovered.changed, true);
    assert.equal(recovered.compatSource.requestedSourceMode, 'editor');
    assert.equal(recovered.compatSource.requestedAssetBaseMode, 'runtime-owned');
    assert.equal(recovered.compatSource.sourceMode, 'runtime-owned');
    assert.equal(recovered.compatSource.assetBaseMode, 'runtime-owned');
    injectSanity(recovered.compatSource);
  });

  check('compat editor request remains editor in dev/monorepo when probe succeeds', () => {
    const compatUrl = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor';
    const requested = buildCompatSourceUrls(compatUrl);
    const kept = applyEditorFallbackAvailabilityProbe(requested, { ok: true, status: 200 });
    assert.equal(kept.changed, false);
    assert.equal(kept.compatSource.sourceMode, 'editor');
    assert.equal(kept.compatSource.assetBaseMode, 'editor');
    const injected = injectCompatHead(runtimeOwnedSnapshotHtml, kept.compatSource.assetBaseUrl);
    assert.match(injected, /jumpmap-runtime legacy compat target/);
  });

  console.log('[jumpmap-verify-legacy-compat-pipeline] ok');
  console.log(`  runtime : ${opts.runtimeDir}`);
  console.log(`  cases   : ${cases.length}`);
};

try {
  await main();
} catch (error) {
  console.error('[jumpmap-verify-legacy-compat-pipeline] failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
}
