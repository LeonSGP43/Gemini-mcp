/**
 * 国际化支持 - 中文错误信息和系统提示
 * i18n Support - Chinese error messages and system prompts
 */
export const ERROR_MESSAGES = {
    API_KEY_MISSING: '缺少 GEMINI_API_KEY 环境变量。请设置您的 Google Gemini API 密钥。',
    API_KEY_INVALID: 'Gemini API 密钥无效或已过期。请检查您的 API 密钥。',
    MODEL_NOT_FOUND: '找不到指定的模型。请使用 list_models 工具查看可用模型列表。',
    NETWORK_ERROR: '网络连接失败。请检查您的网络连接和代理设置。',
    RATE_LIMIT: 'API 调用频率超限。请稍后重试。',
    CONTEXT_TOO_LONG: '上下文长度超出模型限制。请减少输入内容或清除对话历史。',
    SAFETY_BLOCKED: '内容因安全策略被拦截。请修改您的输入内容。',
    INVALID_REQUEST: '无效的请求格式。请检查您的输入参数。',
    SERVER_ERROR: 'Gemini API 服务器错误。请稍后重试。',
    THINKING_NOT_SUPPORTED: '所选模型不支持思考模式。请使用 gemini-2.5-pro 或 gemini-2.5-flash。',
    FILE_NOT_FOUND: '找不到指定的文件。请检查文件路径是否正确。',
    FILE_READ_ERROR: '读取文件失败。请检查文件权限和路径格式。'
};
export const SYSTEM_PROMPTS = {
    CHINESE_OPTIMIZATION: `
你是一个专为中文用户优化的 AI 助手，运行在 Windows 平台上。

## 重要提示
1. **路径格式**: Windows 使用反斜杠 \\ 作为路径分隔符（如 C:\\Users\\...）
2. **中文路径**: 支持中文文件名和文件夹名，但建议使用英文路径以避免编码问题
3. **换行符**: Windows 使用 CRLF (\\r\\n) 而非 LF (\\n)
4. **大小写**: Windows 文件系统不区分大小写

## 交互规则
- 优先使用中文进行交流
- 代码注释使用中文
- 错误信息提供中文说明
- 提供 Windows 平台特定的建议
`,
    WINDOWS_PATH_TIPS: `
## Windows 路径处理建议
1. 使用 path.normalize() 标准化路径
2. 使用 path.join() 拼接路径，自动处理分隔符
3. 使用 path.resolve() 获取绝对路径
4. 避免硬编码路径分隔符
5. 处理中文路径时使用 UTF-8 编码
`
};
/**
 * 将英文错误信息翻译为中文
 * @param error 原始错误对象
 * @returns 中文错误信息
 */
export function translateError(error) {
    const message = error.message || error.toString();
    // API Key 相关
    if (message.includes('API key') || message.includes('GEMINI_API_KEY')) {
        return ERROR_MESSAGES.API_KEY_MISSING;
    }
    if (message.includes('invalid') && message.includes('key')) {
        return ERROR_MESSAGES.API_KEY_INVALID;
    }
    // 网络相关
    if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (message.includes('rate limit') || message.includes('quota')) {
        return ERROR_MESSAGES.RATE_LIMIT;
    }
    // 模型和内容相关
    if (message.includes('model not found') || message.includes('invalid model')) {
        return ERROR_MESSAGES.MODEL_NOT_FOUND;
    }
    if (message.includes('context length') || message.includes('too long')) {
        return ERROR_MESSAGES.CONTEXT_TOO_LONG;
    }
    if (message.includes('safety') || message.includes('blocked')) {
        return ERROR_MESSAGES.SAFETY_BLOCKED;
    }
    if (message.includes('thinking') && message.includes('not supported')) {
        return ERROR_MESSAGES.THINKING_NOT_SUPPORTED;
    }
    // 文件相关
    if (message.includes('ENOENT') || message.includes('not found')) {
        return ERROR_MESSAGES.FILE_NOT_FOUND;
    }
    if (message.includes('EACCES') || message.includes('permission')) {
        return ERROR_MESSAGES.FILE_READ_ERROR;
    }
    // 服务器错误
    if (message.includes('500') || message.includes('server error')) {
        return ERROR_MESSAGES.SERVER_ERROR;
    }
    // 默认返回原始错误和中文说明
    return `操作失败: ${message}`;
}
/**
 * 格式化成功消息
 * @param key 消息类型
 * @param details 详细信息
 * @returns 格式化的中文消息
 */
export function formatSuccessMessage(key, details) {
    const messages = {
        chat_complete: '对话完成',
        models_listed: `已列出 ${details?.count || 0} 个可用模型`,
        conversation_cleared: '对话历史已清除',
        file_read: `成功读取文件: ${details?.path || ''}`,
        thinking_enabled: '已启用思考模式',
        thinking_disabled: '已禁用思考模式'
    };
    return messages[key] || '操作成功';
}
//# sourceMappingURL=i18n.js.map