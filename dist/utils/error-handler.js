/**
 * Error handling utilities
 */
import { ERROR_CODES } from '../config/constants.js';
/**
 * Create MCP error object
 */
export function createMCPError(code, message, data) {
    return { code, message, data };
}
/**
 * Handle API errors
 */
export function handleAPIError(error) {
    // API Key error
    if (error.message?.includes('API key') || error.message?.includes('Invalid key')) {
        return createMCPError(ERROR_CODES.API_ERROR, 'Invalid API key. Please check your GEMINI_API_KEY environment variable.', { originalError: error.message });
    }
    // Quota error
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return createMCPError(ERROR_CODES.RATE_LIMIT, 'API quota exceeded or rate limit reached. Please try again later.', { originalError: error.message });
    }
    // Timeout error
    if (error.message?.includes('timeout')) {
        return createMCPError(ERROR_CODES.TIMEOUT, 'Request timeout. The operation took too long to complete.', { originalError: error.message });
    }
    // Model not supported
    if (error.message?.includes('model') || error.message?.includes('not found')) {
        return createMCPError(ERROR_CODES.MODEL_NOT_SUPPORTED, 'The specified model is not supported or not available.', { originalError: error.message });
    }
    // Generic API error
    return createMCPError(ERROR_CODES.API_ERROR, error.message || 'An error occurred while calling the Gemini API.', { originalError: error.message });
}
/**
 * Handle parameter validation errors
 */
export function handleValidationError(message, details) {
    return createMCPError(ERROR_CODES.INVALID_PARAMS, message, details);
}
/**
 * Handle internal errors
 */
export function handleInternalError(error) {
    return createMCPError(ERROR_CODES.INTERNAL_ERROR, 'Internal server error', { originalError: error.message });
}
/**
 * Sanitize error message (prevent sensitive information leakage)
 */
export function sanitizeErrorMessage(error) {
    if (typeof error === 'string') {
        return error.replace(/apiKey\s*=\s*[^\s]+/gi, 'apiKey=***');
    }
    if (error.message) {
        return error.message.replace(/apiKey\s*=\s*[^\s]+/gi, 'apiKey=***');
    }
    return 'Unknown error';
}
/**
 * Log error (for debugging)
 */
export function logError(context, error) {
    const timestamp = new Date().toISOString();
    const sanitized = sanitizeErrorMessage(error);
    console.error(`[${timestamp}] [${context}] Error:`, sanitized);
    if (error.stack) {
        console.error('Stack trace:', error.stack);
    }
}
//# sourceMappingURL=error-handler.js.map