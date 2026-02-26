#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PUBLIC_ROOT = path.join(projectRoot, 'public');
const COMPAT_ROOT = path.join(projectRoot, 'public', 'jumpmap-runtime', 'legacy', 'compat');
const RUNTIME_OWNED_ROOT = path.join(COMPAT_ROOT, 'runtime-owned');

// `runtime-owned/index.html` is managed as a separate compat source snapshot.
const RUNTIME_OWNED_EDITOR_FILE_REL_PATHS = [
  'editor.css',
  'editor.js',
  'game-rule-adapter.js',
  'geometry-utils.js',
  'hitbox-utils.js',
  'integration-bridge.js',
  'map-io-utils.js',
  'test-physics-utils.js',
  'test-runtime.js',
  'data/plates.json'
];

const RUNTIME_OWNED_EDITOR_DIR_REL_PATHS = [
  'textures'
];

const COMPAT_PUBLIC_FILE_REL_PATHS = [
  'quiz/core/bank.js',
  'quiz/core/engine.js',
  'quiz/core/events.js',
  'quiz/core/scoring.js',
  'quiz/core/selection.js',
  'shared/local-game-records.js',
  'shared/maps/jumpmap-01.json',
  'quiz_background/Geumgangjeondo.jpg'
];

const COMPAT_PUBLIC_DIR_REL_PATHS = [
  'quiz/data',
  'quiz/nets',
  'quiz_plate',
  'quiz_sejong'
];

const printHelp = () => {
  console.log(
    [
      'jumpmap-sync-runtime-legacy-compat-assets',
      '',
      'Usage:',
      '  node scripts/jumpmap-sync-runtime-legacy-compat-assets.mjs [options]',
      '',
      'Options:',
      '  --check      Verify canary mirror files match source assets (exit 1 on mismatch)',
      '  --dry-run    Report what would change without writing',
      '  --help       Show this help',
      '',
      'Notes:',
      '  - Syncs minimum asset set for runtime-owned compat canaries.',
      '  - Does not rewrite runtime-owned/index.html (source snapshot managed separately).'
    ].join('\n')
  );
};

const parseArgs = (argv) => {
  const opts = {
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
    throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
};

const toRel = (p) => path.relative(projectRoot, p).replace(/\\/g, '/');

const listFilesRecursive = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const walk = (cur) => {
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.name.startsWith('_backup-')) return;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        return;
      }
      if (entry.isFile()) out.push(full);
    });
  };
  walk(dirPath);
  out.sort((a, b) => a.localeCompare(b));
  return out;
};

const buildSyncPlan = () => {
  const plan = [];

  RUNTIME_OWNED_EDITOR_FILE_REL_PATHS.forEach((relPath) => {
    plan.push({
      kind: 'file',
      source: path.join(PUBLIC_ROOT, 'jumpmap-editor', relPath),
      target: path.join(RUNTIME_OWNED_ROOT, relPath)
    });
  });

  RUNTIME_OWNED_EDITOR_DIR_REL_PATHS.forEach((relDir) => {
    const srcDir = path.join(PUBLIC_ROOT, 'jumpmap-editor', relDir);
    const dstDir = path.join(RUNTIME_OWNED_ROOT, relDir);
    const files = listFilesRecursive(srcDir);
    files.forEach((srcFile) => {
      plan.push({
        kind: 'file',
        source: srcFile,
        target: path.join(dstDir, path.relative(srcDir, srcFile))
      });
    });
  });

  COMPAT_PUBLIC_FILE_REL_PATHS.forEach((relPath) => {
    plan.push({
      kind: 'file',
      source: path.join(PUBLIC_ROOT, relPath),
      target: path.join(COMPAT_ROOT, relPath)
    });
  });

  COMPAT_PUBLIC_DIR_REL_PATHS.forEach((relDir) => {
    const srcDir = path.join(PUBLIC_ROOT, relDir);
    const dstDir = path.join(COMPAT_ROOT, relDir);
    const files = listFilesRecursive(srcDir);
    files.forEach((srcFile) => {
      plan.push({
        kind: 'file',
        source: srcFile,
        target: path.join(dstDir, path.relative(srcDir, srcFile))
      });
    });
  });

  plan.sort((a, b) => (
    a.target.localeCompare(b.target)
    || a.source.localeCompare(b.source)
  ));
  return plan;
};

const compareFiles = (source, target) => {
  if (!fs.existsSync(source)) return { ok: false, reason: 'source-missing' };
  if (!fs.existsSync(target)) return { ok: false, reason: 'target-missing' };
  const sourceBuf = fs.readFileSync(source);
  const targetBuf = fs.readFileSync(target);
  if (Buffer.compare(sourceBuf, targetBuf) === 0) {
    return { ok: true, sourceBytes: sourceBuf.length, targetBytes: targetBuf.length };
  }
  return {
    ok: false,
    reason: 'content-mismatch',
    sourceBytes: sourceBuf.length,
    targetBytes: targetBuf.length
  };
};

const syncFile = (source, target, { dryRun = false } = {}) => {
  if (!fs.existsSync(source)) {
    return { changed: false, error: 'source-missing' };
  }
  const sourceBuf = fs.readFileSync(source);
  const targetExists = fs.existsSync(target);
  const targetBuf = targetExists ? fs.readFileSync(target) : null;
  const inSync = !!targetBuf && Buffer.compare(sourceBuf, targetBuf) === 0;
  if (inSync) {
    return { changed: false, sourceBytes: sourceBuf.length, targetBytes: targetBuf.length };
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sourceBuf);
  }
  return {
    changed: true,
    sourceBytes: sourceBuf.length,
    targetExists,
    targetBytes: targetBuf ? targetBuf.length : 0
  };
};

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const plan = buildSyncPlan();
  if (plan.length === 0) {
    throw new Error('sync plan is empty');
  }

  const stats = {
    filesPlanned: plan.length,
    changed: 0,
    unchanged: 0,
    missingSource: 0,
    missingTarget: 0,
    mismatched: 0,
    copiedBytes: 0
  };
  const issues = [];

  if (opts.check) {
    plan.forEach((entry) => {
      const result = compareFiles(entry.source, entry.target);
      if (result.ok) {
        stats.unchanged += 1;
        return;
      }
      if (result.reason === 'source-missing') {
        stats.missingSource += 1;
      } else if (result.reason === 'target-missing') {
        stats.missingTarget += 1;
      } else {
        stats.mismatched += 1;
      }
      issues.push({
        reason: result.reason,
        source: toRel(entry.source),
        target: toRel(entry.target)
      });
    });

    const ok = issues.length === 0;
    console.log(`[jumpmap-sync-runtime-legacy-compat-assets] ${ok ? 'check ok' : 'check failed'}`);
    console.log(`  plan   : ${stats.filesPlanned} files`);
    console.log(`  target : ${toRel(COMPAT_ROOT)}`);
    console.log(`  check  : ok=${stats.unchanged}, missingSource=${stats.missingSource}, missingTarget=${stats.missingTarget}, mismatched=${stats.mismatched}`);
    if (!ok) {
      issues.slice(0, 20).forEach((issue) => {
        console.log(`  ${issue.reason}: ${issue.source} -> ${issue.target}`);
      });
      if (issues.length > 20) {
        console.log(`  ... and ${issues.length - 20} more`);
      }
      process.exit(1);
    }
    return;
  }

  plan.forEach((entry) => {
    const result = syncFile(entry.source, entry.target, { dryRun: opts.dryRun });
    if (result.error === 'source-missing') {
      stats.missingSource += 1;
      issues.push({
        reason: result.error,
        source: toRel(entry.source),
        target: toRel(entry.target)
      });
      return;
    }
    if (result.changed) {
      stats.changed += 1;
      stats.copiedBytes += result.sourceBytes || 0;
    } else {
      stats.unchanged += 1;
    }
  });

  const ok = issues.length === 0;
  console.log(`[jumpmap-sync-runtime-legacy-compat-assets] ${opts.dryRun ? 'dry-run complete' : 'sync complete'}`);
  console.log(`  plan   : ${stats.filesPlanned} files`);
  console.log(`  target : ${toRel(COMPAT_ROOT)}`);
  console.log(`  result : changed=${stats.changed}, unchanged=${stats.unchanged}, missingSource=${stats.missingSource}, copiedBytes=${stats.copiedBytes}`);
  console.log(`  note   : runtime-owned/index.html is not rewritten by this script`);
  if (!ok) {
    issues.forEach((issue) => {
      console.log(`  ${issue.reason}: ${issue.source} -> ${issue.target}`);
    });
    process.exit(1);
  }
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-sync-runtime-legacy-compat-assets] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
