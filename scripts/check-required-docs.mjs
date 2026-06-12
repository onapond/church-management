import { existsSync, readFileSync } from 'node:fs';
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

console.log('docs:check passed');
