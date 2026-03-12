import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  hasPathTraversal,
  validatePath,
  SecurityError
} from '../dist/utils/security.js';
import { sanitizeUrlForLog, handleAPIError } from '../dist/utils/error-handler.js';

async function withTempDir(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-mcp-security-'));
  try {
    await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('absolute paths are not treated as path traversal', () => {
  assert.equal(hasPathTraversal('/tmp/example.txt'), false);
});

test('validatePath rejects symlinked parent directories when symlinks are disabled', async () => {
  await withTempDir(async (tempDir) => {
    const realDir = path.join(tempDir, 'real');
    const safeDir = path.join(tempDir, 'safe');
    const linkedDir = path.join(safeDir, 'link');
    const targetFile = path.join(realDir, 'file.txt');

    await fs.mkdir(realDir, { recursive: true });
    await fs.mkdir(safeDir, { recursive: true });
    await fs.writeFile(targetFile, 'ok');
    await fs.symlink(realDir, linkedDir, 'dir');

    await assert.rejects(
      validatePath(path.join(linkedDir, 'file.txt')),
      (error) => {
        assert.ok(error instanceof SecurityError);
        assert.equal(error.code, 'SYMLINK_DETECTED');
        return true;
      }
    );
  });
});

test('sanitizeUrlForLog redacts proxy credentials', () => {
  assert.equal(
    sanitizeUrlForLog('http://user:secret@proxy.example.com:8080/path?x=1'),
    'http://***@proxy.example.com:8080'
  );
});

test('handleAPIError maps local file errors to invalid params', () => {
  const error = handleAPIError(new Error('File not found: "./missing.txt"'));
  assert.equal(error.code, -32602);
  assert.equal(error.message, 'File not found: "./missing.txt"');
});
