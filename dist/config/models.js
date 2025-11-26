/**
 * Gemini model configuration
 * Based on official documentation: https://ai.google.dev/gemini-api/docs/models
 * Last updated: November 2025
 */
/**
 * Supported Gemini model list
 * Curated 4 models focused on UI generation and frontend development
 */
export const SUPPORTED_MODELS = {
    'gemini-3-pro-preview': {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3.0 Pro Preview',
        description: 'Latest and most powerful model, #1 on WebDev Arena for UI generation',
        contextWindow: 1_048_576, // 1M tokens
        outputLimit: 65_536,
        capabilities: {
            maxInputTokens: 1_048_576,
            maxOutputTokens: 65_536,
            supportsVision: true,
            supportsFunctionCalling: true,
            supportsStreaming: true,
            supportsThinking: true,
            supportsSystemInstructions: true
        },
        features: ['thinking', 'multimodal', 'function_calling', 'grounding', 'system_instructions'],
        bestFor: ['UI generation', 'Frontend development', 'Design to code', 'Interactive animations', 'Complex reasoning'],
        useCases: ['UI generation', 'Frontend development', 'Design to code', 'Interactive animations', 'Complex reasoning'],
        thinking: true,
        lastUpdate: 'November 2025',
        isDefault: true
    },
    'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Stable production model with excellent coding capabilities',
        contextWindow: 1_048_576, // 1M tokens
        outputLimit: 65_536,
        capabilities: {
            maxInputTokens: 1_048_576,
            maxOutputTokens: 65_536,
            supportsVision: true,
            supportsFunctionCalling: true,
            supportsStreaming: true,
            supportsThinking: true,
            supportsSystemInstructions: true
        },
        features: ['thinking', 'multimodal', 'function_calling', 'grounding', 'system_instructions'],
        bestFor: ['General coding', 'Large codebase analysis', 'Fallback option'],
        useCases: ['General coding', 'Large codebase analysis', 'Code review', 'Documentation generation'],
        thinking: true,
        lastUpdate: 'June 2025',
        isDefault: false
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Fast and cost-effective model with best price/performance ratio',
        contextWindow: 1_048_576, // 1M tokens
        outputLimit: 65_536,
        capabilities: {
            maxInputTokens: 1_048_576,
            maxOutputTokens: 65_536,
            supportsVision: true,
            supportsFunctionCalling: true,
            supportsStreaming: true,
            supportsThinking: true,
            supportsSystemInstructions: true
        },
        features: ['thinking', 'multimodal', 'function_calling', 'grounding', 'system_instructions'],
        bestFor: ['High-frequency tasks', 'Batch processing', 'Cost optimization'],
        useCases: ['Quick Q&A', 'Real-time analysis', 'Batch processing', 'Cost optimization'],
        thinking: true,
        lastUpdate: 'June 2025',
        isDefault: false
    },
    'gemini-2.5-flash-lite': {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Ultra-fast and most cost-efficient model for simple tasks',
        contextWindow: 1_048_576, // 1M tokens
        outputLimit: 65_536,
        capabilities: {
            maxInputTokens: 1_048_576,
            maxOutputTokens: 65_536,
            supportsVision: true,
            supportsFunctionCalling: true,
            supportsStreaming: true,
            supportsThinking: true,
            supportsSystemInstructions: true
        },
        features: ['thinking', 'multimodal', 'function_calling', 'system_instructions'],
        bestFor: ['Simple queries', 'Quick prototypes', 'Maximum cost savings'],
        useCases: ['Simple queries', 'Quick validation', 'Low latency scenarios', 'Maximum cost savings'],
        thinking: true,
        lastUpdate: 'July 2025',
        isDefault: false
    }
};
/**
 * Get default model
 */
export function getDefaultModel() {
    return SUPPORTED_MODELS['gemini-3-pro-preview'];
}
/**
 * Get model configuration
 * @param modelId - Model ID
 * @returns Model configuration, returns default model if not found
 */
export function getModelConfig(modelId) {
    if (!modelId) {
        return getDefaultModel();
    }
    return SUPPORTED_MODELS[modelId] || getDefaultModel();
}
/**
 * Validate if model is supported
 * @param modelId - Model ID
 * @returns Whether the model is supported
 */
export function isModelSupported(modelId) {
    return modelId in SUPPORTED_MODELS;
}
/**
 * Get all supported models list
 */
export function getAllModels() {
    return Object.values(SUPPORTED_MODELS);
}
/**
 * Model selection recommendations
 */
export const MODEL_RECOMMENDATIONS = {
    ui_generation: 'gemini-3-pro-preview',
    animation: 'gemini-3-pro-preview',
    multimodal: 'gemini-3-pro-preview',
    codebase_analysis: 'gemini-2.5-pro',
    batch_processing: 'gemini-2.5-flash',
    simple_tasks: 'gemini-2.5-flash-lite',
    fallback: 'gemini-2.5-pro'
};
//# sourceMappingURL=models.js.map