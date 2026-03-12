/**
 * Error handling utilities
 */

import { ERROR_CODES } from '../config/constants.js';
import { MCPError } from '../types.js';
import { FileReadError } from './file-reader.js';
import { SecurityError } from './security.js';

function isMCPErrorLike(error: any): error is MCPError {
  return typeof error?.code === 'number' && typeof error?.message === 'string';
}

function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error?.message === 'string') {
    return error.message;
  }

  return 'Unknown error';
}

export function sanitizeUrlForLog(value: string): string {
  try {
    const parsed = new URL(value);
    const authSegment = parsed.username || parsed.password ? '***@' : '';
    const portSegment = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${authSegment}${parsed.hostname}${portSegment}`;
  } catch {
    return value.replace(/:\/\/[^@\s/]+@/g, '://***@');
  }
}

/**
 * Create MCP error object
 */
export function createMCPError(code: number, message: string, data?: any): MCPError {
  return { code, message, data };
}

/**
 * Handle API errors
 */
export function handleAPIError(error: any): MCPError {
  if (isMCPErrorLike(error)) {
    return error;
  }

  const message = getErrorMessage(error);

  if (error instanceof SecurityError || message.includes('Security validation failed')) {
    return createMCPError(
      ERROR_CODES.INVALID_PARAMS,
      message,
      {
        code: error instanceof SecurityError ? error.code : undefined,
        path: error instanceof SecurityError ? error.path : undefined,
        originalError: message
      }
    );
  }

  if (error instanceof FileReadError) {
    return createMCPError(
      ERROR_CODES.INVALID_PARAMS,
      message,
      {
        filePath: error.filePath,
        originalError: message
      }
    );
  }

  if (
    /file not found|directory not found|no permission to access file|path is a directory|cannot read binary file/i.test(message)
  ) {
    return createMCPError(
      ERROR_CODES.INVALID_PARAMS,
      message,
      { originalError: message }
    );
  }

  // API Key error
  if (message.includes('API key') || message.includes('Invalid key')) {
    return createMCPError(
      ERROR_CODES.API_ERROR,
      'Invalid API key. Please check your GEMINI_API_KEY environment variable.',
      { originalError: message }
    );
  }

  // Quota error
  if (message.includes('quota') || message.includes('rate limit')) {
    return createMCPError(
      ERROR_CODES.RATE_LIMIT,
      'API quota exceeded or rate limit reached. Please try again later.',
      { originalError: message }
    );
  }

  // Timeout error
  if (message.includes('timeout')) {
    return createMCPError(
      ERROR_CODES.TIMEOUT,
      'Request timeout. The operation took too long to complete.',
      { originalError: message }
    );
  }

  // Network / transport errors
  if (/fetch failed|network|econnreset|econnrefused|enotfound|eai_again|proxy/i.test(message)) {
    return createMCPError(
      ERROR_CODES.API_ERROR,
      'Network request to Gemini failed. Check proxy, connectivity, or API availability.',
      { originalError: message }
    );
  }

  // Model not supported
  if (
    /\bmodel\b/i.test(message)
    && /not supported|not available|unsupported|not found/i.test(message)
  ) {
    return createMCPError(
      ERROR_CODES.MODEL_NOT_SUPPORTED,
      'The specified model is not supported or not available.',
      { originalError: message }
    );
  }

  // Generic API error
  return createMCPError(
    ERROR_CODES.API_ERROR,
    message || 'An error occurred while calling the Gemini API.',
    { originalError: message }
  );
}

/**
 * Handle parameter validation errors
 */
export function handleValidationError(message: string, details?: any): MCPError {
  return createMCPError(ERROR_CODES.INVALID_PARAMS, message, details);
}

/**
 * Handle internal errors
 */
export function handleInternalError(error: any): MCPError {
  return createMCPError(
    ERROR_CODES.INTERNAL_ERROR,
    'Internal server error',
    { originalError: error.message }
  );
}

/**
 * Sanitize error message (prevent sensitive information leakage)
 */
export function sanitizeErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
      .replace(/apiKey\s*=\s*[^\s]+/gi, 'apiKey=***')
      .replace(/(https?:\/\/)([^@\s/]+)@/gi, '$1***@');
  }
  if (error.message) {
    return error.message
      .replace(/apiKey\s*=\s*[^\s]+/gi, 'apiKey=***')
      .replace(/(https?:\/\/)([^@\s/]+)@/gi, '$1***@');
  }
  return 'Unknown error';
}

/**
 * Log error (for debugging)
 */
export function logError(context: string, error: any): void {
  const timestamp = new Date().toISOString();
  const sanitized = sanitizeErrorMessage(error);
  console.error(`[${timestamp}] [${context}] Error:`, sanitized);

  if (error.stack) {
    console.error('Stack trace:', sanitizeErrorMessage(error.stack));
  }
}
