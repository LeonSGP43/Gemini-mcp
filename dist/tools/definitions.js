/**
 * MCP Tool Definitions
 * Streamlined public tool surface for Codex-oriented Gemini assistants.
 */
import { TOOL_NAMES } from '../config/constants.js';
import { PUBLIC_TOOL_MODELS } from '../config/models.js';
const PRO_DEFAULT_MODEL_PARAMETER = {
    type: 'string',
    enum: [...PUBLIC_TOOL_MODELS],
    description: 'Gemini model to use (optional, default: gemini-3.1-pro-preview)'
};
const FLASH_DEFAULT_MODEL_PARAMETER = {
    type: 'string',
    enum: [...PUBLIC_TOOL_MODELS],
    description: 'Gemini model to use (optional, default: gemini-3-flash-preview for faster ideation)'
};
export const TOOL_DEFINITIONS = [
    {
        name: TOOL_NAMES.BRAINSTORM_ASSIST,
        description: 'High-signal Gemini ideation copilot for Codex. Generates concrete options, tradeoffs, and next steps from a topic plus optional repository context.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                topic: {
                    type: 'string',
                    description: 'Decision, feature area, or problem to explore.'
                },
                goal: {
                    type: 'string',
                    description: 'Optional desired outcome, e.g. choose an architecture or generate implementation directions.'
                },
                context: {
                    type: 'string',
                    description: 'Optional extra context, current state, or background.'
                },
                contextFilePath: {
                    type: 'string',
                    description: 'Optional single file path to ground the brainstorm.'
                },
                contextFiles: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional multiple context files to ground the brainstorm.'
                },
                constraints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional hard constraints the ideas must respect.'
                },
                count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 8,
                    default: 4,
                    description: 'Number of candidate directions to generate.'
                },
                mode: {
                    type: 'string',
                    enum: ['explore', 'refine', 'ship'],
                    default: 'explore',
                    description: 'explore = maximize option diversity; refine = compare strongest options; ship = bias toward execution-ready ideas.'
                },
                model: FLASH_DEFAULT_MODEL_PARAMETER
            },
            required: ['topic']
        }
    },
    {
        name: TOOL_NAMES.ACCEPTANCE_ASSIST,
        description: 'Acceptance and review copilot for Codex. Evaluates files or codebases against explicit acceptance criteria and returns blocking findings, coverage gaps, and a verdict.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                acceptanceCriteria: {
                    type: 'string',
                    description: 'What done means. Include required behavior, constraints, or review ask.'
                },
                context: {
                    type: 'string',
                    description: 'Optional extra scope or rationale for the review.'
                },
                filePath: {
                    type: 'string',
                    description: 'Single file path to inspect.'
                },
                content: {
                    type: 'string',
                    description: 'Inline content to inspect instead of reading from disk.'
                },
                directory: {
                    type: 'string',
                    description: 'Directory path for codebase-level acceptance review.'
                },
                filePaths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific files to inspect together.'
                },
                files: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            path: { type: 'string' },
                            content: { type: 'string' }
                        },
                        required: ['path', 'content']
                    },
                    description: 'Inline file set to inspect.'
                },
                include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Glob patterns to include when directory is used.'
                },
                exclude: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Glob patterns to exclude when directory is used.'
                },
                focus: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['correctness', 'behavior', 'security', 'performance', 'tests', 'maintainability']
                    },
                    description: 'Optional review lenses to emphasize.'
                },
                strictness: {
                    type: 'string',
                    enum: ['standard', 'strict'],
                    default: 'standard',
                    description: 'strict treats missing evidence or missing tests as findings more aggressively.'
                },
                model: PRO_DEFAULT_MODEL_PARAMETER
            },
            required: ['acceptanceCriteria'],
            oneOf: [
                { required: ['filePath'] },
                { required: ['content'] },
                { required: ['directory'] },
                { required: ['filePaths'] },
                { required: ['files'] }
            ]
        }
    }
];
//# sourceMappingURL=definitions.js.map