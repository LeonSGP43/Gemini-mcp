/**
 * Tool 8: list_models
 * List all available Gemini models
 */
import { getAllModels, getDefaultModel, MODEL_RECOMMENDATIONS } from '../config/models.js';
/**
 * Handle list_models request
 * Returns detailed information about all available models, including structured capability information
 */
export async function handleListModels() {
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
//# sourceMappingURL=list-models.js.map