#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_RUNTIME_DIR = path.resolve(projectRoot, '..', 'knolquiz-runtime');

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
    'jumpmap-verify-legacy-compat-inject-logic',
    '',
    'Usage:',
    '  node scripts/jumpmap-verify-legacy-compat-inject-logic.mjs [--runtime-dir <dir>]',
    '',
    'Checks:',
    '  - compat injectCompatHead() inserts marker/base/runtime script',
    '  - runtime-owned source snapshot HTML remains inject-compatible',
    '  - no-head HTML fallback wrapper path'
  ].join('\n'));
};

const createTempModuleCopy = (absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const tempName = `jumpmap-inject-verify-${path.basename(absolutePath, '.js')}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`;
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

  const compatAppPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/compat/app.js');
  const runtimeOwnedIndexPath = path.join(opts.runtimeDir, 'public/jumpmap-runtime/legacy/compat/runtime-owned/index.html');

  const compatMod = await importModuleFrom(compatAppPath);
  const { buildCompatSourceUrls, injectCompatHead } = compatMod;

  assert.equal(typeof buildCompatSourceUrls, 'function', 'compat export buildCompatSourceUrls missing');
  assert.equal(typeof injectCompatHead, 'function', 'compat export injectCompatHead missing');

  const cases = [];
  const check = (label, fn) => {
    fn();
    cases.push(label);
  };

  const runtimeOwnedPageHref = 'http://127.0.0.1:4900/jumpmap-runtime/legacy/compat/';
  const compatUrls = buildCompatSourceUrls(runtimeOwnedPageHref);
  const runtimeOwnedBase = compatUrls.runtimeOwnedSourceBaseUrl;
  const runtimeOwnedIndexHtml = fs.readFileSync(runtimeOwnedIndexPath, 'utf8');

  check('runtime-owned source snapshot contains expected seed marker', () => {
    assert.match(runtimeOwnedIndexHtml, /jumpmap-runtime legacy compat runtime-owned source snapshot/i);
    assert.match(runtimeOwnedIndexHtml, /점프맵 에디터/);
  });

  check('injectCompatHead inserts marker and base tag into runtime-owned source snapshot', () => {
    const injected = injectCompatHead(runtimeOwnedIndexHtml, runtimeOwnedBase);
    assert.match(injected, /jumpmap-runtime legacy compat target/);
    assert.match(injected, new RegExp(`<base href="${runtimeOwnedBase.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
    assert.match(injected, /__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__/);
    assert.match(injected, /compat-head-injected/);
    assert.match(injected, /점프맵 에디터/);
  });

  check('injectCompatHead writes into <head> when head exists', () => {
    const sample = '<!doctype html><html><head><meta charset="utf-8"></head><body><main>ok</main></body></html>';
    const injected = injectCompatHead(sample, new URL('http://127.0.0.1:4900/x/'));
    const headIndex = injected.indexOf('<head');
    const markerIndex = injected.indexOf('jumpmap-runtime legacy compat target');
    const bodyIndex = injected.indexOf('<body>');
    assert.ok(headIndex >= 0, 'head not found after inject');
    assert.ok(markerIndex > headIndex, 'marker should be inserted after <head>');
    assert.ok(markerIndex < bodyIndex, 'marker should be inserted before <body>');
  });

  check('injectCompatHead wraps no-head HTML with fallback document shell', () => {
    const injected = injectCompatHead('<div id="x">ok</div>', new URL('http://127.0.0.1:4900/y/'));
    assert.match(injected, /^<!doctype html><html><head>/i);
    assert.match(injected, /<body><div id="x">ok<\/div><\/body><\/html>$/i);
    assert.match(injected, /jumpmap-runtime legacy compat target/);
  });

  check('injectCompatHead preserves runtime-owned base href string exactly', () => {
    const injected = injectCompatHead('<html><head></head><body></body></html>', runtimeOwnedBase);
    assert.ok(injected.includes(`window.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__=${JSON.stringify(runtimeOwnedBase.toString())}`));
  });

  console.log('[jumpmap-verify-legacy-compat-inject-logic] ok');
  console.log(`  runtime : ${opts.runtimeDir}`);
  console.log(`  cases   : ${cases.length}`);
};

try {
  await main();
} catch (error) {
  console.error('[jumpmap-verify-legacy-compat-inject-logic] failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
}
