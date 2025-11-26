/**
 * 错误处理工具
 */
import { ERROR_CODES } from '../config/constants.js';
/**
 * 创建 MCP 错误对象
 */
export function createMCPError(code, message, data) {
    return { code, message, data };
}
/**
 * 处理 API 错误
 */
export function handleAPIError(error) {
    // API Key 错误
    if (error.message?.includes('API key') || error.message?.includes('Invalid key')) {
        return createMCPError(ERROR_CODES.API_ERROR, 'Invalid API key. Please check your GEMINI_API_KEY environment variable.', { originalError: error.message });
    }
    // 配额错误
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return createMCPError(ERROR_CODES.RATE_LIMIT, 'API quota exceeded or rate limit reached. Please try again later.', { originalError: error.message });
    }
    // 超时错误
    if (error.message?.includes('timeout')) {
        return createMCPError(ERROR_CODES.TIMEOUT, 'Request timeout. The operation took too long to complete.', { originalError: error.message });
    }
    // 模型不支持
    if (error.message?.includes('model') || error.message?.includes('not found')) {
        return createMCPError(ERROR_CODES.MODEL_NOT_SUPPORTED, 'The specified model is not supported or not available.', { originalError: error.message });
    }
    // 通用 API 错误
    return createMCPError(ERROR_CODES.API_ERROR, error.message || 'An error occurred while calling the Gemini API.', { originalError: error.message });
}
/**
 * 处理参数验证错误
 */
export function handleValidationError(message, details) {
    return createMCPError(ERROR_CODES.INVALID_PARAMS, message, details);
}
/**
 * 处理内部错误
 */
export function handleInternalError(error) {
    return createMCPError(ERROR_CODES.INTERNAL_ERROR, 'Internal server error', { originalError: error.message });
}
/**
 * 安全的错误消息（不泄露敏感信息）
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
 * 记录错误（用于调试）
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