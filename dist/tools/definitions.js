/**
 * MCP 工具定义
 * 符合 MCP 协议的工具 Schema
 */
import { TOOL_NAMES } from '../config/constants.js';
/**
 * 所有工具的定义
 */
export const TOOL_DEFINITIONS = [
    // 🎨 Tool 1: gemini_generate_ui
    {
        name: TOOL_NAMES.GENERATE_UI,
        description: 'Generate HTML/CSS/JavaScript UI components from description or design image. Specializes in pixel-perfect implementations, responsive layouts, and smooth animations.',
        inputSchema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'Description of the UI component to generate'
                },
                designImage: {
                    type: 'string',
                    description: 'Optional: Design image as file path (e.g., ./images/design.png) or Base64 data URI. File paths will be automatically converted to Base64.'
                },
                framework: {
                    type: 'string',
                    enum: ['vanilla', 'react', 'vue', 'svelte'],
                    description: 'Target framework (default: vanilla)',
                    default: 'vanilla'
                },
                includeAnimation: {
                    type: 'boolean',
                    description: 'Include animations and transitions (default: true)',
                    default: true
                },
                responsive: {
                    type: 'boolean',
                    description: 'Make the UI responsive (default: true)',
                    default: true
                },
                style: {
                    type: 'string',
                    enum: ['modern', 'minimal', 'glassmorphism', 'neumorphism'],
                    description: 'Optional: Design style preference'
                }
            },
            required: ['description']
        }
    },
    // 🖼️ Tool 2: gemini_multimodal_query
    {
        name: TOOL_NAMES.MULTIMODAL_QUERY,
        description: 'Query using images + text for multimodal understanding. Analyze designs, diagrams, screenshots, or any visual content with natural language questions.',
        inputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Question or instruction about the images'
                },
                images: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Images as file paths (e.g., ./images/screenshot.png) or Base64 data URIs. File paths will be automatically converted to Base64.'
                },
                outputFormat: {
                    type: 'string',
                    enum: ['text', 'code', 'json'],
                    description: 'Desired output format (default: text)',
                    default: 'text'
                },
                context: {
                    type: 'string',
                    description: 'Optional: Additional context for better understanding'
                }
            },
            required: ['prompt', 'images']
        }
    },
    // 🐛 Tool 3: gemini_fix_ui_from_screenshot
    {
        name: TOOL_NAMES.FIX_UI,
        description: 'Identify and fix UI issues from screenshots. Diagnoses layout problems, styling issues, responsive failures, and provides targeted code fixes.',
        inputSchema: {
            type: 'object',
            properties: {
                screenshot: {
                    type: 'string',
                    description: 'Screenshot of the UI problem as file path (e.g., ./screenshots/bug.png) or Base64 data URI. File paths will be automatically converted to Base64.'
                },
                currentCode: {
                    type: 'string',
                    description: 'Optional: Current code causing the issue'
                },
                issueDescription: {
                    type: 'string',
                    description: 'Optional: Description of the problem'
                },
                targetState: {
                    type: 'string',
                    description: 'Optional: Expected state description or reference image'
                }
            },
            required: ['screenshot']
        }
    },
    // ✨ Tool 4: gemini_create_animation
    {
        name: TOOL_NAMES.CREATE_ANIMATION,
        description: 'Create interactive animations using CSS, Canvas, WebGL, or Three.js. Generates production-ready animation code with smooth 60fps performance.',
        inputSchema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'Description of the desired animation'
                },
                technology: {
                    type: 'string',
                    enum: ['css', 'canvas', 'webgl', 'threejs'],
                    description: 'Animation technology (default: canvas)',
                    default: 'canvas'
                },
                interactive: {
                    type: 'boolean',
                    description: 'Make it interactive (mouse/touch) (default: true)',
                    default: true
                },
                fps: {
                    type: 'number',
                    description: 'Target frames per second (default: 60)',
                    default: 60
                },
                dimensions: {
                    type: 'object',
                    properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                    },
                    description: 'Optional: Canvas dimensions'
                }
            },
            required: ['description']
        }
    },
    // 📄 Tool 5: gemini_analyze_content
    {
        name: TOOL_NAMES.ANALYZE_CONTENT,
        description: 'Analyze code, documents, or data. Supports summarization, code review, explanation, optimization, and debugging. Auto-detects content type.',
        inputSchema: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'Content to analyze'
                },
                type: {
                    type: 'string',
                    enum: ['code', 'document', 'data', 'auto'],
                    description: 'Content type (default: auto)',
                    default: 'auto'
                },
                task: {
                    type: 'string',
                    enum: ['summarize', 'review', 'explain', 'optimize', 'debug'],
                    description: 'Analysis task (default: summarize)',
                    default: 'summarize'
                },
                language: {
                    type: 'string',
                    description: 'Optional: Programming language (if code)'
                },
                focus: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: Specific areas to focus on'
                },
                outputFormat: {
                    type: 'string',
                    enum: ['text', 'json', 'markdown'],
                    description: 'Output format (default: markdown)',
                    default: 'markdown'
                }
            },
            required: ['content']
        }
    },
    // 📦 Tool 6: gemini_analyze_codebase
    {
        name: TOOL_NAMES.ANALYZE_CODEBASE,
        description: 'Analyze entire codebase using 1M token context. Provides architecture overview, identifies patterns, security issues, performance bottlenecks, and dependency problems.',
        inputSchema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                            content: { type: 'string' }
                        },
                        required: ['path', 'content']
                    },
                    description: 'List of files with their content'
                },
                focus: {
                    type: 'string',
                    enum: ['architecture', 'security', 'performance', 'dependencies', 'patterns'],
                    description: 'Optional: Analysis focus area'
                },
                deepThink: {
                    type: 'boolean',
                    description: 'Enable Deep Think mode for complex analysis (default: false)',
                    default: false
                },
                outputFormat: {
                    type: 'string',
                    enum: ['markdown', 'json'],
                    description: 'Output format (default: markdown)',
                    default: 'markdown'
                }
            },
            required: ['files']
        }
    },
    // 💡 Tool 7: gemini_brainstorm
    {
        name: TOOL_NAMES.BRAINSTORM,
        description: 'Generate creative ideas and solutions. Provides multiple ideas with pros/cons and feasibility assessment.',
        inputSchema: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Topic for brainstorming'
                },
                context: {
                    type: 'string',
                    description: 'Optional: Additional context'
                },
                count: {
                    type: 'number',
                    description: 'Number of ideas to generate (default: 5)',
                    default: 5
                },
                style: {
                    type: 'string',
                    enum: ['innovative', 'practical', 'radical'],
                    description: 'Optional: Brainstorming style'
                }
            },
            required: ['topic']
        }
    },
    // 📋 Tool 8: list_models
    {
        name: TOOL_NAMES.LIST_MODELS,
        description: 'List all available Gemini models with their capabilities, context windows, and use cases.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    }
];
//# sourceMappingURL=definitions.js.map