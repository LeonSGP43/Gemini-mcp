/**
 * 参数验证工具
 */
import { FRAMEWORKS, ANIMATION_TECHNOLOGIES, UI_STYLES, OUTPUT_FORMATS, CONTENT_TYPES, ANALYSIS_TASKS, CODEBASE_FOCUS, BRAINSTORM_STYLES } from '../config/constants.js';
import { isModelSupported } from '../config/models.js';
/**
 * 验证必填参数
 */
export function validateRequired(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        throw new Error(`${fieldName} is required`);
    }
}
/**
 * 验证字符串
 */
export function validateString(value, fieldName, minLength = 1) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }
    if (value.length < minLength) {
        throw new Error(`${fieldName} must be at least ${minLength} characters long`);
    }
}
/**
 * 验证数字
 */
export function validateNumber(value, fieldName, min, max) {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`${fieldName} must be a number`);
    }
    if (min !== undefined && value < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
        throw new Error(`${fieldName} must be at most ${max}`);
    }
}
/**
 * 验证布尔值
 */
export function validateBoolean(value, fieldName) {
    if (typeof value !== 'boolean') {
        throw new Error(`${fieldName} must be a boolean`);
    }
}
/**
 * 验证枚举值
 */
export function validateEnum(value, fieldName, allowedValues) {
    if (!allowedValues.includes(value)) {
        throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}. Got: ${value}`);
    }
}
/**
 * 验证数组
 */
export function validateArray(value, fieldName, minLength = 1) {
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be an array`);
    }
    if (value.length < minLength) {
        throw new Error(`${fieldName} must have at least ${minLength} item(s)`);
    }
}
/**
 * 验证 Base64 图片
 */
export function validateBase64Image(value, fieldName) {
    if (!value.startsWith('data:image/')) {
        throw new Error(`${fieldName} must be a Base64 encoded image (data:image/...)`);
    }
}
/**
 * 验证 URL
 */
export function validateURL(value, fieldName) {
    try {
        new URL(value);
    }
    catch {
        throw new Error(`${fieldName} must be a valid URL`);
    }
}
/**
 * 验证框架
 */
export function validateFramework(value) {
    validateEnum(value, 'framework', FRAMEWORKS);
}
/**
 * 验证动画技术
 */
export function validateAnimationTechnology(value) {
    validateEnum(value, 'technology', ANIMATION_TECHNOLOGIES);
}
/**
 * 验证 UI 样式
 */
export function validateUIStyle(value) {
    validateEnum(value, 'style', UI_STYLES);
}
/**
 * 验证输出格式
 */
export function validateOutputFormat(value) {
    validateEnum(value, 'outputFormat', OUTPUT_FORMATS);
}
/**
 * 验证内容类型
 */
export function validateContentType(value) {
    validateEnum(value, 'type', CONTENT_TYPES);
}
/**
 * 验证分析任务
 */
export function validateAnalysisTask(value) {
    validateEnum(value, 'task', ANALYSIS_TASKS);
}
/**
 * 验证代码库关注点
 */
export function validateCodebaseFocus(value) {
    validateEnum(value, 'focus', CODEBASE_FOCUS);
}
/**
 * 验证头脑风暴风格
 */
export function validateBrainstormStyle(value) {
    validateEnum(value, 'style', BRAINSTORM_STYLES);
}
/**
 * 验证模型 ID
 */
export function validateModel(modelId) {
    if (!isModelSupported(modelId)) {
        throw new Error(`Model "${modelId}" is not supported. Use one of: gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite`);
    }
}
/**
 * 验证温度参数
 */
export function validateTemperature(temperature) {
    validateNumber(temperature, 'temperature', 0, 2);
}
/**
 * 验证 maxTokens 参数
 */
export function validateMaxTokens(maxTokens) {
    validateNumber(maxTokens, 'maxTokens', 1, 65536);
}
//# sourceMappingURL=validators.js.map