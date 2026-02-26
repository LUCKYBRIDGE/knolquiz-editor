#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_INDEX = path.join(projectRoot, 'public', 'jumpmap-editor', 'index.html');
const DEFAULT_OUTPUT = path.join(projectRoot, 'docs', 'contracts', 'legacy-play-path-audit.json');

const printHelp = () => {
  console.log([
    'jumpmap-audit-legacy-play-paths',
    '',
    'Usage:',
    '  node scripts/jumpmap-audit-legacy-play-paths.mjs [options]',
    '',
    'Options:',
    '  --index <file>     Editor HTML entry (default: public/jumpmap-editor/index.html)',
    '  --output <file>    Snapshot json (default: docs/contracts/legacy-play-path-audit.json)',
    '  --write            Write snapshot json',
    '  --check            Compare generated snapshot with existing snapshot (exit 1 on diff)',
    '  --help             Show this help'
  ].join('\n'));
};

const resolveMaybeRelative = (value, fallback = '') => {
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
};

const parseArgs = (argv) => {
  const opts = {
    indexFile: DEFAULT_INDEX,
    outputFile: DEFAULT_OUTPUT,
    write: false,
    check: false,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--write') {
      opts.write = true;
      continue;
    }
    if (arg === '--check') {
      opts.check = true;
      continue;
    }
    if (arg === '--index') {
      opts.indexFile = resolveMaybeRelative(argv[i + 1], DEFAULT_INDEX);
      i += 1;
      continue;
    }
    if (arg === '--output') {
      opts.outputFile = resolveMaybeRelative(argv[i + 1], DEFAULT_OUTPUT);
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
};

const rel = (p) => path.relative(projectRoot, p).replace(/\\/g, '/');

const extractScriptSources = (html, indexFile) => {
  const matches = [];
  const dir = path.dirname(indexFile);
  const regex = /<script\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*><\/script>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const raw = String(m[1] || '').trim();
    if (!raw || /^https?:\/\//i.test(raw)) continue;
    if (!/\.js(\?|#|$)/i.test(raw)) continue;
    const clean = raw.split('?')[0].split('#')[0];
    matches.push({
      src: raw,
      file: path.resolve(dir, clean)
    });
  }
  return matches;
};

const toFinding = ({ file, line, kind, text }) => ({
  file: rel(file),
  line,
  kind,
  text: String(text || '').trim().slice(0, 300)
});

const scanScriptFile = (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((lineText, index) => {
    const line = index + 1;
    const hasWindowLocationHref = /\bwindow\.location\.href\b/.test(lineText);
    const hasRelativeNewUrlWithWindowLocation =
      /new\s+URL\s*\(\s*(?:`(?:\.\.?\/)[^`]*`|'(?:\.\.?\/)[^']*'|"(?:\.\.?\/)[^"]*")\s*,\s*window\.location\.href\s*\)/.test(lineText);

    if (hasWindowLocationHref) {
      findings.push(toFinding({
        file,
        line,
        kind: 'window-location-href',
        text: lineText
      }));
    }
    if (hasRelativeNewUrlWithWindowLocation) {
      findings.push(toFinding({
        file,
        line,
        kind: 'relative-new-url-window-location',
        text: lineText
      }));
    }
  });

  return findings;
};

const buildAuditSnapshot = (indexFile) => {
  if (!fs.existsSync(indexFile)) throw new Error(`index file not found: ${indexFile}`);
  const html = fs.readFileSync(indexFile, 'utf8');
  const scripts = extractScriptSources(html, indexFile);
  const existingScripts = scripts.filter((entry) => fs.existsSync(entry.file));
  const missingScripts = scripts
    .filter((entry) => !fs.existsSync(entry.file))
    .map((entry) => ({ src: entry.src, file: rel(entry.file) }));

  const findings = existingScripts
    .flatMap((entry) => scanScriptFile(entry.file))
    .sort((a, b) => (
      a.file.localeCompare(b.file)
      || a.line - b.line
      || a.kind.localeCompare(b.kind)
      || a.text.localeCompare(b.text)
    ));

  const countsByKind = findings.reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {});

  return {
    schema: 'jumpmap-legacy-play-path-audit',
    version: 1,
    indexFile: rel(indexFile),
    scripts: scripts.map((entry) => ({
      src: entry.src,
      file: rel(entry.file),
      exists: fs.existsSync(entry.file)
    })),
    summary: {
      scriptCount: scripts.length,
      existingScriptCount: existingScripts.length,
      missingScriptCount: missingScripts.length,
      findingCount: findings.length,
      countsByKind
    },
    missingScripts,
    findings
  };
};

const stableStringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const snapshot = buildAuditSnapshot(opts.indexFile);
  const outputText = stableStringify(snapshot);

  if (opts.check) {
    if (!fs.existsSync(opts.outputFile)) {
      console.log('[jumpmap-audit-legacy-play-paths] check failed');
      console.log(`  snapshot file missing: ${rel(opts.outputFile)}`);
      process.exit(1);
    }
    const currentText = fs.readFileSync(opts.outputFile, 'utf8');
    if (currentText !== outputText) {
      console.log('[jumpmap-audit-legacy-play-paths] check failed');
      console.log(`  output : ${rel(opts.outputFile)}`);
      console.log(`  reason : generated snapshot differs (rerun with --write)`);
      console.log(`  summary: scripts=${snapshot.summary.scriptCount}, findings=${snapshot.summary.findingCount}, kinds=${JSON.stringify(snapshot.summary.countsByKind)}`);
      process.exit(1);
    }
    console.log('[jumpmap-audit-legacy-play-paths] check ok');
    console.log(`  output : ${rel(opts.outputFile)}`);
    console.log(`  summary: scripts=${snapshot.summary.scriptCount}, findings=${snapshot.summary.findingCount}, kinds=${JSON.stringify(snapshot.summary.countsByKind)}`);
    return;
  }

  if (opts.write) {
    fs.mkdirSync(path.dirname(opts.outputFile), { recursive: true });
    fs.writeFileSync(opts.outputFile, outputText, 'utf8');
    console.log('[jumpmap-audit-legacy-play-paths] snapshot written');
    console.log(`  output : ${rel(opts.outputFile)}`);
  } else {
    console.log('[jumpmap-audit-legacy-play-paths] snapshot generated (not written)');
    console.log(`  output : ${rel(opts.outputFile)}`);
  }
  console.log(`  summary: scripts=${snapshot.summary.scriptCount}, findings=${snapshot.summary.findingCount}, kinds=${JSON.stringify(snapshot.summary.countsByKind)}`);
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-audit-legacy-play-paths] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
