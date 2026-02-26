#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDirCandidates = [
  path.join(projectRoot, 'quiz_plate'),
  path.join(projectRoot, 'public', 'quiz_plate')
];
const targetFile = path.join(projectRoot, 'public', 'jumpmap-editor', 'data', 'plates.json');
const backupDir = path.join(projectRoot, 'public', 'jumpmap-editor', 'data', '_backup');

const resolveSourceDir = () =>
  sourceDirCandidates.find((dirPath) => fs.existsSync(dirPath)) || sourceDirCandidates[0];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  const sourceDir = resolveSourceDir();
  console.log([
    'Usage: node scripts/jumpmap-sync-plates.mjs [--dry-run] [--verbose]',
    '',
    'Syncs plate PNG list from:',
    `  ${sourceDir}`,
    '',
    'Writes JSON to:',
    `  ${targetFile}`,
    '',
    'Options:',
    '  --dry-run   print result only, do not write',
    '  --verbose   print selected file names'
  ].join('\n'));
  process.exit(0);
}

const isPlateFile = (name) => {
  const lower = String(name || '').toLowerCase();
  if (!lower.endsWith('.png')) return false;
  if (lower.startsWith('.')) return false;
  if (lower.includes('backup') || lower.includes('bak') || lower.includes('copy')) return false;
  return true;
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const loadPlateNames = () => {
  const sourceDir = resolveSourceDir();
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`source directory not found: ${sourceDir}`);
  }
  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isPlateFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
};

const readCurrent = () => {
  if (!fs.existsSync(targetFile)) return [];
  try {
    const raw = fs.readFileSync(targetFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeBackup = (content) => {
  ensureDir(backupDir);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const backupPath = path.join(backupDir, `plates.${stamp}.json`);
  fs.writeFileSync(backupPath, content, 'utf8');
  return backupPath;
};

const main = () => {
  const names = loadPlateNames();
  const current = readCurrent();
  const nextJson = `${JSON.stringify(names)}\n`;
  const currentJson = `${JSON.stringify(current)}\n`;
  const changed = currentJson !== nextJson;

  console.log(`plate files found: ${names.length}`);
  if (verbose) {
    names.forEach((name) => console.log(` - ${name}`));
  }

  if (!changed) {
    console.log('plates.json is already up to date.');
    return;
  }

  if (dryRun) {
    console.log('dry-run: plates.json would be updated.');
    return;
  }

  const existing = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '[]\n';
  const backupPath = writeBackup(existing);
  fs.writeFileSync(targetFile, nextJson, 'utf8');

  console.log(`updated: ${path.relative(projectRoot, targetFile)}`);
  console.log(`backup : ${path.relative(projectRoot, backupPath)}`);
};

try {
  main();
} catch (err) {
  console.error(err?.message || String(err));
  process.exit(1);
}
