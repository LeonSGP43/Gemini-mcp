import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const serverPath = path.join(projectRoot, 'dist', 'server.js');
const codexConfigPath = path.join(process.env.HOME || '', '.codex', 'config.toml');

function loadEnvFromCodexConfig() {
  const env = { ...process.env };

  if (!fs.existsSync(codexConfigPath)) {
    return env;
  }

  const configText = fs.readFileSync(codexConfigPath, 'utf8');
  for (const key of ['GEMINI_API_KEY', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']) {
    const match = configText.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'm'));
    if (match) {
      env[key] = match[1];
    }
  }

  return env;
}

function spawnServer() {
  return spawn('node', [serverPath], {
    cwd: projectRoot,
    env: loadEnvFromCodexConfig(),
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function collectOutput(child) {
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  return { stdout: () => stdout, stderr: () => stderr };
}

async function waitForClose(child) {
  return await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function parseLineMessages(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('{'))
    .map(line => JSON.parse(line));
}

function frameMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8'),
    body
  ]);
}

function parseFramedMessages(buffer) {
  const messages = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n', cursor, 'utf8');
    assert.notEqual(headerEnd, -1, 'framed response is missing header separator');

    const header = buffer.subarray(cursor, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    assert.ok(match, 'framed response is missing Content-Length');

    const bodyLength = Number.parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + bodyLength;
    const body = buffer.subarray(bodyStart, bodyEnd);
    messages.push(JSON.parse(body.toString('utf8')));
    cursor = bodyEnd;
  }

  return messages;
}

test('line-delimited stdio drains all queued requests before exit', async () => {
  const child = spawnServer();
  const output = collectOutput(child);

  const requests = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'line-test', version: '1.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'gemini_acceptance_assist',
        arguments: {
          acceptanceCriteria: 'check file path availability',
          filePath: './missing-file.txt'
        }
      }
    }
  ];

  child.stdin.write(`${requests.map(request => JSON.stringify(request)).join('\n')}`);
  child.stdin.end();

  const exitCode = await waitForClose(child);
  assert.equal(exitCode, 0);

  const messages = parseLineMessages(output.stdout());
  assert.equal(messages.length, 3);
  assert.equal(messages[1].result.tools.length, 2);
  assert.equal(messages[2].error.code, -32602);
});

test('framed stdio handles utf-8 request bodies and replies in framed mode', async () => {
  const child = spawnServer();
  const output = collectOutput(child);

  const payload = Buffer.concat([
    frameMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: '你', version: '1.0' }
      }
    }),
    frameMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    })
  ]);

  child.stdin.end(payload);

  const exitCode = await waitForClose(child);
  assert.equal(exitCode, 0);

  const stdoutBuffer = Buffer.from(output.stdout(), 'utf8');
  const messages = parseFramedMessages(stdoutBuffer);
  assert.equal(messages.length, 2);
  assert.deepEqual(
    messages[1].result.tools.map(tool => tool.name),
    ['gemini_brainstorm_assist', 'gemini_acceptance_assist']
  );
});

test('schema validation returns invalid params for unexpected fields', async () => {
  const child = spawnServer();
  const output = collectOutput(child);

  const requests = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'schema-test', version: '1.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'gemini_acceptance_assist',
        arguments: {
          acceptanceCriteria: 'review inline content',
          content: 'hello world',
          unexpected: true
        }
      }
    }
  ];

  child.stdin.end(`${requests.map(request => JSON.stringify(request)).join('\n')}`);

  const exitCode = await waitForClose(child);
  assert.equal(exitCode, 0);

  const messages = parseLineMessages(output.stdout());
  assert.equal(messages[1].error.code, -32602);
  assert.match(messages[1].error.message, /not allowed/);
});
