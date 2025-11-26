/**
 * Tool 3: gemini_fix_ui_from_screenshot
 * Identify and fix UI issues from screenshots
 * Priority: P0 - Core functionality
 */
import { validateRequired, validateString } from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
// System prompt for UI debugging
const UI_FIX_SYSTEM_PROMPT = `You are a UI debugging expert specializing in visual problem diagnosis.

Your expertise:
- Identifying layout issues (alignment, spacing, overflow)
- Detecting styling problems (colors, fonts, borders)
- Spotting responsive design failures
- Finding accessibility issues
- Recognizing browser compatibility problems

Analysis process:
1. Examine the screenshot carefully
2. Identify all visual problems
3. Determine root causes (CSS, HTML structure, JavaScript)
4. Provide targeted fixes

Output requirements:
1. Diagnosis:
   - List all identified issues
   - Explain why each issue occurs
   - Prioritize by severity
2. Fixes:
   - Provide complete code fixes
   - Show before/after comparisons
   - Explain what each fix does
3. Prevention:
   - Suggest best practices to avoid similar issues
   - Recommend tools or techniques

Code quality:
- Minimal changes (fix only what's broken)
- Maintain existing code style
- Add comments explaining fixes
- Ensure backward compatibility`;
/**
 * Handle gemini_fix_ui_from_screenshot tool call
 */
export async function handleFixUI(params, client) {
    try {
        // Validate required parameters
        // screenshot 可以是文件路径或 Base64，gemini-client.ts 会自动处理转换
        validateRequired(params.screenshot, 'screenshot');
        validateString(params.screenshot, 'screenshot', 5);
        // Build the prompt
        let prompt = `Analyze this screenshot and identify all UI problems.\n\n`;
        if (params.issueDescription) {
            prompt += `Known Issue: ${params.issueDescription}\n\n`;
        }
        if (params.currentCode) {
            prompt += `Current Code:\n\`\`\`\n${params.currentCode}\n\`\`\`\n\n`;
        }
        if (params.targetState) {
            prompt += `Expected State: ${params.targetState}\n\n`;
        }
        prompt += `Please provide:
1. Diagnosis: What's wrong and why
2. Fixes: Complete code fixes for each issue
3. Prevention: How to avoid similar issues

Format your response as JSON with this structure:
{
  "diagnosis": "detailed analysis",
  "fixes": [
    {
      "description": "what this fix does",
      "code": "complete fixed code",
      "changes": ["list of changes made"]
    }
  ],
  "preventionTips": ["tip 1", "tip 2"]
}`;
        // Call Gemini API with screenshot
        const images = [params.screenshot];
        // targetState 可以是图片（文件路径或 Base64）或文本描述
        // 如果看起来像图片（Base64 或文件路径），则添加到图片列表
        if (params.targetState) {
            const isBase64Image = params.targetState.startsWith('data:image');
            const isFilePath = /\.(png|jpg|jpeg|gif|webp|bmp|svg|ico)$/i.test(params.targetState);
            if (isBase64Image || isFilePath) {
                images.push(params.targetState);
            }
        }
        const response = await client.generateMultimodal(prompt, images, {
            systemInstruction: UI_FIX_SYSTEM_PROMPT,
            temperature: 0.5,
            maxTokens: 6144
        });
        // Try to parse as JSON
        try {
            const result = JSON.parse(response);
            return result;
        }
        catch {
            // If not JSON, return structured response
            return {
                diagnosis: response,
                fixes: [{
                        description: 'General fix',
                        code: extractCodeFromResponse(response),
                        changes: ['See diagnosis for details']
                    }]
            };
        }
    }
    catch (error) {
        logError('fixUI', error);
        throw handleAPIError(error);
    }
}
/**
 * Extract code from response (if JSON parsing fails)
 */
function extractCodeFromResponse(response) {
    // Try to extract code blocks
    const codeBlocks = response.match(/```[\s\S]*?```/g);
    if (codeBlocks && codeBlocks.length > 0) {
        return codeBlocks.map(block => block.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim()).join('\n\n');
    }
    return response;
}
//# sourceMappingURL=fix-ui.js.map