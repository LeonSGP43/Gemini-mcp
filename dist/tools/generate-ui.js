/**
 * Tool 1: gemini_generate_ui
 * Generate HTML/CSS/JavaScript UI components from description or design image
 * Priority: P0 - Core functionality
 */
import { validateRequired, validateString, validateFramework, validateUIStyle } from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
// System prompt for UI generation
const UI_GENERATION_SYSTEM_PROMPT = `You are an expert frontend developer specializing in UI/UX implementation.

Your strengths:
- Converting design mockups into pixel-perfect HTML/CSS/JavaScript
- Creating smooth animations and transitions
- Writing clean, semantic, accessible HTML
- Implementing responsive layouts (mobile-first approach)
- Adding interactive JavaScript with modern ES6+ syntax

Output requirements:
1. Return ONLY complete, working code
2. For vanilla HTML:
   - Use inline <style> tags with organized CSS
   - Use inline <script> tags with modern JavaScript
   - Include all necessary HTML structure
3. For React/Vue/Svelte:
   - Return component code with all imports
   - Use modern hooks/composition API
   - Include prop types and documentation
4. Make it production-ready:
   - Semantic HTML5 elements
   - Accessible (ARIA labels, keyboard navigation)
   - Responsive (mobile, tablet, desktop)
   - Smooth animations (CSS transitions/keyframes)
5. Code quality:
   - No explanations unless explicitly asked
   - Well-organized and commented
   - Follow best practices and conventions

When given a design image:
- Match colors, spacing, typography exactly
- Implement all visible hover states and interactions
- Ensure pixel-perfect accuracy
- Infer missing details intelligently

When given only description:
- Create a beautiful, modern design
- Use current design trends (2025)
- Choose appropriate color schemes
- Add delightful micro-interactions`;
/**
 * Handle gemini_generate_ui tool call
 */
export async function handleGenerateUI(params, client) {
    try {
        // Validate required parameters
        validateRequired(params.description, 'description');
        validateString(params.description, 'description', 10);
        // Validate optional parameters
        const framework = params.framework || 'vanilla';
        const includeAnimation = params.includeAnimation !== false; // default true
        const responsive = params.responsive !== false; // default true
        if (params.framework) {
            validateFramework(params.framework);
        }
        if (params.style) {
            validateUIStyle(params.style);
        }
        // Build the prompt
        let prompt = `Generate a ${framework} UI component based on the following requirements:\n\n`;
        prompt += `Description: ${params.description}\n\n`;
        if (params.style) {
            prompt += `Design Style: ${params.style}\n`;
        }
        prompt += `Framework: ${framework}\n`;
        prompt += `Include Animations: ${includeAnimation ? 'Yes' : 'No'}\n`;
        prompt += `Responsive: ${responsive ? 'Yes' : 'No'}\n\n`;
        if (framework === 'vanilla') {
            prompt += `Please provide a complete HTML file with inline CSS and JavaScript.\n`;
        }
        else {
            prompt += `Please provide a complete ${framework} component with all necessary imports.\n`;
        }
        prompt += `Return ONLY the code, no explanations.`;
        // Call Gemini API
        let code;
        if (params.designImage) {
            // Multimodal: text + image
            code = await client.generateMultimodal(prompt, [params.designImage], {
                systemInstruction: UI_GENERATION_SYSTEM_PROMPT,
                temperature: 0.7,
                maxTokens: 8192
            });
        }
        else {
            // Text only
            code = await client.generate(prompt, {
                systemInstruction: UI_GENERATION_SYSTEM_PROMPT,
                temperature: 0.7,
                maxTokens: 8192
            });
        }
        // Clean up code (remove markdown code blocks if present)
        code = cleanCodeOutput(code);
        // For React/Vue/Svelte, we might have multiple files
        const files = framework !== 'vanilla' ? extractFiles(code, framework) : undefined;
        return {
            code,
            framework,
            files,
            preview: framework === 'vanilla' ? code : undefined
        };
    }
    catch (error) {
        logError('generateUI', error);
        throw handleAPIError(error);
    }
}
/**
 * Clean code output (remove markdown code blocks)
 */
function cleanCodeOutput(code) {
    // Remove markdown code blocks
    code = code.replace(/```[a-z]*\n/g, '');
    code = code.replace(/```\n?/g, '');
    // Trim whitespace
    return code.trim();
}
/**
 * Extract multiple files from code (for React/Vue/Svelte)
 */
function extractFiles(code, framework) {
    // For now, return a single file
    // In the future, we can parse multiple files if Gemini returns them
    const extension = framework === 'react' ? 'jsx'
        : framework === 'vue' ? 'vue'
            : framework === 'svelte' ? 'svelte'
                : 'js';
    return {
        [`Component.${extension}`]: code
    };
}
//# sourceMappingURL=generate-ui.js.map