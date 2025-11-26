/**
 * Gemini model configuration
 * Based on official documentation: https://ai.google.dev/gemini-api/docs/models
 * Last updated: November 2025
 */

/**
 * Model capabilities details interface
 */
export interface ModelCapabilities {
  /** Maximum input tokens */
  maxInputTokens: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Whether vision/video input is supported */
  supportsVision: boolean;
  /** Whether function calling is supported */
  supportsFunctionCalling: boolean;
  /** Whether streaming output is supported */
  supportsStreaming: boolean;
  /** Whether thinking/reasoning is supported */
  supportsThinking: boolean;
  /** Whether system instructions are supported */
  supportsSystemInstructions: boolean;
}

/**
 * Model pricing information (optional)
 */
export interface ModelPricing {
  /** Price per million input tokens */
  inputPerMillion: string;
  /** Price per million output tokens */
  outputPerMillion: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  outputLimit: number;
  /** Structured capability information */
  capabilities: ModelCapabilities;
  features: string[];
  bestFor: string[];
  /** Recommended use cases */
  useCases: string[];
  thinking: boolean;
  lastUpdate: string;
  isDefault: boolean;
  /** Pricing information (optional) */
  pricing?: ModelPricing;
}

/**
 * Supported Gemini model list
 * Curated 4 models focused on UI generation and frontend development
 */
export const SUPPORTED_MODELS: Record<string, ModelConfig> = {
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
export function getDefaultModel(): ModelConfig {
  return SUPPORTED_MODELS['gemini-3-pro-preview'];
}

/**
 * Get model configuration
 * @param modelId - Model ID
 * @returns Model configuration, returns default model if not found
 */
export function getModelConfig(modelId?: string): ModelConfig {
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
export function isModelSupported(modelId: string): boolean {
  return modelId in SUPPORTED_MODELS;
}

/**
 * Get all supported models list
 */
export function getAllModels(): ModelConfig[] {
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
