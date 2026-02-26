#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_INDEX = path.join(projectRoot, 'public', 'jumpmap-editor', 'index.html');
const DEFAULT_OUTPUT = path.join(projectRoot, 'docs', 'contracts', 'legacy-compat-asset-audit.json');

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const CSS_EXTENSIONS = new Set(['.css']);
const SKIP_PROTOCOL_RE = /^(?:https?:|data:|blob:|javascript:|mailto:|tel:)/i;
const STRING_LITERAL_RE = /(["'`])((?:\\.|(?!\1).)*)\1/g;
const DYNAMIC_COMPAT_DEPENDENCY_DIRS = [
  {
    key: 'quiz-data',
    relDir: 'public/quiz/data',
    note: 'quiz question/settings JSON files loaded dynamically by test-runtime'
  },
  {
    key: 'quiz-nets',
    relDir: 'public/quiz/nets',
    note: 'quiz net SVG assets loaded dynamically by test-runtime'
  }
];

const printHelp = () => {
  console.log([
    'jumpmap-audit-legacy-compat-assets',
    '',
    'Usage:',
    '  node scripts/jumpmap-audit-legacy-compat-assets.mjs [options]',
    '',
    'Options:',
    '  --index <file>     Editor HTML entry (default: public/jumpmap-editor/index.html)',
    '  --output <file>    Snapshot json (default: docs/contracts/legacy-compat-asset-audit.json)',
    '  --write            Write snapshot json',
    '  --check            Compare generated snapshot with existing snapshot (exit 1 on diff)',
    '  --help             Show this help',
    '',
    'Notes:',
    '  - Static inventory only (HTML refs + JS/CSS literal refs).',
    '  - Dynamic path concatenation is recorded as prefix hints when possible.'
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

const stableStringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

const shouldSkipDynamicInventoryEntry = (entryName) => {
  const name = String(entryName || '');
  if (!name) return true;
  if (name === '.DS_Store') return true;
  if (name.startsWith('_backup-')) return true;
  return false;
};

const cleanRefValue = (raw) => String(raw || '').trim();

const stripQueryHash = (value) => value.split('#')[0].split('?')[0];
const hasTemplateInterpolation = (value) => /\$\{/.test(String(value || ''));

const isSkippableRef = (raw) => {
  if (!raw) return true;
  if (raw.startsWith('#')) return true;
  if (raw.startsWith('//')) return true;
  if (SKIP_PROTOCOL_RE.test(raw)) return true;
  return false;
};

const normalizeRefForSnapshot = (raw) => cleanRefValue(raw).replace(/\s+/g, ' ');

const resolveLocalRef = (raw, fromFile) => {
  const normalized = cleanRefValue(raw);
  if (!normalized) return { raw: normalized, skipped: 'empty' };
  if (hasTemplateInterpolation(normalized)) return { raw: normalized, skipped: 'dynamic-template' };
  if (isSkippableRef(normalized)) return { raw: normalized, skipped: 'external-or-fragment' };
  const clean = stripQueryHash(normalized);
  if (!clean) return { raw: normalized, skipped: 'query-or-fragment-only' };

  let file = '';
  if (clean.startsWith('/')) {
    file = path.join(projectRoot, 'public', clean.replace(/^\/+/, ''));
  } else {
    file = path.resolve(path.dirname(fromFile), clean);
  }

  const insideProject = file === projectRoot || file.startsWith(`${projectRoot}${path.sep}`);
  return {
    raw: normalized,
    clean,
    file,
    relFile: insideProject ? rel(file) : file,
    insideProject,
    exists: insideProject ? fs.existsSync(file) : fs.existsSync(file)
  };
};

const getFileExt = (filePath) => path.extname(filePath || '').toLowerCase();

const getTopLevelBucket = (filePath) => {
  const r = rel(filePath);
  const parts = r.split('/');
  if (parts.length < 2) return r;
  if (parts[0] === 'public' && parts.length >= 3) return `public/${parts[1]}`;
  if (parts[0] === 'docs' && parts.length >= 3) return `docs/${parts[1]}`;
  return `${parts[0]}/${parts[1]}`;
};

const extractHtmlRefs = (htmlText, indexFile) => {
  const rows = htmlText.split(/\r?\n/);
  const refs = [];
  const attrRegex = /<(script|link|img|source|audio|video)\b[^>]*\b(src|href)\s*=\s*(['"])(.*?)\3/gi;

  rows.forEach((lineText, idx) => {
    let match;
    while ((match = attrRegex.exec(lineText))) {
      const tag = String(match[1] || '').toLowerCase();
      const attr = String(match[2] || '').toLowerCase();
      const raw = normalizeRefForSnapshot(match[4]);
      const resolved = resolveLocalRef(raw, indexFile);
      refs.push({
        fromFile: rel(indexFile),
        line: idx + 1,
        tag,
        attr,
        raw,
        ...(
          resolved.file
            ? {
                targetFile: resolved.relFile,
                exists: !!resolved.exists,
                insideProject: !!resolved.insideProject
              }
            : { skipped: resolved.skipped || 'unresolved' }
        )
      });
    }
  });

  return refs;
};

const scanJsFile = (filePath) => {
  const rows = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const refs = [];
  const prefixHints = [];

  const pushResolvedRef = (line, kind, raw) => {
    const normalizedRaw = normalizeRefForSnapshot(raw);
    const resolved = resolveLocalRef(normalizedRaw, filePath);
    refs.push({
      fromFile: rel(filePath),
      line,
      kind,
      raw: normalizedRaw,
      ...(
        resolved.file
          ? {
              targetFile: resolved.relFile,
              exists: !!resolved.exists,
              insideProject: !!resolved.insideProject
            }
          : { skipped: resolved.skipped || 'unresolved' }
      )
    });
  };

  rows.forEach((lineText, idx) => {
    const line = idx + 1;

    const importFromRegex = /\bimport\s+(?:[^'"]*?\s+from\s+)?(['"])([^'"]+)\1/g;
    let match;
    while ((match = importFromRegex.exec(lineText))) {
      pushResolvedRef(line, 'js-import', match[2]);
    }

    const dynamicImportRegex = /\bimport\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
    while ((match = dynamicImportRegex.exec(lineText))) {
      pushResolvedRef(line, 'js-dynamic-import', match[2]);
    }

    const fetchRegex = /\bfetch\s*\(\s*(['"`])([^'"`]+)\1(?:\s*[),])/g;
    while ((match = fetchRegex.exec(lineText))) {
      pushResolvedRef(line, 'js-fetch', match[2]);
    }

    const newUrlRegex = /\bnew\s+URL\s*\(\s*(['"`])([^'"`]+)\1\s*,/g;
    while ((match = newUrlRegex.exec(lineText))) {
      pushResolvedRef(line, 'js-new-url', match[2]);
    }

    const literalMatches = Array.from(lineText.matchAll(STRING_LITERAL_RE));
    literalMatches.forEach((m) => {
      const rawLiteral = String(m[2] || '');
      if (!rawLiteral.startsWith('./') && !rawLiteral.startsWith('../')) return;
      if (/[${}]/.test(rawLiteral)) return;
      if (rawLiteral.endsWith('/')) {
        prefixHints.push({
          fromFile: rel(filePath),
          line,
          kind: 'js-path-prefix',
          raw: normalizeRefForSnapshot(rawLiteral)
        });
        return;
      }

      const ext = getFileExt(stripQueryHash(rawLiteral));
      if (!ext) return;
      if (!/[a-z0-9]/i.test(ext)) return;

      pushResolvedRef(line, 'js-string-literal', rawLiteral);
    });
  });

  return { refs, prefixHints };
};

const scanCssFile = (filePath) => {
  const rows = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const refs = [];

  const pushResolvedRef = (line, kind, raw) => {
    const normalizedRaw = normalizeRefForSnapshot(raw);
    const resolved = resolveLocalRef(normalizedRaw, filePath);
    refs.push({
      fromFile: rel(filePath),
      line,
      kind,
      raw: normalizedRaw,
      ...(
        resolved.file
          ? {
              targetFile: resolved.relFile,
              exists: !!resolved.exists,
              insideProject: !!resolved.insideProject
            }
          : { skipped: resolved.skipped || 'unresolved' }
      )
    });
  };

  rows.forEach((lineText, idx) => {
    const line = idx + 1;
    let match;

    const urlRegex = /\burl\s*\(\s*(['"]?)([^'")]+)\1\s*\)/g;
    while ((match = urlRegex.exec(lineText))) {
      pushResolvedRef(line, 'css-url', match[2]);
    }

    const importRegex = /@import\s+(?:url\()?\s*(['"])([^'"]+)\1/g;
    while ((match = importRegex.exec(lineText))) {
      pushResolvedRef(line, 'css-import', match[2]);
    }
  });

  return { refs };
};

const sortByKeys = (items, keyOrder) => (
  items.sort((a, b) => {
    for (const key of keyOrder) {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) return av - bv;
        continue;
      }
      const sa = String(av ?? '');
      const sb = String(bv ?? '');
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp;
    }
    return 0;
  })
);

const listDynamicContractFiles = (rootDir) => {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const walk = (cur) => {
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    entries.forEach((entry) => {
      if (shouldSkipDynamicInventoryEntry(entry.name)) return;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        return;
      }
      if (entry.isFile()) out.push(full);
    });
  };
  walk(rootDir);
  out.sort((a, b) => a.localeCompare(b));
  return out;
};

const buildDynamicDependencyContracts = () => {
  const contracts = DYNAMIC_COMPAT_DEPENDENCY_DIRS.map((spec) => {
    const absDir = path.join(projectRoot, spec.relDir);
    const files = listDynamicContractFiles(absDir);
    const relFiles = files.map((file) => rel(file));
    const totalBytes = files.reduce((sum, file) => {
      try {
        return sum + (fs.statSync(file).size || 0);
      } catch (_error) {
        return sum;
      }
    }, 0);
    return {
      key: spec.key,
      dir: spec.relDir,
      note: spec.note,
      exists: fs.existsSync(absDir),
      fileCount: relFiles.length,
      totalBytes,
      files: relFiles
    };
  });
  sortByKeys(contracts, ['key', 'dir']);
  return contracts;
};

const buildAuditSnapshot = (indexFile) => {
  if (!fs.existsSync(indexFile)) throw new Error(`index file not found: ${indexFile}`);
  const htmlText = fs.readFileSync(indexFile, 'utf8');
  const htmlRefs = extractHtmlRefs(htmlText, indexFile);

  const jsRefs = [];
  const cssRefs = [];
  const pathPrefixHints = [];
  const scannedFiles = [];
  const queue = [];
  const visited = new Set();

  const enqueueFile = (filePath, scanKind, discoveredFrom) => {
    if (!filePath || !fs.existsSync(filePath)) return;
    const key = `${scanKind}:${filePath}`;
    if (visited.has(key)) return;
    visited.add(key);
    queue.push({ filePath, scanKind, discoveredFrom });
  };

  htmlRefs.forEach((entry) => {
    if (!entry.targetFile || !entry.exists) return;
    const absTarget = path.join(projectRoot, entry.targetFile);
    const ext = getFileExt(absTarget);
    if (JS_EXTENSIONS.has(ext)) enqueueFile(absTarget, 'js', `${entry.fromFile}:${entry.line}`);
    if (CSS_EXTENSIONS.has(ext)) enqueueFile(absTarget, 'css', `${entry.fromFile}:${entry.line}`);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { filePath, scanKind, discoveredFrom } = current;
    scannedFiles.push({
      file: rel(filePath),
      kind: scanKind,
      discoveredFrom
    });

    if (scanKind === 'js') {
      const result = scanJsFile(filePath);
      jsRefs.push(...result.refs);
      pathPrefixHints.push(...result.prefixHints);
      result.refs.forEach((entry) => {
        if (!entry.targetFile || !entry.exists) return;
        const absTarget = path.join(projectRoot, entry.targetFile);
        const ext = getFileExt(absTarget);
        if (JS_EXTENSIONS.has(ext)) enqueueFile(absTarget, 'js', `${entry.fromFile}:${entry.line}`);
        if (CSS_EXTENSIONS.has(ext)) enqueueFile(absTarget, 'css', `${entry.fromFile}:${entry.line}`);
      });
      continue;
    }

    if (scanKind === 'css') {
      const result = scanCssFile(filePath);
      cssRefs.push(...result.refs);
      result.refs.forEach((entry) => {
        if (!entry.targetFile || !entry.exists) return;
        const absTarget = path.join(projectRoot, entry.targetFile);
        const ext = getFileExt(absTarget);
        if (CSS_EXTENSIONS.has(ext)) enqueueFile(absTarget, 'css', `${entry.fromFile}:${entry.line}`);
      });
    }
  }

  sortByKeys(htmlRefs, ['fromFile', 'line', 'tag', 'attr', 'raw', 'targetFile']);
  sortByKeys(jsRefs, ['fromFile', 'line', 'kind', 'raw', 'targetFile']);
  sortByKeys(cssRefs, ['fromFile', 'line', 'kind', 'raw', 'targetFile']);
  sortByKeys(pathPrefixHints, ['fromFile', 'line', 'kind', 'raw']);
  sortByKeys(scannedFiles, ['kind', 'file', 'discoveredFrom']);

  const allResolvedTargets = [...htmlRefs, ...jsRefs, ...cssRefs]
    .filter((entry) => entry.targetFile)
    .map((entry) => entry.targetFile);

  const uniqueTargetFiles = Array.from(new Set(allResolvedTargets)).sort((a, b) => a.localeCompare(b));
  const existingTargetFiles = uniqueTargetFiles.filter((file) => fs.existsSync(path.join(projectRoot, file)));
  const missingTargetFiles = uniqueTargetFiles.filter((file) => !fs.existsSync(path.join(projectRoot, file)));

  const countsByExtension = {};
  const countsByTopLevel = {};
  uniqueTargetFiles.forEach((relPath) => {
    const abs = path.join(projectRoot, relPath);
    const ext = getFileExt(abs) || '(no-ext)';
    countsByExtension[ext] = (countsByExtension[ext] || 0) + 1;
    const bucket = getTopLevelBucket(abs);
    countsByTopLevel[bucket] = (countsByTopLevel[bucket] || 0) + 1;
  });

  const skippedRefs = [...htmlRefs, ...jsRefs, ...cssRefs]
    .filter((entry) => entry.skipped)
    .map((entry) => ({
      fromFile: entry.fromFile,
      line: entry.line,
      kind: entry.kind || `${entry.tag}-${entry.attr}`,
      raw: entry.raw,
      skipped: entry.skipped
    }));
  sortByKeys(skippedRefs, ['fromFile', 'line', 'kind', 'raw']);

  const dynamicDependencyContracts = buildDynamicDependencyContracts();
  const dynamicDependencyFileCount = dynamicDependencyContracts.reduce(
    (sum, item) => sum + (Number(item.fileCount) || 0),
    0
  );
  const dynamicDependencyMissingDirCount = dynamicDependencyContracts.reduce(
    (sum, item) => sum + (item.exists ? 0 : 1),
    0
  );

  return {
    schema: 'jumpmap-legacy-compat-asset-audit',
    version: 2,
    indexFile: rel(indexFile),
    summary: {
      htmlRefCount: htmlRefs.length,
      jsRefCount: jsRefs.length,
      cssRefCount: cssRefs.length,
      pathPrefixHintCount: pathPrefixHints.length,
      scannedFileCount: scannedFiles.length,
      uniqueTargetFileCount: uniqueTargetFiles.length,
      existingTargetFileCount: existingTargetFiles.length,
      missingTargetFileCount: missingTargetFiles.length,
      dynamicDependencyContractCount: dynamicDependencyContracts.length,
      dynamicDependencyFileCount,
      dynamicDependencyMissingDirCount,
      countsByExtension,
      countsByTopLevel
    },
    scannedFiles,
    htmlRefs,
    jsRefs,
    cssRefs,
    pathPrefixHints,
    uniqueTargetFiles,
    missingTargetFiles,
    skippedRefs,
    dynamicDependencyContracts
  };
};

const logSummary = (label, snapshot, outputFile) => {
  const s = snapshot.summary;
  console.log(label);
  console.log(`  output : ${rel(outputFile)}`);
  console.log(
    `  summary: html=${s.htmlRefCount}, js=${s.jsRefCount}, css=${s.cssRefCount}, ` +
    `prefixHints=${s.pathPrefixHintCount}, uniqueTargets=${s.uniqueTargetFileCount}, missing=${s.missingTargetFileCount}`
  );
  console.log(
    `  dynamic: contracts=${s.dynamicDependencyContractCount || 0}, ` +
    `files=${s.dynamicDependencyFileCount || 0}, missingDirs=${s.dynamicDependencyMissingDirCount || 0}`
  );
  console.log(`  buckets: ${JSON.stringify(s.countsByTopLevel)}`);
};

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
      console.log('[jumpmap-audit-legacy-compat-assets] check failed');
      console.log(`  snapshot file missing: ${rel(opts.outputFile)}`);
      process.exit(1);
    }
    const currentText = fs.readFileSync(opts.outputFile, 'utf8');
    if (currentText !== outputText) {
      console.log('[jumpmap-audit-legacy-compat-assets] check failed');
      console.log(`  output : ${rel(opts.outputFile)}`);
      console.log('  reason : generated snapshot differs (rerun with --write)');
      console.log(
        `  summary: html=${snapshot.summary.htmlRefCount}, js=${snapshot.summary.jsRefCount}, css=${snapshot.summary.cssRefCount}, ` +
        `prefixHints=${snapshot.summary.pathPrefixHintCount}, uniqueTargets=${snapshot.summary.uniqueTargetFileCount}, missing=${snapshot.summary.missingTargetFileCount}`
      );
      console.log(
        `  dynamic: contracts=${snapshot.summary.dynamicDependencyContractCount || 0}, ` +
        `files=${snapshot.summary.dynamicDependencyFileCount || 0}, missingDirs=${snapshot.summary.dynamicDependencyMissingDirCount || 0}`
      );
      process.exit(1);
    }
    logSummary('[jumpmap-audit-legacy-compat-assets] check ok', snapshot, opts.outputFile);
    return;
  }

  if (opts.write) {
    fs.mkdirSync(path.dirname(opts.outputFile), { recursive: true });
    fs.writeFileSync(opts.outputFile, outputText, 'utf8');
    logSummary('[jumpmap-audit-legacy-compat-assets] snapshot written', snapshot, opts.outputFile);
    return;
  }

  logSummary('[jumpmap-audit-legacy-compat-assets] snapshot generated (not written)', snapshot, opts.outputFile);
};

try {
  main();
} catch (error) {
  console.error('[jumpmap-audit-legacy-compat-assets] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
