/**
 * 全局常量定义
 */
// MCP 协议版本
export const MCP_VERSION = '2024-11-05';
// 服务器信息
export const SERVER_INFO = {
    name: 'mcp-server-gemini',
    version: '1.0.1',
    description: 'Specialized MCP server for Gemini 3.0 Pro focused on UI generation and frontend development',
    author: 'LKbaba',
    basedOn: 'aliargun/mcp-server-gemini v4.2.2'
};
// API 配置
export const API_CONFIG = {
    timeout: 60000, // 60秒
    maxRetries: 3,
    retryDelay: 1000, // 1秒
    maxImageSize: 10 * 1024 * 1024, // 10MB
};
// 工具列表
export const TOOL_NAMES = {
    GENERATE_UI: 'gemini_generate_ui',
    MULTIMODAL_QUERY: 'gemini_multimodal_query',
    FIX_UI: 'gemini_fix_ui_from_screenshot',
    CREATE_ANIMATION: 'gemini_create_animation',
    ANALYZE_CONTENT: 'gemini_analyze_content',
    ANALYZE_CODEBASE: 'gemini_analyze_codebase',
    BRAINSTORM: 'gemini_brainstorm',
    LIST_MODELS: 'list_models'
};
// 错误代码
export const ERROR_CODES = {
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    PARSE_ERROR: -32700,
    API_ERROR: -32000,
    TIMEOUT: -32001,
    RATE_LIMIT: -32002,
    MODEL_NOT_SUPPORTED: -32003
};
// 默认参数
export const DEFAULT_PARAMS = {
    temperature: 0.7,
    maxTokens: 8192,
    topP: 0.95,
    topK: 40
};
// 支持的框架
export const FRAMEWORKS = ['vanilla', 'react', 'vue', 'svelte'];
// 支持的技术（动画）
export const ANIMATION_TECHNOLOGIES = ['css', 'canvas', 'webgl', 'threejs'];
// 支持的样式
export const UI_STYLES = ['modern', 'minimal', 'glassmorphism', 'neumorphism'];
// 输出格式
export const OUTPUT_FORMATS = ['text', 'code', 'json', 'markdown'];
// 内容类型
export const CONTENT_TYPES = ['code', 'document', 'data', 'auto'];
// 分析任务类型
export const ANALYSIS_TASKS = ['summarize', 'review', 'explain', 'optimize', 'debug'];
// 代码库分析关注点
export const CODEBASE_FOCUS = ['architecture', 'security', 'performance', 'dependencies', 'patterns'];
// 头脑风暴风格
export const BRAINSTORM_STYLES = ['innovative', 'practical', 'radical'];
// 可行性等级
export const FEASIBILITY_LEVELS = ['low', 'medium', 'high'];
// 严重性等级
export const SEVERITY_LEVELS = ['high', 'medium', 'low'];
//# sourceMappingURL=constants.js.map