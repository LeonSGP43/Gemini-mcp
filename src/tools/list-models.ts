/**
 * Tool 8: list_models
 * List all available Gemini models
 */

import {
  getAllModels,
  getDefaultModel,
  MODEL_RECOMMENDATIONS,
  ModelConfig,
  ModelCapabilities
} from '../config/models.js';

/**
 * Model information output interface (more structured)
 */
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  /** Structured capability information */
  capabilities: ModelCapabilities;
  /** Recommended use cases */
  useCases: string[];
  /** Whether this is the default model */
  isDefault: boolean;
  /** List of supported features */
  features: string[];
  /** Best suited scenarios */
  bestFor: string[];
  /** Last update time */
  lastUpdate: string;
}

/**
 * list_models return result interface
 */
export interface ListModelsResult {
  /** All available models */
  models: ModelInfo[];
  /** Default model ID */
  defaultModel: string;
  /** Total number of models */
  totalCount: number;
  /** Model recommendations by scenario */
  recommendations: typeof MODEL_RECOMMENDATIONS;
}

/**
 * Handle list_models request
 * Returns detailed information about all available models, including structured capability information
 */
export async function handleListModels(): Promise<ListModelsResult> {
  const models = getAllModels();
  const defaultModel = getDefaultModel();

  return {
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      capabilities: model.capabilities,
      useCases: model.useCases,
      isDefault: model.isDefault,
      features: model.features,
      bestFor: model.bestFor,
      lastUpdate: model.lastUpdate
    })),
    defaultModel: defaultModel.id,
    totalCount: models.length,
    recommendations: MODEL_RECOMMENDATIONS
  };
}
