import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'AGENTS.md',
  'PROJECT_CONTEXT.md',
  'CLAUDE.md',
  'CURRENT_TASK.md',
  'docs/TECHNICAL_SPEC.md',
  'docs/USER_GUIDE.md',
  'docs/REACT_BEST_PRACTICES.md',
  '.claude/session-notes.md',
  '.claude/bugs.md',
];

const currentTaskSections = [
  '## 1. Task Summary',
  '## 2. Scope',
  '## 3. Impact Check',
  '## 4. Files In Scope',
  '## 5. Implementation Plan',
  '## 6. Risks And Guardrails',
  '## 7. Verification Plan',
  '## 8. Execution Notes',
  '## 9. Completion Record',
];

function fail(message) {
  console.error(`docs:check failed: ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  const absolutePath = path.join(root, file);

  if (!existsSync(absolutePath)) {
    fail(`required file is missing: ${file}`);
  }
}

const currentTaskPath = path.join(root, 'CURRENT_TASK.md');
const currentTaskContents = readFileSync(currentTaskPath, 'utf8');

for (const section of currentTaskSections) {
  if (!currentTaskContents.includes(section)) {
    fail(`CURRENT_TASK.md is missing section: ${section}`);
  }
}

if (!currentTaskContents.includes('attendance 흐름 영향:')) {
  fail('CURRENT_TASK.md must explicitly track attendance impact');
}

if (!currentTaskContents.includes('report 흐름 영향:')) {
  fail('CURRENT_TASK.md must explicitly track report impact');
}

if (!currentTaskContents.includes('accounting 흐름 영향:')) {
  fail('CURRENT_TASK.md must explicitly track accounting impact');
}

if (!currentTaskContents.includes('권한/RLS/auth 영향:')) {
  fail('CURRENT_TASK.md must explicitly track auth and RLS impact');
}

// Mojibake guard.
// A CP949-misread UTF-8 save corrupts Korean UI text into CJK ideographs and
// '?' bytes glued to Hangul syllables. Neither pattern appears in this app's
// real Korean text, so either one means a source file was saved in the wrong encoding.
const mojibakeRoots = ['src', 'public'];
const mojibakeExtensions = ['.ts', '.tsx', '.js', '.mjs'];
const skippedDirectories = new Set(['node_modules', '.next', '.git']);
const cjkIdeograph = /[\u4e00-\u9fff]/;
const brokenHangul = /\?[\uac00-\ud7a3]/;

function collectSourceFiles(directory) {
  const collected = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collected.push(...collectSourceFiles(entryPath));
    } else if (mojibakeExtensions.some((extension) => entry.name.endsWith(extension))) {
      collected.push(entryPath);
    }
  }

  return collected;
}

const mojibakeHits = [];

for (const mojibakeRoot of mojibakeRoots) {
  const absoluteRoot = path.join(root, mojibakeRoot);
  if (!existsSync(absoluteRoot)) continue;

  for (const filePath of collectSourceFiles(absoluteRoot)) {
    const lines = readFileSync(filePath, 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (cjkIdeograph.test(line) || brokenHangul.test(line)) {
        mojibakeHits.push(`${path.relative(root, filePath)}:${index + 1}`);
      }
    });
  }
}

if (mojibakeHits.length > 0) {
  fail(`broken encoding detected in ${mojibakeHits.length} line(s): ${mojibakeHits.slice(0, 10).join(', ')}`);
}

console.log('docs:check passed');
