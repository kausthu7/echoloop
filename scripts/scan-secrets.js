#!/usr/bin/env node

/**
 * EchoLoop Secret Leak Scanner & Security Guard
 * 
 * Scans the repository for accidentally exposed API keys, credentials,
 * and tracked secret files before they can ever be committed to Git or bundled.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();

// Patterns to detect high-risk secrets
const SECRET_PATTERNS = [
  {
    name: 'Google / Gemini API Key',
    regex: /(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{35,})/,
  },
  {
    name: 'Supabase Service Role Key (JWT)',
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]*service_role[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+/,
  },
  {
    name: 'OpenAI / Anthropic API Key',
    regex: /(?:sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9-_]{20,})/,
  },
  {
    name: 'Private Key Block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'Generic AWS / Cloud Secret Key',
    regex: /(?:AKIA[0-9A-Z]{16}|aws_secret_access_key\s*=\s*['"][A-Za-z0-9/+=]{40}['"])/,
  },
];

// Directories & files to skip during scanning
const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
  'bun.lock',
  'scripts/scan-secrets.js', // Allow this file itself
];

function isIgnored(filePath) {
  const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  return IGNORED_PATHS.some((ignored) => 
    relative === ignored || relative.startsWith(ignored + '/')
  );
}

function scanFile(filePath) {
  if (isIgnored(filePath)) return [];

  const violations = [];
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return []; // Skip binary / huge files

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      // Allow documentation examples like "your-gemini-api-key-here" or placeholders
      if (line.includes('your-') || line.includes('placeholder') || line.includes('example')) {
        return;
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: idx + 1,
            pattern: pattern.name,
            snippet: line.trim().substring(0, 80) + '...',
          });
        }
      }
    });
  } catch {
    // Ignore unreadable or binary files
  }

  return violations;
}

function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath)) continue;

    if (entry.isDirectory()) {
      files = files.concat(walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkGitStagedFiles() {
  try {
    const stdout = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const stagedFiles = stdout.trim().split(/\r?\n/).filter(Boolean);

    // Check if any sensitive file like .env is staged
    for (const file of stagedFiles) {
      if (file === '.env' || file.startsWith('.env.')) {
        if (file !== '.env.example') {
          return {
            error: `CRITICAL: Sensitive environment file "${file}" is staged for Git commit! Unstage immediately using: git reset HEAD ${file}`,
          };
        }
      }
    }
  } catch {
    // Git not available or not a git repo
  }
  return null;
}

function run() {
  console.log('\n🔒 [EchoLoop Security Guard] Scanning workspace for secret leaks...\n');

  // 1. Check staged Git files
  const gitStagedError = checkGitStagedFiles();
  if (gitStagedError) {
    console.error(`❌ ${gitStagedError.error}\n`);
    process.exit(1);
  }

  // 2. Scan tracked and working tree files
  const allFiles = walkDir(ROOT_DIR);
  const allViolations = [];

  for (const file of allFiles) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
  }

  if (allViolations.length > 0) {
    console.error(`❌ SECURITY ALERT: Found ${allViolations.length} potential secret leak(s):\n`);
    allViolations.forEach((v) => {
      console.error(`  - [${v.pattern}] in ${v.file}:${v.line}`);
      console.error(`    Preview: ${v.snippet}\n`);
    });
    console.error('Action Required: Remove secrets from tracked code and place them exclusively in .env (which is gitignored).\n');
    process.exit(1);
  }

  console.log('✅ [EchoLoop Security Guard] All checks passed! No secrets found in code or git-tracked files.\n');
}

run();
