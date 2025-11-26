/**
 * Tool 8: list_models
 * 列出所有可用的 Gemini 模型
 */
import { getAllModels, MODEL_RECOMMENDATIONS } from '../config/models.js';
/**
 * 处理 list_models 请求
 */
export async function handleListModels() {
    const models = getAllModels();
    return {
        models: models.map((model) => ({
            id: model.id,
            name: model.name,
            description: model.description,
            contextWindow: model.contextWindow,
            outputLimit: model.outputLimit,
            features: model.features,
            bestFor: model.bestFor,
            thinking: model.thinking,
            lastUpdate: model.lastUpdate,
            isDefault: model.isDefault
        })),
        recommended: MODEL_RECOMMENDATIONS.ui_generation,
        recommendations: MODEL_RECOMMENDATIONS,
        total: models.length
    };
}
//# sourceMappingURL=list-models.js.map