/**
 * Gemini model configuration
 * Based on official documentation: https://ai.google.dev/gemini-api/docs/models
 * Last updated: January 2026
 */
/**
 * Supported Gemini model list
 * Curated 3 models focused on UI generation and frontend development
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
        lastUpdate: 'January 2026',
        isDefault: true
    },
    'gemini-3-flash-preview': {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3.0 Flash Preview',
        description: 'Fast and efficient 3.0 model with excellent price/performance ratio',
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
        bestFor: ['Quick Q&A', 'Real-time analysis', 'Batch processing', 'Cost optimization'],
        useCases: ['Quick Q&A', 'Real-time analysis', 'Batch processing', 'Daily coding tasks'],
        thinking: true,
        lastUpdate: 'January 2026',
        isDefault: false
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
    batch_processing: 'gemini-3-flash-preview',
    quick_tasks: 'gemini-3-flash-preview',
    fallback: 'gemini-2.5-pro'
};
//# sourceMappingURL=models.js.map