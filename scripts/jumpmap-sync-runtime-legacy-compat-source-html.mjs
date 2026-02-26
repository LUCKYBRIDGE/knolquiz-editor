#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const MARKER_LINE = '<!-- jumpmap-runtime legacy compat runtime-owned source snapshot (seeded from public/jumpmap-editor/index.html) -->';

const DEFAULT_SOURCE = path.join(projectRoot, 'public', 'jumpmap-editor', 'index.html');
const DEFAULT_TARGET = path.join(projectRoot, 'public', 'jumpmap-runtime', 'legacy', 'compat', 'runtime-owned', 'index.html');

const printHelp = () => {
  console.log(
    [
      'jumpmap-sync-runtime-legacy-compat-source-html',
      '',
      'Usage:',
      '  node scripts/jumpmap-sync-runtime-legacy-compat-source-html.mjs [options]',
      '',
      'Options:',
      '  --source <file>       Source HTML (default: public/jumpmap-editor/index.html)',
      '  --target <file>       Target HTML (default: public/jumpmap-runtime/legacy/compat/runtime-owned/index.html)',
      '  --runtime-repo <dir>  Target runtime repo root; target becomes <dir>/public/jumpmap-runtime/legacy/compat/runtime-owned/index.html',
      '  --check               Verify target matches generated snapshot (exit 1 on mismatch)',
      '  --dry-run             Print what would change without writing',
      '  --help                Show this help'
    ].join('\n')
  );
};

const resolveMaybeRelative = (value) => {
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
};

const parseArgs = (argv) => {
  const opts = {
    source: DEFAULT_SOURCE,
    target: '',
    runtimeRepo: '',
    check: false,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--check') {
      opts.check = true;
      continue;
    }
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '--source') {
      opts.source = resolveMaybeRelative(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (arg === '--target') {
      opts.target = resolveMaybeRelative(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (arg === '--runtime-repo') {
      opts.runtimeRepo = resolveMaybeRelative(argv[i + 1] || '');
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  if (!opts.source) throw new Error('--source path is required');
  if (!opts.target) {
    if (opts.runtimeRepo) {
      opts.target = path.join(opts.runtimeRepo, 'public', 'jumpmap-runtime', 'legacy', 'compat', 'runtime-owned', 'index.html');
    } else {
      opts.target = DEFAULT_TARGET;
    }
  }
  return opts;
};

const toRel = (p) => path.relative(projectRoot, p).replace(/\\/g, '/');

const detectNewline = (text) => (text.includes('\r\n') ? '\r\n' : '\n');

const stripMarkerLines = (text) => {
  const lineBreak = detectNewline(text);
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => line.trim() !== MARKER_LINE);
  return filtered.join(lineBreak);
};

const buildSnapshotHtml = (sourceText) => {
  const normalized = stripMarkerLines(sourceText);
  const nl = detectNewline(normalized);
  if (/<!doctype html>/i.test(normalized)) {
    return normalized.replace(/<!doctype html>\s*/i, (match) => {
      const doctype = match.trim();
      return `${doctype}${nl}${MARKER_LINE}${nl}`;
    });
  }
  return `${MARKER_LINE}${nl}${normalized}`;
};

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(opts.source)) {
    throw new Error(`source not found: ${opts.source}`);
  }

  const sourceText = fs.readFileSync(opts.source, 'utf8');
  const expectedText = buildSnapshotHtml(sourceText);

  const targetExists = fs.existsSync(opts.target);
  const targetText = targetExists ? fs.readFileSync(opts.target, 'utf8') : '';
  const inSync = targetExists && targetText === expectedText;

  if (opts.check) {
    if (!targetExists) {
      console.log('[jumpmap-sync-runtime-legacy-compat-source-html] check failed');
      console.log(`  source : ${toRel(opts.source)}`);
      console.log(`  target : ${toRel(opts.target)} (missing)`);
      process.exit(1);
    }
    if (!inSync) {
      console.log('[jumpmap-sync-runtime-legacy-compat-source-html] check failed');
      console.log(`  source : ${toRel(opts.source)} (${sourceText.length} chars)`);
      console.log(`  target : ${toRel(opts.target)} (${targetText.length} chars)`);
      console.log(`  reason : generated snapshot differs (rerun without --check)`);
      process.exit(1);
    }
    console.log('[jumpmap-sync-runtime-legacy-compat-source-html] check ok');
    console.log(`  source : ${toRel(opts.source)} (${sourceText.length} chars)`);
    console.log(`  target : ${toRel(opts.target)} (${targetText.length} chars)`);
    console.log(`  marker : present`);
    return;
  }

  if (inSync) {
    console.log('[jumpmap-sync-runtime-legacy-compat-source-html] already in sync');
    console.log(`  source : ${toRel(opts.source)}`);
    console.log(`  target : ${toRel(opts.target)}`);
    console.log(`  marker : present`);
    return;
  }

  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(opts.target), { recursive: true });
    fs.writeFileSync(opts.target, expectedText, 'utf8');
  }

  console.log(`[jumpmap-sync-runtime-legacy-compat-source-html] ${opts.dryRun ? 'dry-run diff detected' : 'synced'}`);
  console.log(`  source : ${toRel(opts.source)} (${sourceText.length} chars)`);
  if (targetExists) {
    console.log(`  target : ${toRel(opts.target)} (${targetText.length} chars -> ${expectedText.length} chars)`);
  } else {
    console.log(`  target : ${toRel(opts.target)} (new file, ${expectedText.length} chars)`);
  }
  console.log('  marker : present');
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-sync-runtime-legacy-compat-source-html] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
