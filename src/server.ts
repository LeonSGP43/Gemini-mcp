#!/usr/bin/env node
/**
 * mcp-server-gemini-lkbaba
 * Main server file
 *
 * Specialized MCP server for Codex-oriented Gemini brainstorming and acceptance assistance
 * Based on: aliargun/mcp-server-gemini v4.2.2
 * Author: LKbaba
 */

import { MCPRequest, MCPResponse, InitializeResult } from './types.js';
import { SERVER_INFO, MCP_VERSION, ERROR_CODES, TOOL_NAMES } from './config/constants.js';
import { handleAPIError, handleValidationError, handleInternalError, logError } from './utils/error-handler.js';
import { TOOL_DEFINITIONS } from './tools/definitions.js';
import {
  handleBrainstormAssist,
  handleAcceptanceAssist
} from './tools/index.js';

// Setup proxy for Node.js fetch (required for users behind proxy/VPN)
async function setupProxy(): Promise<void> {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy;

  if (proxyUrl) {
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import('undici');
      const dispatcher = new ProxyAgent(proxyUrl);
      setGlobalDispatcher(dispatcher);
      console.error(`🌐 Proxy configured: ${proxyUrl}`);
    } catch (error) {
      console.error('⚠️  Failed to configure proxy. If you need proxy support, run: npm install undici');
    }
  }
}

// Initialize proxy before anything else
await setupProxy();

// Increase stdin buffer size (for large images)
if (process.stdin.setEncoding) {
  process.stdin.setEncoding('utf8');
}

// Global state
let isInitialized = false;
let isShuttingDown = false;

type RequestId = string | number | null | undefined;

/**
 * Send response to stdout
 */
function sendResponse(response: MCPResponse): void {
  console.log(JSON.stringify(response));
}

/**
 * Send error response
 */
function sendError(id: RequestId, code: number, message: string, data?: any): void {
  if (id === undefined) {
    return;
  }

  sendResponse({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, data }
  });
}

/**
 * Handle initialize request
 */
function handleInitialize(request: MCPRequest): void {
  const result: InitializeResult = {
    protocolVersion: MCP_VERSION,
    serverInfo: {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version
    },
    capabilities: {
      tools: {
        listChanged: false
      }
    }
  };

  sendResponse({
    jsonrpc: '2.0',
    id: request.id ?? null,
    result
  });

  isInitialized = true;
  isShuttingDown = false;
}

/**
 * Handle tools/list request
 */
function handleToolsList(request: MCPRequest): void {
  if (request.id === undefined) {
    return;
  }

  sendResponse({
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: TOOL_DEFINITIONS
    }
  });
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(request: MCPRequest): Promise<void> {
  if (request.id === undefined) {
    return;
  }

  if (!isInitialized) {
    sendError(request.id, ERROR_CODES.INTERNAL_ERROR, 'Server not initialized');
    return;
  }

  const { name, arguments: args } = request.params;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendError(
        request.id,
        ERROR_CODES.API_ERROR,
        'GEMINI_API_KEY environment variable is not set'
      );
      return;
    }

    let result: any;

    // Route to corresponding tool handler
    switch (name) {
      case TOOL_NAMES.BRAINSTORM_ASSIST:
        result = await handleBrainstormAssist(args, apiKey);
        break;

      case TOOL_NAMES.ACCEPTANCE_ASSIST:
        result = await handleAcceptanceAssist(args, apiKey);
        break;

      default:
        sendError(
          request.id,
          ERROR_CODES.METHOD_NOT_FOUND,
          `Unknown tool: ${name}`
        );
        return;
    }

    // Send success response
    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      }
    });
  } catch (error: any) {
    logError(`Tool: ${name}`, error);

    // Return appropriate error based on error type
    if (error.message?.includes('not yet implemented')) {
      sendError(request.id, ERROR_CODES.INTERNAL_ERROR, error.message);
    } else if (error.message?.includes('required') || error.message?.includes('must be')) {
      const validationError = handleValidationError(error.message);
      sendError(request.id, validationError.code, validationError.message, validationError.data);
    } else {
      const apiError = handleAPIError(error);
      sendError(request.id, apiError.code, apiError.message, apiError.data);
    }
  }
}

/**
 * Handle shutdown request
 */
function handleShutdown(request: MCPRequest): void {
  isShuttingDown = true;
  isInitialized = false;

  if (request.id === undefined) {
    return;
  }

  sendResponse({
    jsonrpc: '2.0',
    id: request.id,
    result: {}
  });
}

/**
 * Handle exit notification
 */
function handleExit(): void {
  process.exit(0);
}

/**
 * Try to parse Content-Length framed message from buffer
 */
function parseContentLengthMessage(buffer: string): { body: string; rest: string } | null {
  let headerEnd = buffer.indexOf('\r\n\r\n');
  let separatorLength = 4;

  const lfHeaderEnd = buffer.indexOf('\n\n');
  if (lfHeaderEnd !== -1 && (headerEnd === -1 || lfHeaderEnd < headerEnd)) {
    headerEnd = lfHeaderEnd;
    separatorLength = 2;
  }

  if (headerEnd === -1) {
    return null;
  }

  const header = buffer.slice(0, headerEnd);

  // Not a framed message, let line parser handle it
  if (!/content-length\s*:/i.test(header)) {
    return null;
  }

  const lengthMatch = header.match(/content-length\s*:\s*(\d+)/i);
  if (!lengthMatch) {
    throw new Error('Invalid Content-Length header');
  }

  const contentLength = Number.parseInt(lengthMatch[1], 10);
  const bodyStart = headerEnd + separatorLength;
  const bodyEnd = bodyStart + contentLength;

  if (buffer.length < bodyEnd) {
    return null;
  }

  return {
    body: buffer.slice(bodyStart, bodyEnd),
    rest: buffer.slice(bodyEnd)
  };
}

/**
 * Whether current buffer starts with Content-Length framed transport
 */
function looksLikeContentLengthFrame(buffer: string): boolean {
  const trimmed = buffer.trimStart();
  return /^content-length\s*:/i.test(trimmed);
}

/**
 * Process a raw JSON message
 */
async function processRawMessage(raw: string): Promise<void> {
  const payload = raw.trim();
  if (!payload) {
    return;
  }

  try {
    const request: MCPRequest = JSON.parse(payload);
    await handleRequest(request);
  } catch (error) {
    console.error('Failed to parse request:', error);
    sendError(
      null,
      ERROR_CODES.PARSE_ERROR,
      'Invalid JSON-RPC request'
    );
  }
}

/**
 * Handle request
 */
async function handleRequest(request: MCPRequest): Promise<void> {
  try {
    switch (request.method) {
      case 'initialize':
        handleInitialize(request);
        break;

      case 'notifications/initialized':
        isInitialized = true;
        break;

      case 'tools/list':
        handleToolsList(request);
        break;

      case 'tools/call':
        await handleToolsCall(request);
        break;

      case 'ping':
        if (request.id === undefined) {
          return;
        }

        sendResponse({
          jsonrpc: '2.0',
          id: request.id,
          result: { status: 'ok' }
        });
        break;

      case 'shutdown':
        handleShutdown(request);
        break;

      case 'exit':
        handleExit();
        break;

      default:
        sendError(
          request.id,
          ERROR_CODES.METHOD_NOT_FOUND,
          `Method not found: ${request.method}`
        );
    }
  } catch (error: any) {
    logError('Request handler', error);
    const internalError = handleInternalError(error);
    sendError(request.id, internalError.code, internalError.message, internalError.data);
  }
}

/**
 * Main function
 */
function main(): void {
  console.error(`🚀 ${SERVER_INFO.name} v${SERVER_INFO.version}`);
  console.error(`📋 Based on: ${SERVER_INFO.basedOn}`);
  console.error(`🧠 Specialized for Codex brainstorming and acceptance review`);
  console.error(`⚡ Powered by Gemini 3.1 Pro / Flash`);
  console.error('');
  console.error('Waiting for requests...');
  console.error('');

  // Read stdin as stream; supports both Content-Length framed and line-delimited JSON
  let buffer = '';

  process.stdin.on('data', async (chunk: string | Buffer) => {
    buffer += chunk.toString();

    while (buffer.length > 0) {
      try {
        if (looksLikeContentLengthFrame(buffer)) {
          const framedMessage = parseContentLengthMessage(buffer);

          if (!framedMessage) {
            // Wait for more frame data
            break;
          }

          buffer = framedMessage.rest;
          await processRawMessage(framedMessage.body);
          continue;
        }

        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) {
          break;
        }

        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        await processRawMessage(line);
      } catch (error) {
        console.error('Request handling error:', error);
        sendError(null, ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC request');
      }
    }
  });

  process.stdin.on('end', () => {
    console.error('Connection closed');
    process.exit(0);
  });

  // Handle process signals
  process.on('SIGINT', () => {
    if (!isShuttingDown) {
      console.error('\nShutting down...');
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('\nShutting down...');
    process.exit(0);
  });
}

// Start server
main();
