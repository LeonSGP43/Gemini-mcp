/**
 * Tool 1: gemini_generate_ui
 * Generate HTML/CSS/JavaScript UI components from description or design image
 * Priority: P0 - Core functionality
 */

import { GeminiClient } from '../utils/gemini-client.js';
import {
  validateRequired,
  validateString,
  validateFramework,
  validateUIStyle,
  validateBoolean
} from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
import { readFile } from '../utils/file-reader.js';

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
 * Tech stack context interface
 * Used to specify the technology stack for code generation
 */
export interface TechContext {
  /** CSS framework, such as tailwind, bootstrap, etc. */
  cssFramework?: 'tailwind' | 'bootstrap' | 'styled-components' | 'css-modules' | 'emotion';
  /** UI component library, such as shadcn, antd, etc. */
  uiLibrary?: 'shadcn' | 'antd' | 'mui' | 'chakra' | 'radix';
  /** Whether to use TypeScript */
  typescript?: boolean;
  /** State management library */
  stateManagement?: 'zustand' | 'redux' | 'jotai' | 'recoil';
}

export interface GenerateUIParams {
  description: string;
  designImage?: string;
  framework?: 'vanilla' | 'react' | 'vue' | 'svelte';
  includeAnimation?: boolean;
  responsive?: boolean;
  style?: 'modern' | 'minimal' | 'glassmorphism' | 'neumorphism';

  // [NEW] Tech stack context
  techContext?: TechContext;

  // [NEW] Config file path, automatically detect tech stack
  configPath?: string;
}

export interface GenerateUIResult {
  code: string;
  framework: string;
  files?: Record<string, string>;
  preview?: string;
  /** Detected tech stack information */
  detectedTechContext?: TechContext;
}

/**
 * Build additional prompts based on tech stack context
 * @param techContext Tech stack context
 * @returns Tech stack related prompts
 */
function buildTechContextPrompt(techContext: TechContext): string {
  const parts: string[] = [];
  parts.push('\n## Tech Stack Requirements\n');

  if (techContext.cssFramework) {
    switch (techContext.cssFramework) {
      case 'tailwind':
        parts.push('- CSS Framework: Use Tailwind CSS class names, do not write native CSS styles, use Tailwind responsive prefixes (sm:, md:, lg:)\n');
        break;
      case 'bootstrap':
        parts.push('- CSS Framework: Use Bootstrap class names and components\n');
        break;
      case 'styled-components':
        parts.push('- CSS Framework: Use styled-components, create styled components\n');
        break;
      case 'css-modules':
        parts.push('- CSS Framework: Use CSS Modules, create .module.css files\n');
        break;
      case 'emotion':
        parts.push('- CSS Framework: Use Emotion, use css prop or styled API\n');
        break;
    }
  }

  if (techContext.uiLibrary) {
    switch (techContext.uiLibrary) {
      case 'shadcn':
        parts.push('- UI Component Library: Use shadcn/ui components, follow shadcn naming conventions and structure, import from @/components/ui\n');
        break;
      case 'antd':
        parts.push('- UI Component Library: Use Ant Design components, import from antd\n');
        break;
      case 'mui':
        parts.push('- UI Component Library: Use Material-UI (MUI) components, import from @mui/material\n');
        break;
      case 'chakra':
        parts.push('- UI Component Library: Use Chakra UI components, import from @chakra-ui/react\n');
        break;
      case 'radix':
        parts.push('- UI Component Library: Use Radix UI primitive components, import from @radix-ui\n');
        break;
    }
  }

  if (techContext.typescript) {
    parts.push('- Language: Use TypeScript, add complete type definitions and Props interfaces\n');
  }

  if (techContext.stateManagement) {
    switch (techContext.stateManagement) {
      case 'zustand':
        parts.push('- State Management: If state management is needed, use Zustand\n');
        break;
      case 'redux':
        parts.push('- State Management: If state management is needed, use Redux Toolkit\n');
        break;
      case 'jotai':
        parts.push('- State Management: If state management is needed, use Jotai\n');
        break;
      case 'recoil':
        parts.push('- State Management: If state management is needed, use Recoil\n');
        break;
    }
  }

  return parts.join('');
}

/**
 * Automatically detect tech stack from package.json
 * @param configPath package.json file path
 * @returns Detected tech stack context
 */
async function detectTechStackFromConfig(configPath: string): Promise<TechContext> {
  try {
    const fileContent = await readFile(configPath);
    const pkg = JSON.parse(fileContent.content);
    const deps: Record<string, string> = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    const techContext: TechContext = {};

    // Detect CSS framework
    if (deps['tailwindcss']) {
      techContext.cssFramework = 'tailwind';
    } else if (deps['bootstrap'] || deps['react-bootstrap']) {
      techContext.cssFramework = 'bootstrap';
    } else if (deps['styled-components']) {
      techContext.cssFramework = 'styled-components';
    } else if (deps['@emotion/react'] || deps['@emotion/styled']) {
      techContext.cssFramework = 'emotion';
    }

    // Detect UI library (Note: shadcn is usually not in dependencies, detected via class-variance-authority)
    if (deps['class-variance-authority'] || deps['@radix-ui/react-dialog']) {
      techContext.uiLibrary = 'shadcn';
    } else if (deps['antd']) {
      techContext.uiLibrary = 'antd';
    } else if (deps['@mui/material']) {
      techContext.uiLibrary = 'mui';
    } else if (deps['@chakra-ui/react']) {
      techContext.uiLibrary = 'chakra';
    }

    // Detect TypeScript
    techContext.typescript = !!deps['typescript'];

    // Detect state management
    if (deps['zustand']) {
      techContext.stateManagement = 'zustand';
    } else if (deps['@reduxjs/toolkit'] || deps['redux']) {
      techContext.stateManagement = 'redux';
    } else if (deps['jotai']) {
      techContext.stateManagement = 'jotai';
    } else if (deps['recoil']) {
      techContext.stateManagement = 'recoil';
    }

    return techContext;
  } catch (error) {
    // If unable to read or parse config file, return empty object
    logError('detectTechStackFromConfig', error);
    return {};
  }
}

/**
 * Handle gemini_generate_ui tool call
 */
export async function handleGenerateUI(
  params: GenerateUIParams,
  client: GeminiClient
): Promise<GenerateUIResult> {
  try {
    // Validate required parameters
    validateRequired(params.description, 'description');
    validateString(params.description, 'description', 10);

    // Validate optional parameters
    const framework = params.framework || 'vanilla';
    const includeAnimation = params.includeAnimation !== false; // Default true
    const responsive = params.responsive !== false; // Default true

    if (params.framework) {
      validateFramework(params.framework);
    }
    if (params.style) {
      validateUIStyle(params.style);
    }

    // [NEW] Handle tech stack context
    let techContext: TechContext = {};
    let detectedTechContext: TechContext | undefined;

    // If configPath is provided, automatically detect tech stack
    if (params.configPath) {
      detectedTechContext = await detectTechStackFromConfig(params.configPath);
      techContext = { ...detectedTechContext };
    }

    // If techContext is provided, override auto-detected values
    if (params.techContext) {
      techContext = { ...techContext, ...params.techContext };
    }

    // Build prompt
    let prompt = `Generate a ${framework} UI component based on the following requirements:\n\n`;
    prompt += `Description: ${params.description}\n\n`;

    if (params.style) {
      prompt += `Design Style: ${params.style}\n`;
    }

    prompt += `Framework: ${framework}\n`;
    prompt += `Include Animations: ${includeAnimation ? 'Yes' : 'No'}\n`;
    prompt += `Responsive: ${responsive ? 'Yes' : 'No'}\n`;

    // [NEW] Add tech stack context to prompt
    const hasTechContext = techContext.cssFramework || techContext.uiLibrary ||
                           techContext.typescript || techContext.stateManagement;
    if (hasTechContext) {
      prompt += buildTechContextPrompt(techContext);
    }

    prompt += '\n';

    if (framework === 'vanilla') {
      prompt += `Please provide a complete HTML file with inline CSS and JavaScript.\n`;
    } else {
      // Adjust output requirements based on TypeScript setting
      if (techContext.typescript) {
        prompt += `Please provide a complete ${framework} component with TypeScript (.tsx) and all necessary imports.\n`;
      } else {
        prompt += `Please provide a complete ${framework} component with all necessary imports.\n`;
      }
    }

    prompt += `Return ONLY the code, no explanations.`;

    // Call Gemini API
    let code: string;

    if (params.designImage) {
      // Multimodal: text + image
      code = await client.generateMultimodal(
        prompt,
        [params.designImage],
        {
          systemInstruction: UI_GENERATION_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 8192
        }
      );
    } else {
      // Text only
      code = await client.generate(
        prompt,
        {
          systemInstruction: UI_GENERATION_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 8192
        }
      );
    }

    // Clean code output (remove markdown code blocks)
    code = cleanCodeOutput(code);

    // For React/Vue/Svelte, there may be multiple files
    const files = framework !== 'vanilla' ? extractFiles(code, framework, techContext.typescript) : undefined;

    return {
      code,
      framework,
      files,
      preview: framework === 'vanilla' ? code : undefined,
      // [NEW] Return detected tech stack information
      detectedTechContext: detectedTechContext
    };

  } catch (error: any) {
    logError('generateUI', error);
    throw handleAPIError(error);
  }
}

/**
 * Clean code output (remove markdown code blocks)
 */
function cleanCodeOutput(code: string): string {
  // Remove markdown code blocks
  code = code.replace(/```[a-z]*\n/g, '');
  code = code.replace(/```\n?/g, '');

  // Trim whitespace
  return code.trim();
}

/**
 * Extract multiple files from code (for React/Vue/Svelte)
 * @param code Generated code
 * @param framework Framework type
 * @param useTypescript Whether to use TypeScript
 */
function extractFiles(code: string, framework: string, useTypescript?: boolean): Record<string, string> | undefined {
  // Currently returns a single file
  // Future: can parse multi-file content returned by Gemini
  let extension: string;

  if (framework === 'react') {
    extension = useTypescript ? 'tsx' : 'jsx';
  } else if (framework === 'vue') {
    extension = 'vue';
  } else if (framework === 'svelte') {
    extension = 'svelte';
  } else {
    extension = useTypescript ? 'ts' : 'js';
  }

  return {
    [`Component.${extension}`]: code
  };
}
