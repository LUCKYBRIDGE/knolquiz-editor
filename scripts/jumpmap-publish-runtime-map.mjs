#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const printHelp = () => {
  console.log(`jumpmap-publish-runtime-map\n\n` +
    `Usage:\n` +
    `  node scripts/jumpmap-publish-runtime-map.mjs [options]\n\n` +
    `Options:\n` +
    `  --source <file>         Source map json (default: save_map/jumpmap-01.json)\n` +
    `  --target <file>         Target map json file (absolute or project-relative)\n` +
    `  --runtime-repo <dir>    Runtime repo root; target becomes <dir>/public/shared/maps/<map-name>\n` +
    `  --map-name <name>       Target filename when --runtime-repo is used (default: jumpmap-01.json)\n` +
    `  --dry-run               Validate and print summary without writing files\n` +
    `  --no-backup             Skip creating backup when target exists\n` +
    `  --help                  Show this help\n\n` +
    `Examples:\n` +
    `  node scripts/jumpmap-publish-runtime-map.mjs\n` +
    `  node scripts/jumpmap-publish-runtime-map.mjs --runtime-repo ../quiz-game-suite\n` +
    `  node scripts/jumpmap-publish-runtime-map.mjs --target public/shared/maps/jumpmap-01.json\n`);
};

const timestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const resolveMaybeRelative = (value) => {
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
};

const parseArgs = (argv) => {
  const opts = {
    source: path.join(projectRoot, 'save_map', 'jumpmap-01.json'),
    target: '',
    runtimeRepo: '',
    mapName: 'jumpmap-01.json',
    dryRun: false,
    noBackup: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '--no-backup') {
      opts.noBackup = true;
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
    if (arg === '--map-name') {
      opts.mapName = String(argv[i + 1] || '').trim() || 'jumpmap-01.json';
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  if (!opts.source) throw new Error('--source path is required');
  if (!opts.mapName.endsWith('.json')) {
    opts.mapName = `${opts.mapName}.json`;
  }

  if (!opts.target) {
    if (opts.runtimeRepo) {
      opts.target = path.join(opts.runtimeRepo, 'public', 'shared', 'maps', opts.mapName);
    } else {
      opts.target = path.join(projectRoot, 'public', 'shared', 'maps', opts.mapName);
    }
  }

  return opts;
};

const summarizeMap = (map) => {
  const objects = Array.isArray(map?.objects) ? map.objects : [];
  let rectHitboxes = 0;
  let polygonHitboxes = 0;
  objects.forEach((obj) => {
    const hitboxes = Array.isArray(obj?.hitboxes) ? obj.hitboxes : [];
    hitboxes.forEach((hb) => {
      if (!hb || typeof hb !== 'object') return;
      if (hb.type === 'polygon') polygonHitboxes += 1;
      else rectHitboxes += 1;
    });
  });

  const mapW = Number(map?.mapSize?.w);
  const mapH = Number(map?.mapSize?.h);
  return {
    version: Number(map?.version) || 0,
    width: Number.isFinite(mapW) ? mapW : 0,
    height: Number.isFinite(mapH) ? mapH : 0,
    objectCount: objects.length,
    rectHitboxes,
    polygonHitboxes,
    hasBackgroundImage: Boolean(map?.background?.image)
  };
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

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(opts.source, 'utf8'));
  } catch (error) {
    throw new Error(`failed to parse source json: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('source json is not an object');
  }

  const summary = summarizeMap(parsed);
  const targetDir = path.dirname(opts.target);
  const backupPath = `${opts.target}.bak-${timestamp()}`;

  if (!opts.dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });

    if (!opts.noBackup && fs.existsSync(opts.target)) {
      fs.copyFileSync(opts.target, backupPath);
    }

    fs.writeFileSync(opts.target, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  }

  const statusPrefix = '[jumpmap-publish-runtime-map]';
  console.log(`${statusPrefix} ${opts.dryRun ? 'dry-run ok' : 'published'}:`);
  console.log(`  source : ${path.relative(projectRoot, opts.source)}`);
  console.log(`  target : ${path.relative(projectRoot, opts.target)}`);
  if (!opts.dryRun && !opts.noBackup && fs.existsSync(backupPath)) {
    console.log(`  backup : ${path.relative(projectRoot, backupPath)}`);
  }
  console.log(`  map    : v${summary.version} · ${summary.width}x${summary.height} · objects ${summary.objectCount} · hitboxes ${summary.rectHitboxes}/${summary.polygonHitboxes} · background ${summary.hasBackgroundImage ? 'image' : 'none'}`);
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-publish-runtime-map] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
