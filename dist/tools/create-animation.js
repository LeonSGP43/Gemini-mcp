/**
 * Tool 4: gemini_create_animation
 * Create interactive animations using CSS, Canvas, WebGL, or Three.js
 * Priority: P0 - Core functionality
 */
import { validateRequired, validateString, validateAnimationTechnology, validateNumber } from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
// System prompt for animation creation
const ANIMATION_SYSTEM_PROMPT = `You are a creative coding expert specializing in interactive animations.

Your expertise:
- CSS animations and transitions (keyframes, timing functions)
- Canvas 2D API (particles, effects, games)
- WebGL and shaders (3D graphics, visual effects)
- Three.js (3D scenes, materials, lighting)
- Animation principles (easing, timing, motion design)

Creation guidelines:
1. Performance:
   - Use requestAnimationFrame for smooth 60fps
   - Optimize rendering (only draw what changes)
   - Use hardware acceleration when possible
   - Implement proper cleanup (event listeners, timers)

2. Interactivity:
   - Respond to mouse/touch events
   - Add keyboard controls when relevant
   - Provide smooth, natural interactions
   - Handle edge cases (window resize, visibility)

3. Code quality:
   - Well-structured and modular
   - Configurable parameters
   - Clear comments explaining logic
   - Self-contained (minimal dependencies)

4. Visual quality:
   - Smooth, polished animations
   - Appropriate easing functions
   - Consistent style and feel
   - Attention to detail

Output format:
- Complete, working code
- Embedded in HTML with inline scripts
- Includes all necessary setup and initialization
- Ready to copy-paste and run`;
/**
 * Handle gemini_create_animation tool call
 */
export async function handleCreateAnimation(params, client) {
    try {
        // Validate required parameters
        validateRequired(params.description, 'description');
        validateString(params.description, 'description', 10);
        // Validate optional parameters
        const technology = params.technology || 'canvas';
        const interactive = params.interactive !== false; // default true
        const fps = params.fps || 60;
        if (params.technology) {
            validateAnimationTechnology(params.technology);
        }
        if (params.fps) {
            validateNumber(params.fps, 'fps', 1, 120);
        }
        // Build the prompt
        let prompt = `Create an interactive animation using ${technology} based on this description:\n\n`;
        prompt += `${params.description}\n\n`;
        prompt += `Requirements:\n`;
        prompt += `- Technology: ${technology}\n`;
        prompt += `- Interactive: ${interactive ? 'Yes (respond to mouse/touch)' : 'No'}\n`;
        prompt += `- Target FPS: ${fps}\n`;
        if (params.dimensions) {
            prompt += `- Canvas Size: ${params.dimensions.width}x${params.dimensions.height}px\n`;
        }
        prompt += `\n`;
        if (technology === 'css') {
            prompt += `Provide a complete HTML file with CSS animations using keyframes.\n`;
        }
        else if (technology === 'canvas') {
            prompt += `Provide a complete HTML file with Canvas 2D animation.\n`;
        }
        else if (technology === 'webgl') {
            prompt += `Provide a complete HTML file with WebGL shader animation.\n`;
        }
        else if (technology === 'threejs') {
            prompt += `Provide a complete HTML file with Three.js 3D animation.\n`;
            prompt += `Include Three.js from CDN: https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js\n`;
        }
        prompt += `\nReturn ONLY the complete HTML code, no explanations.`;
        // Call Gemini API
        const code = await client.generate(prompt, {
            systemInstruction: ANIMATION_SYSTEM_PROMPT,
            temperature: 0.8, // Higher temperature for more creative animations
            maxTokens: 8192
        });
        // Clean up code
        const cleanedCode = cleanCodeOutput(code);
        // Extract dependencies
        const dependencies = extractDependencies(cleanedCode, technology);
        return {
            code: cleanedCode,
            technology,
            preview: cleanedCode,
            dependencies,
            usage: `Open this HTML file in a modern web browser to see the animation. ${interactive ? 'Use mouse/touch to interact.' : ''}`
        };
    }
    catch (error) {
        logError('createAnimation', error);
        throw handleAPIError(error);
    }
}
/**
 * Clean code output (remove markdown code blocks)
 */
function cleanCodeOutput(code) {
    code = code.replace(/```[a-z]*\n/g, '');
    code = code.replace(/```\n?/g, '');
    return code.trim();
}
/**
 * Extract dependencies from code
 */
function extractDependencies(code, technology) {
    const deps = [];
    if (technology === 'threejs') {
        deps.push('three.js (from CDN)');
    }
    // Check for other common libraries
    if (code.includes('gsap')) {
        deps.push('GSAP');
    }
    if (code.includes('anime.js') || code.includes('anime(')) {
        deps.push('anime.js');
    }
    return deps;
}
//# sourceMappingURL=create-animation.js.map