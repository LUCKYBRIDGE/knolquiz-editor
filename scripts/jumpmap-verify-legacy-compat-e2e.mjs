#!/usr/bin/env node

import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_RUNTIME_DIR = path.resolve(projectRoot, '..', 'nolquiz-runtime');

const parseArgs = (argv) => {
  const opts = {
    runtimeDir: DEFAULT_RUNTIME_DIR,
    host: '127.0.0.1',
    port: 0,
    timeoutMs: 15000,
    headed: false,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--headed') {
      opts.headed = true;
      continue;
    }
    if (arg === '--runtime-dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('missing value for --runtime-dir');
      opts.runtimeDir = path.isAbsolute(next) ? next : path.resolve(projectRoot, next);
      i += 1;
      continue;
    }
    if (arg === '--host') {
      const next = argv[i + 1];
      if (!next) throw new Error('missing value for --host');
      opts.host = next;
      i += 1;
      continue;
    }
    if (arg === '--port') {
      const next = argv[i + 1];
      if (!next) throw new Error('missing value for --port');
      opts.port = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      const next = argv[i + 1];
      if (!next) throw new Error('missing value for --timeout-ms');
      opts.timeoutMs = Number(next);
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
    throw new Error(`invalid --timeout-ms: ${opts.timeoutMs}`);
  }
  if (!Number.isFinite(opts.port) || opts.port < 0 || opts.port > 65535) {
    throw new Error(`invalid --port: ${opts.port}`);
  }
  return opts;
};

const printHelp = () => {
  console.log([
    'jumpmap-verify-legacy-compat-e2e',
    '',
    'Usage:',
    '  node scripts/jumpmap-verify-legacy-compat-e2e.mjs [--runtime-dir <dir>] [--port <n>] [--headed] [--timeout-ms <ms>]',
    '',
    'Notes:',
    '  - Requires playwright package available in current Node resolution.',
    '  - Example: npm install --no-save playwright && npx playwright install chromium && node scripts/jumpmap-verify-legacy-compat-e2e.mjs'
  ].join('\n'));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickPort = async (host) => {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error('failed to allocate local port');
  return port;
};

const startLocalServer = (repoDir, host, port, timeoutMs) => new Promise((resolve, reject) => {
  const child = spawn('node', ['scripts/jumpmap-local-serve.mjs', `--host=${host}`, `--port=${port}`], {
    cwd: repoDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let settled = false;
  let output = '';
  const done = (ok, value) => {
    if (settled) return;
    settled = true;
    if (ok) resolve(value);
    else reject(value);
  };
  const onData = (chunk) => {
    const text = String(chunk || '');
    output += text;
    if (output.includes('Jumpmap local server running:')) {
      done(true, { child, output });
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => {
    done(false, new Error(`local server exited early (code=${code})`));
  });
  setTimeout(() => {
    done(false, new Error(`local server start timeout (${port})`));
  }, timeoutMs);
});

const stopLocalServer = async (child) => {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  await sleep(200);
  if (!child.killed) child.kill('SIGKILL');
};

const loadPlaywright = async () => {
  let mod;
  try {
    mod = await import('playwright');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `playwright package not found in current Node resolution (${message}). ` +
      `Install playwright locally (temp install ok) and rerun, e.g. ` +
      `npm install --no-save playwright && npx playwright install chromium && node scripts/jumpmap-verify-legacy-compat-e2e.mjs`
    );
  }
  const pkg = mod?.default || mod;
  if (!pkg?.chromium) throw new Error('playwright chromium export not found');
  return pkg;
};

const textContentOr = async (page, selector) => {
  try {
    return (await page.locator(selector).textContent()) || '';
  } catch (_error) {
    return '';
  }
};

const attributeOr = async (page, selector, name) => {
  try {
    return (await page.locator(selector).getAttribute(name)) || '';
  } catch (_error) {
    return '';
  }
};

const isVisibleOr = async (page, selector) => {
  try {
    return await page.locator(selector).isVisible();
  } catch (_error) {
    return false;
  }
};

const listTextContents = async (page, selector) => {
  try {
    return await page.locator(selector).allTextContents();
  } catch (_error) {
    return [];
  }
};

const waitForHostCompatReady = async (page, timeoutMs) => {
  await page.waitForFunction(
    () => {
      const modeText = document.getElementById('compat-mode-row')?.textContent || '';
      const eventText = document.getElementById('compat-event-row')?.textContent || '';
      const events = Array.from(document.querySelectorAll('#compat-events li')).map((el) => el.textContent || '');
      const hasMode = modeText.includes('runtime-owned');
      const hasSuccessEvent = eventText.includes('compat window load') ||
        eventText.includes('compat DOMContentLoaded') ||
        events.some((item) => item.includes('compat window load') || item.includes('compat DOMContentLoaded'));
      const hasErrorEvent = eventText.includes('fetch error') || eventText.includes('compat inject failed');
      return hasMode && hasSuccessEvent && !hasErrorEvent;
    },
    { timeout: timeoutMs }
  );
};

const waitForFrameCompatMarker = async (page, timeoutMs) => {
  await page.waitForFunction(
    () => {
      const frame = document.getElementById('legacy-frame');
      if (!(frame instanceof HTMLIFrameElement)) return false;
      const win = frame.contentWindow;
      return !!(win &&
        win.__JUMPMAP_RUNTIME_LEGACY_COMPAT_TARGET__ === true &&
        typeof win.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__ === 'string' &&
        win.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__);
    },
    { timeout: timeoutMs }
  );
  return page.evaluate(() => {
    const frame = document.getElementById('legacy-frame');
    const win = frame instanceof HTMLIFrameElement ? frame.contentWindow : null;
    const doc = win?.document || null;
    return {
      runtimeCompat: Boolean(win?.__JUMPMAP_RUNTIME_LEGACY_COMPAT_TARGET__),
      runtimeBaseHref: String(win?.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__ || ''),
      baseHref: doc?.querySelector('base')?.href || '',
      title: doc?.title || ''
    };
  });
};

const waitForCompatPageMarker = async (page, timeoutMs) => {
  await page.waitForFunction(
    () => (
      window.__JUMPMAP_RUNTIME_LEGACY_COMPAT_TARGET__ === true &&
      typeof window.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__ === 'string' &&
      window.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__.length > 0
    ),
    { timeout: timeoutMs }
  );
  return page.evaluate(() => ({
    runtimeCompat: Boolean(window.__JUMPMAP_RUNTIME_LEGACY_COMPAT_TARGET__),
    runtimeBaseHref: String(window.__JUMPMAP_EDITOR_RUNTIME_BASE_HREF__ || ''),
    baseHref: document.querySelector('base')?.href || '',
    title: document.title
  }));
};

const getLegacyContentFrame = async (page) => {
  const frameHandle = await page.locator('#legacy-frame').elementHandle();
  if (!frameHandle) throw new Error('legacy iframe element handle not found');
  try {
    const frame = await frameHandle.contentFrame();
    if (!frame) throw new Error('legacy iframe content frame not available');
    return frame;
  } finally {
    await frameHandle.dispose();
  }
};

const waitForTestModeReadyInCompatFrame = async (frame, timeoutMs) => {
  await frame.waitForSelector('#test-overlay:not(.hidden)', { timeout: timeoutMs });
  await frame.waitForSelector('.test-view', { timeout: timeoutMs });
  await frame.waitForSelector('.test-view .test-quiz-button', { timeout: timeoutMs });
};

const waitForFirstStartGuideHidden = async (frame, timeoutMs) => {
  await frame.waitForFunction(
    () => {
      const guide = document.querySelector('.test-view .test-start-guide');
      return !!guide && guide.classList.contains('hidden');
    },
    { timeout: timeoutMs }
  );
};

const clickFrameSelector = async (frame, selector) => {
  const clicked = await frame.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return false;
    el.click();
    return true;
  }, selector);
  assert.equal(clicked, true, `failed to click selector in compat frame: ${selector}`);
};

const waitForQuizChoicesReady = async (frame, timeoutMs) => {
  await frame.waitForSelector('.test-view .test-quiz-panel:not(.hidden)', { timeout: timeoutMs });
  await frame.waitForFunction(
    () => {
      const root = document.querySelector('.test-view');
      if (!(root instanceof HTMLElement)) return false;
      const choiceCount = root.querySelectorAll('.test-quiz-choice').length;
      if (choiceCount > 0) return true;
      const feedback = (root.querySelector('.test-quiz-feedback')?.textContent || '').trim();
      if (/문제 로드 실패|문제 로드 오류|문제 표시 오류/.test(feedback)) {
        throw new Error(`quiz ui entered error state: ${feedback}`);
      }
      return false;
    },
    { timeout: timeoutMs }
  );
};

const waitForQuizResultReady = async (frame, timeoutMs) => {
  await frame.waitForFunction(
    () => {
      const root = document.querySelector('.test-view');
      if (!(root instanceof HTMLElement)) return false;
      const actions = root.querySelector('.test-quiz-actions');
      const feedback = (root.querySelector('.test-quiz-feedback')?.textContent || '').trim();
      return !!actions && !actions.classList.contains('hidden') && feedback.length > 0;
    },
    { timeout: timeoutMs }
  );
};

const assertRuntimeOwnedBase = (baseHref, label) => {
  assert.ok(baseHref.includes('/jumpmap-runtime/legacy/compat/runtime-owned/'), `${label}: expected runtime-owned base, got ${baseHref}`);
  assert.ok(!baseHref.includes('/jumpmap-editor/'), `${label}: expected no /jumpmap-editor/ base, got ${baseHref}`);
};

const runCase = async (label, fn, cases) => {
  await fn();
  cases.push(label);
  console.log(`PASS ${label}`);
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const port = opts.port || await pickPort(opts.host);
  const baseUrl = `http://${opts.host}:${port}`;
  const { chromium } = await loadPlaywright();

  let serverChild = null;
  let browser = null;
  try {
    const started = await startLocalServer(opts.runtimeDir, opts.host, port, Math.min(opts.timeoutMs, 10000));
    serverChild = started.child;

    browser = await chromium.launch({ headless: !opts.headed });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeoutMs);

    const cases = [];

    await runCase('legacy default loads runtime-owned compat in iframe', async () => {
      await page.goto(`${baseUrl}/jumpmap-runtime/legacy/?legacyCompatDebug=1`, { waitUntil: 'domcontentloaded' });
      await page.locator('#legacy-frame').waitFor();
      await waitForHostCompatReady(page, opts.timeoutMs);
      const frameState = await waitForFrameCompatMarker(page, opts.timeoutMs);
      assert.equal(frameState.runtimeCompat, true);
      assertRuntimeOwnedBase(frameState.runtimeBaseHref, 'legacy default runtimeBaseHref');
      assertRuntimeOwnedBase(frameState.baseHref, 'legacy default <base>');
      const compatMode = await textContentOr(page, '#compat-mode-row');
      assert.ok(compatMode.includes('runtime-owned'), `compat mode should mention runtime-owned, got: ${compatMode}`);
      const compatEvent = await textContentOr(page, '#compat-event-row');
      assert.ok(compatEvent.includes('compat event:'), `compat event row should be populated, got: ${compatEvent}`);
      assert.equal(await isVisibleOr(page, '#compat-events-row'), true, 'compat events row should be visible in debug mode');
      const compatEvents = await listTextContents(page, '#compat-events li');
      assert.ok(compatEvents.length > 0, 'compat events list should contain recent events in debug mode');
      assert.ok(
        compatEvents.some((line) => line.includes('compat') || line.includes('host:')),
        `compat events list should contain compat/host telemetry, got: ${JSON.stringify(compatEvents)}`
      );
      assert.equal(await isVisibleOr(page, '#fallback-row'), true, 'fallback row should be visible');
      const fallbackRowText = await textContentOr(page, '#fallback-row');
      assert.ok(
        fallbackRowText.includes('레거시 플레이 새 탭 열기'),
        `fallback row text should mention new-tab helper link, got: ${fallbackRowText}`
      );
      const fallbackLinkHref = await attributeOr(page, '#fallback-link', 'href');
      assert.ok(
        fallbackLinkHref.includes('/jumpmap-runtime/legacy/compat/'),
        `fallback link should target compat route, got: ${fallbackLinkHref}`
      );
    }, cases);

    await runCase('legacy direct fallback query remains playable and converges to runtime-owned compat in split runtime', async () => {
      await page.goto(`${baseUrl}/jumpmap-runtime/legacy/?legacyCompatTarget=0&legacyCompatDebug=1`, { waitUntil: 'domcontentloaded' });
      await page.locator('#legacy-frame').waitFor();
      await waitForHostCompatReady(page, opts.timeoutMs);
      const compatMode = await textContentOr(page, '#compat-mode-row');
      assert.ok(compatMode.includes('runtime-owned'), `expected runtime-owned compat mode, got: ${compatMode}`);
      const targetRowText = await textContentOr(page, '#target-row');
      assert.ok(
        targetRowText.includes('/jumpmap-runtime/legacy/compat/'),
        `legacy direct fallback should converge target row to compat route, got: ${targetRowText}`
      );
      assert.ok(
        targetRowText.includes('legacyCompatTarget=0'),
        `legacy direct fallback query should preserve target flag for telemetry/debugging, got: ${targetRowText}`
      );
      const fallbackLinkHref = await attributeOr(page, '#fallback-link', 'href');
      assert.ok(
        fallbackLinkHref.includes('/jumpmap-runtime/legacy/compat/'),
        `fallback link should converge to compat route in split runtime, got: ${fallbackLinkHref}`
      );
      const frameState = await waitForFrameCompatMarker(page, opts.timeoutMs);
      assertRuntimeOwnedBase(frameState.runtimeBaseHref, 'legacy fallback auto-recovery runtimeBaseHref');
    }, cases);

    await runCase('compat editor query auto-recovers to runtime-owned source+asset-base', async () => {
      await page.goto(
        `${baseUrl}/jumpmap-runtime/legacy/compat/?legacyCompatSource=editor&legacyCompatAssetBase=editor&legacyCompatDebug=1`,
        { waitUntil: 'domcontentloaded' }
      );
      const compatState = await waitForCompatPageMarker(page, opts.timeoutMs);
      assert.equal(compatState.runtimeCompat, true);
      assertRuntimeOwnedBase(compatState.runtimeBaseHref, 'compat direct editor query runtimeBaseHref');
      assertRuntimeOwnedBase(compatState.baseHref, 'compat direct editor query <base>');
      assert.ok(compatState.title.includes('점프맵') || compatState.title.length > 0);
    }, cases);

    await runCase('legacy compat iframe auto-starts test mode and quiz panel roundtrip works', async () => {
      await page.goto(`${baseUrl}/jumpmap-runtime/legacy/?legacyCompatDebug=1`, { waitUntil: 'domcontentloaded' });
      await page.locator('#legacy-frame').waitFor();
      await waitForHostCompatReady(page, opts.timeoutMs);
      await waitForFrameCompatMarker(page, opts.timeoutMs);
      const compatFrame = await getLegacyContentFrame(page);

      await waitForTestModeReadyInCompatFrame(compatFrame, Math.max(opts.timeoutMs, 20000));

      // Auto-start guide should eventually hide; then restart should rebuild views and show the guide again.
      await waitForFirstStartGuideHidden(compatFrame, Math.max(opts.timeoutMs, 20000));
      await clickFrameSelector(compatFrame, '#test-restart');
      await compatFrame.waitForSelector('.test-view .test-start-guide:not(.hidden)', {
        timeout: Math.max(opts.timeoutMs, 10000)
      });

      // Quiz loop smoke: open -> question choices render -> answer -> result actions -> return to map.
      await clickFrameSelector(compatFrame, '.test-view .test-quiz-button');
      await waitForQuizChoicesReady(compatFrame, Math.max(opts.timeoutMs, 20000));
      const choiceCount = await compatFrame.evaluate(() => document.querySelectorAll('.test-view .test-quiz-choice').length);
      assert.ok(choiceCount > 0, `expected quiz choices > 0, got ${choiceCount}`);
      await clickFrameSelector(compatFrame, '.test-view .test-quiz-choice');
      await waitForQuizResultReady(compatFrame, Math.max(opts.timeoutMs, 10000));
      const feedbackText = await compatFrame.evaluate(
        () => (document.querySelector('.test-view .test-quiz-feedback')?.textContent || '').trim()
      );
      assert.ok(feedbackText.length > 0, 'expected quiz feedback text after submitting answer');
      await clickFrameSelector(compatFrame, '.test-view .test-quiz-actions .primary');
      await compatFrame.waitForFunction(
        () => {
          const panel = document.querySelector('.test-view .test-quiz-panel');
          return !!panel && panel.classList.contains('hidden');
        },
        { timeout: Math.max(opts.timeoutMs, 10000) }
      );
    }, cases);

    await context.close();
    console.log('[jumpmap-verify-legacy-compat-e2e] ok');
    console.log(`  runtime : ${opts.runtimeDir}`);
    console.log(`  base    : ${baseUrl}`);
    console.log(`  cases   : ${cases.length}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_error) {
        // no-op
      }
    }
    await stopLocalServer(serverChild);
  }
};

main().catch((error) => {
  console.error('[jumpmap-verify-legacy-compat-e2e] failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
