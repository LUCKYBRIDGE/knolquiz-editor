#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
const saveMapRoot = path.join(projectRoot, 'save_map');
const runtimeMapCandidates = [
  path.join(saveMapRoot, 'jumpmap-01.json'),
  path.join(publicRoot, 'shared', 'maps', 'jumpmap-01.json')
];
const plateSourceCandidates = [
  path.join(projectRoot, 'quiz_plate'),
  path.join(publicRoot, 'quiz_plate')
];

const resolvePlateSourceRoot = () =>
  plateSourceCandidates.find((dirPath) => fs.existsSync(dirPath)) || plateSourceCandidates[0];

const resolveRuntimeMapFile = () =>
  runtimeMapCandidates.find((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile()) || '';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log([
    'Usage: node scripts/jumpmap-local-serve.mjs [--port=5173] [--host=127.0.0.1]',
    '',
    'Serves local static files from:',
    `  ${publicRoot}`,
    '',
    'Example:',
    '  node scripts/jumpmap-local-serve.mjs',
    '  node scripts/jumpmap-local-serve.mjs --port=4173 --host=0.0.0.0'
  ].join('\n'));
  process.exit(0);
}

const readArg = (prefix, fallback) => {
  const found = args.find((item) => item.startsWith(`${prefix}=`));
  if (!found) return fallback;
  const value = found.slice(prefix.length + 1);
  return value || fallback;
};

const host = readArg('--host', '127.0.0.1');
const port = Number(readArg('--port', '5173'));
if (!Number.isFinite(port) || port <= 0 || port > 65535) {
  console.error(`Invalid port: ${port}`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const isPlateFile = (name) => {
  const lower = String(name || '').toLowerCase();
  if (!lower.endsWith('.png')) return false;
  if (lower.startsWith('.')) return false;
  if (lower.includes('backup') || lower.includes('bak') || lower.includes('copy')) return false;
  return true;
};

const listPlateFiles = () => {
  const plateSourceRoot = resolvePlateSourceRoot();
  if (!fs.existsSync(plateSourceRoot)) return [];
  const entries = fs.readdirSync(plateSourceRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isPlateFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
};

const safeResolve = (urlPath) => {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0].split('#')[0] || '/');
  const normalized = path.normalize(cleanPath);
  const trimmed = normalized.replace(/^(\.\.(\/|\\|$))+/, '');
  const target = path.join(publicRoot, trimmed);
  if (!target.startsWith(publicRoot)) return null;
  return target;
};

const resolveFilePath = (requestPath) => {
  const target = safeResolve(requestPath);
  if (!target) return null;

  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const indexPath = path.join(target, 'index.html');
    if (fs.existsSync(indexPath)) return indexPath;
  }

  if (requestPath === '/' || requestPath === '') {
    const rootIndex = path.join(publicRoot, 'index.html');
    if (fs.existsSync(rootIndex)) return rootIndex;
  }
  return null;
};

const server = http.createServer((req, res) => {
  try {
    const reqPath = req.url || '/';
    const pathname = decodeURIComponent(reqPath.split('?')[0].split('#')[0] || '/');
    if (pathname === '/__jumpmap/plates.json') {
      const files = listPlateFiles();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ files }));
      return;
    }
    if (pathname === '/__jumpmap/runtime-map.json') {
      const runtimeMapFile = resolveRuntimeMapFile();
      if (!runtimeMapFile) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          error: 'runtime map not found',
          candidates: ['save_map/jumpmap-01.json', 'public/shared/maps/jumpmap-01.json']
        }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(runtimeMapFile).pipe(res);
      return;
    }
    const filePath = resolveFilePath(reqPath);
    if (!filePath) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Internal server error');
  }
});

server.listen(port, host, () => {
  const editorUrl = `http://${host}:${port}/jumpmap-editor/`;
  console.log(`Jumpmap local server running: http://${host}:${port}/`);
  console.log(`Jumpmap editor URL: ${editorUrl}`);
});
