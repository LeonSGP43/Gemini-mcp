#!/usr/bin/env node
/**
 * mcp-server-gemini-lkbaba
 * Main server file
 *
 * Specialized MCP server for Codex-oriented Gemini brainstorming and acceptance assistance
 * Based on: aliargun/mcp-server-gemini v4.2.2
 * Author: LKbaba
 */
import { SERVER_INFO, MCP_VERSION, ERROR_CODES, TOOL_NAMES } from './config/constants.js';
import { handleAPIError, handleValidationError, handleInternalError, logError } from './utils/error-handler.js';
import { TOOL_DEFINITIONS } from './tools/definitions.js';
import { handleBrainstormAssist, handleAcceptanceAssist } from './tools/index.js';
// Setup proxy for Node.js fetch (required for users behind proxy/VPN)
async function setupProxy() {
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy;
    if (proxyUrl) {
        try {
            const { ProxyAgent, setGlobalDispatcher } = await import('undici');
            const dispatcher = new ProxyAgent(proxyUrl);
            setGlobalDispatcher(dispatcher);
            console.error(`🌐 Proxy configured: ${proxyUrl}`);
        }
        catch (error) {
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
let isDrainingBuffer = false;
let shouldExitWhenIdle = false;
let hasExited = false;
let pendingResponseWrites = 0;
let stdinEnded = false;
let forceExitTimer = null;
let buffer = '';
/**
 * Send response to stdout
 */
function sendResponse(response) {
    pendingResponseWrites += 1;
    process.stdout.write(`${JSON.stringify(response)}\n`, () => {
        pendingResponseWrites = Math.max(0, pendingResponseWrites - 1);
        maybeExit();
    });
}
/**
 * Send error response
 */
function sendError(id, code, message, data) {
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
function handleInitialize(request) {
    const result = {
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
function handleToolsList(request) {
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
async function handleToolsCall(request) {
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
            sendError(request.id, ERROR_CODES.API_ERROR, 'GEMINI_API_KEY environment variable is not set');
            return;
        }
        let result;
        // Route to corresponding tool handler
        switch (name) {
            case TOOL_NAMES.BRAINSTORM_ASSIST:
                result = await handleBrainstormAssist(args, apiKey);
                break;
            case TOOL_NAMES.ACCEPTANCE_ASSIST:
                result = await handleAcceptanceAssist(args, apiKey);
                break;
            default:
                sendError(request.id, ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool: ${name}`);
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
    }
    catch (error) {
        logError(`Tool: ${name}`, error);
        // Return appropriate error based on error type
        if (error.message?.includes('not yet implemented')) {
            sendError(request.id, ERROR_CODES.INTERNAL_ERROR, error.message);
        }
        else if (error.message?.includes('required') || error.message?.includes('must be')) {
            const validationError = handleValidationError(error.message);
            sendError(request.id, validationError.code, validationError.message, validationError.data);
        }
        else {
            const apiError = handleAPIError(error);
            sendError(request.id, apiError.code, apiError.message, apiError.data);
        }
    }
}
/**
 * Handle shutdown request
 */
function handleShutdown(request) {
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
function handleExit() {
    requestGracefulExit();
}
function maybeExit() {
    if (hasExited || !shouldExitWhenIdle) {
        return;
    }
    if (isDrainingBuffer || pendingResponseWrites > 0) {
        return;
    }
    if (buffer.length > 0) {
        return;
    }
    hasExited = true;
    if (forceExitTimer) {
        clearTimeout(forceExitTimer);
        forceExitTimer = null;
    }
    process.exit(0);
}
function requestGracefulExit(forceAfterMs) {
    shouldExitWhenIdle = true;
    isShuttingDown = true;
    if (forceAfterMs && !forceExitTimer) {
        forceExitTimer = setTimeout(() => {
            if (!hasExited) {
                hasExited = true;
                process.exit(0);
            }
        }, forceAfterMs);
        forceExitTimer.unref();
    }
    maybeExit();
}
/**
 * Try to parse Content-Length framed message from buffer
 */
function parseContentLengthMessage(buffer) {
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
function looksLikeContentLengthFrame(buffer) {
    const trimmed = buffer.trimStart();
    return /^content-length\s*:/i.test(trimmed);
}
/**
 * Process a raw JSON message
 */
async function processRawMessage(raw) {
    const payload = raw.trim();
    if (!payload) {
        return;
    }
    try {
        const request = JSON.parse(payload);
        await handleRequest(request);
    }
    catch (error) {
        console.error('Failed to parse request:', error);
        sendError(null, ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC request');
    }
}
/**
 * Handle request
 */
async function handleRequest(request) {
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
                sendError(request.id, ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${request.method}`);
        }
    }
    catch (error) {
        logError('Request handler', error);
        const internalError = handleInternalError(error);
        sendError(request.id, internalError.code, internalError.message, internalError.data);
    }
}
/**
 * Main function
 */
function main() {
    console.error(`🚀 ${SERVER_INFO.name} v${SERVER_INFO.version}`);
    console.error(`📋 Based on: ${SERVER_INFO.basedOn}`);
    console.error(`🧠 Specialized for Codex brainstorming and acceptance review`);
    console.error(`⚡ Powered by Gemini 3.1 Pro / Flash`);
    console.error('');
    console.error('Waiting for requests...');
    console.error('');
    // Read stdin as stream; supports both Content-Length framed and line-delimited JSON
    let processingQueue = Promise.resolve();
    async function drainBuffer() {
        if (isDrainingBuffer) {
            return;
        }
        isDrainingBuffer = true;
        try {
            while (buffer.length > 0) {
                if (looksLikeContentLengthFrame(buffer)) {
                    const framedMessage = parseContentLengthMessage(buffer);
                    if (!framedMessage) {
                        if (stdinEnded) {
                            throw new Error('Incomplete Content-Length framed message at EOF');
                        }
                        break;
                    }
                    buffer = framedMessage.rest;
                    await processRawMessage(framedMessage.body);
                    continue;
                }
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    if (!stdinEnded) {
                        break;
                    }
                    const finalLine = buffer;
                    buffer = '';
                    await processRawMessage(finalLine);
                    continue;
                }
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                await processRawMessage(line);
            }
        }
        catch (error) {
            console.error('Request handling error:', error);
            buffer = '';
            sendError(null, ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC request');
        }
        finally {
            isDrainingBuffer = false;
            maybeExit();
        }
    }
    function scheduleDrain() {
        processingQueue = processingQueue
            .then(async () => {
            await drainBuffer();
        })
            .catch((error) => {
            console.error('Buffer drain error:', error);
            sendError(null, ERROR_CODES.PARSE_ERROR, 'Invalid JSON-RPC request');
        })
            .finally(() => {
            maybeExit();
        });
    }
    process.stdin.on('data', (chunk) => {
        buffer += chunk.toString();
        scheduleDrain();
    });
    process.stdin.on('end', () => {
        stdinEnded = true;
        console.error('Connection closed');
        scheduleDrain();
        requestGracefulExit();
    });
    // Handle process signals
    process.on('SIGINT', () => {
        if (!isShuttingDown) {
            console.error('\nShutting down...');
        }
        requestGracefulExit(1000);
    });
    process.on('SIGTERM', () => {
        console.error('\nShutting down...');
        requestGracefulExit(1000);
    });
}
// Start server
main();
//# sourceMappingURL=server.js.map