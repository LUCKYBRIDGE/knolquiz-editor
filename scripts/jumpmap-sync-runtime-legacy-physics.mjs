#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_SOURCE = path.join(projectRoot, 'public', 'jumpmap-editor', 'test-physics-utils.js');
const DEFAULT_TARGET = path.join(projectRoot, 'public', 'shared', 'legacy', 'test-physics-utils.js');

const printHelp = () => {
  console.log(
    [
      'jumpmap-sync-runtime-legacy-physics',
      '',
      'Usage:',
      '  node scripts/jumpmap-sync-runtime-legacy-physics.mjs [options]',
      '',
      'Options:',
      '  --source <file>       Source file (default: public/jumpmap-editor/test-physics-utils.js)',
      '  --target <file>       Target file (default: public/shared/legacy/test-physics-utils.js)',
      '  --runtime-repo <dir>  Target runtime repo root; target becomes <dir>/public/shared/legacy/test-physics-utils.js',
      '  --check               Only verify source/target content match (exit 1 on mismatch)',
      '  --dry-run             Print what would change without writing',
      '  --help                Show this help',
      '',
      'Examples:',
      '  node scripts/jumpmap-sync-runtime-legacy-physics.mjs',
      '  node scripts/jumpmap-sync-runtime-legacy-physics.mjs --check',
      '  node scripts/jumpmap-sync-runtime-legacy-physics.mjs --runtime-repo ../knolquiz-runtime',
      '  node scripts/jumpmap-sync-runtime-legacy-physics.mjs --runtime-repo ../knolquiz-runtime --check'
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
      opts.target = path.join(opts.runtimeRepo, 'public', 'shared', 'legacy', 'test-physics-utils.js');
    } else {
      opts.target = DEFAULT_TARGET;
    }
  }
  return opts;
};

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const toRel = (p) => path.relative(projectRoot, p);

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(opts.source)) {
    throw new Error(`source not found: ${opts.source}`);
  }

  const sourceBuf = fs.readFileSync(opts.source);
  const sourceHash = sha256(sourceBuf);

  const targetExists = fs.existsSync(opts.target);
  const targetBuf = targetExists ? fs.readFileSync(opts.target) : null;
  const targetHash = targetBuf ? sha256(targetBuf) : '';
  const inSync = !!targetBuf && Buffer.compare(sourceBuf, targetBuf) === 0;

  if (opts.check) {
    if (!targetExists) {
      console.log('[jumpmap-sync-runtime-legacy-physics] check failed');
      console.log(`  source : ${toRel(opts.source)}`);
      console.log(`  target : ${toRel(opts.target)} (missing)`);
      process.exit(1);
    }
    if (!inSync) {
      console.log('[jumpmap-sync-runtime-legacy-physics] check failed');
      console.log(`  source : ${toRel(opts.source)} (${sourceBuf.length} bytes, sha256 ${sourceHash.slice(0, 12)})`);
      console.log(`  target : ${toRel(opts.target)} (${targetBuf.length} bytes, sha256 ${targetHash.slice(0, 12)})`);
      process.exit(1);
    }
    console.log('[jumpmap-sync-runtime-legacy-physics] check ok');
    console.log(`  source : ${toRel(opts.source)} (${sourceBuf.length} bytes, sha256 ${sourceHash.slice(0, 12)})`);
    console.log(`  target : ${toRel(opts.target)} (${targetBuf.length} bytes, sha256 ${targetHash.slice(0, 12)})`);
    return;
  }

  if (inSync) {
    console.log('[jumpmap-sync-runtime-legacy-physics] already in sync');
    console.log(`  source : ${toRel(opts.source)}`);
    console.log(`  target : ${toRel(opts.target)}`);
    console.log(`  hash   : ${sourceHash.slice(0, 12)}`);
    return;
  }

  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(opts.target), { recursive: true });
    fs.writeFileSync(opts.target, sourceBuf);
  }

  console.log(`[jumpmap-sync-runtime-legacy-physics] ${opts.dryRun ? 'dry-run diff detected' : 'synced'}`);
  console.log(`  source : ${toRel(opts.source)} (${sourceBuf.length} bytes, sha256 ${sourceHash.slice(0, 12)})`);
  if (targetExists && targetBuf) {
    console.log(`  target : ${toRel(opts.target)} (${targetBuf.length} bytes, sha256 ${targetHash.slice(0, 12)})`);
  } else {
    console.log(`  target : ${toRel(opts.target)} (new file)`);
  }
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-sync-runtime-legacy-physics] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
