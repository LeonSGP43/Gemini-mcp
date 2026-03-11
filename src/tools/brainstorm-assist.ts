/**
 * Tool: gemini_brainstorm_assist
 * Codex-oriented brainstorming assistant focused on actionable ideas.
 */

import { GoogleGenAI } from '@google/genai';
import { BRAINSTORM_MODES } from '../config/constants.js';
import { PUBLIC_TOOL_MODELS, PublicToolModel } from '../config/models.js';
import {
  validateArray,
  validateNumber,
  validateRequired,
  validateString
} from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
import { readFile } from '../utils/file-reader.js';

const MAX_CONTEXT_BYTES = 120_000;
const DEFAULT_IDEA_COUNT = 4;
const DEFAULT_MODEL: PublicToolModel = 'gemini-3-flash-preview';

const BRAINSTORM_ASSIST_SYSTEM_PROMPT = `You are Gemini Brainstorm Assist, a high-signal product and engineering ideation copilot for Codex.

Your job is to help a coding agent think better, not to produce generic inspiration.

Rules:
1. Generate concrete options, not vague themes.
2. Surface tradeoffs and execution risks clearly.
3. Bias toward ideas that can actually be implemented.
4. Respect user constraints and repository context.
5. Recommend one strongest direction when the evidence supports it.
6. Return valid JSON only.`;

type BrainstormMode = typeof BRAINSTORM_MODES[number];

export interface BrainstormAssistParams {
  topic: string;
  goal?: string;
  context?: string;
  contextFilePath?: string;
  contextFiles?: string[];
  constraints?: string[];
  count?: number;
  mode?: BrainstormMode;
  model?: PublicToolModel;
}

export interface BrainstormAssistIdea {
  title: string;
  rationale: string;
  benefits: string[];
  risks: string[];
  implementationOutline: string[];
}

export interface BrainstormAssistResult {
  topic: string;
  mode: BrainstormMode;
  summary: string;
  recommendedDirection: string;
  ideas: BrainstormAssistIdea[];
  nextSteps: string[];
  contextFilesUsed?: string[];
  metadata: {
    totalIdeas: number;
    modelUsed: PublicToolModel;
    thinkingLevel: 'low' | 'high';
  };
}

function parseJsonResponse<T>(responseText: string): T | null {
  try {
    return JSON.parse(responseText) as T;
  } catch {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[1].trim()) as T;
    } catch {
      return null;
    }
  }
}

async function loadContextFiles(params: BrainstormAssistParams): Promise<{
  contextFilesUsed: string[];
  contextSnippet?: string;
}> {
  const requestedPaths = [
    ...(params.contextFilePath ? [params.contextFilePath] : []),
    ...(params.contextFiles || [])
  ];

  if (requestedPaths.length === 0) {
    return { contextFilesUsed: [] };
  }

  const sections: string[] = [];
  const contextFilesUsed: string[] = [];
  let totalBytes = 0;

  for (const filePath of requestedPaths) {
    const file = await readFile(filePath);
    totalBytes += Buffer.byteLength(file.content, 'utf8');

    if (totalBytes > MAX_CONTEXT_BYTES) {
      throw new Error(
        `Context files exceed ${MAX_CONTEXT_BYTES} bytes. Narrow the context files or trim their content.`
      );
    }

    contextFilesUsed.push(file.path);
    sections.push(`### ${file.path}\n${file.content}`);
  }

  return {
    contextFilesUsed,
    contextSnippet: sections.join('\n\n')
  };
}

function buildBrainstormPrompt(
  params: BrainstormAssistParams,
  mode: BrainstormMode,
  count: number,
  contextSnippet?: string
): string {
  const lines: string[] = [
    '# Brainstorm Assist Request',
    '',
    `## Topic`,
    params.topic,
    ''
  ];

  if (params.goal) {
    lines.push('## Goal', params.goal, '');
  }

  if (params.context) {
    lines.push('## Context', params.context, '');
  }

  if (params.constraints && params.constraints.length > 0) {
    lines.push('## Constraints');
    for (const constraint of params.constraints) {
      lines.push(`- ${constraint}`);
    }
    lines.push('');
  }

  if (contextSnippet) {
    lines.push('## Repository Context', contextSnippet, '');
  }

  lines.push(
    '## Output Requirements',
    `- Generate exactly ${count} candidate directions`,
    `- Mode: ${mode}`,
    '- Favor technically grounded options over generic strategy talk',
    '- Recommend one best direction and explain why',
    ''
  );

  switch (mode) {
    case 'explore':
      lines.push(
        '## Mode Guidance',
        '- Maximize diversity of approaches',
        '- Cover different technical and product angles',
        '- Make tradeoffs explicit',
        ''
      );
      break;
    case 'refine':
      lines.push(
        '## Mode Guidance',
        '- Focus on the strongest few approaches',
        '- Compare them directly on cost, speed, and risk',
        '- Bias toward clear recommendation quality',
        ''
      );
      break;
    case 'ship':
      lines.push(
        '## Mode Guidance',
        '- Prioritize execution-ready ideas',
        '- Prefer smaller, testable changes and rollout steps',
        '- Call out what can be done next in code',
        ''
      );
      break;
  }

  lines.push(
    '## Return JSON',
    '{',
    '  "summary": "Short synthesis of the brainstorm",',
    '  "recommendedDirection": "Single recommended direction",',
    '  "ideas": [',
    '    {',
    '      "title": "Idea title",',
    '      "rationale": "Why this idea matters",',
    '      "benefits": ["benefit 1"],',
    '      "risks": ["risk 1"],',
    '      "implementationOutline": ["step 1", "step 2"]',
    '    }',
    '  ],',
    '  "nextSteps": ["next step 1", "next step 2"]',
    '}'
  );

  return lines.join('\n');
}

export async function handleBrainstormAssist(
  params: BrainstormAssistParams,
  apiKey: string
): Promise<BrainstormAssistResult> {
  try {
    validateRequired(params.topic, 'topic');
    validateString(params.topic, 'topic', 3);

    if (params.goal) {
      validateString(params.goal, 'goal', 3);
    }
    if (params.context) {
      validateString(params.context, 'context', 3);
    }
    if (params.constraints) {
      validateArray(params.constraints, 'constraints', 1);
      for (const constraint of params.constraints) {
        validateString(constraint, 'constraints[]', 1);
      }
    }
    if (params.count !== undefined) {
      validateNumber(params.count, 'count', 1, 8);
    }
    if (params.mode && !BRAINSTORM_MODES.includes(params.mode)) {
      throw new Error(`Invalid mode: ${params.mode}. Must be one of: ${BRAINSTORM_MODES.join(', ')}`);
    }
    if (params.model && !PUBLIC_TOOL_MODELS.includes(params.model)) {
      throw new Error(`Invalid model: ${params.model}. Must be one of: ${PUBLIC_TOOL_MODELS.join(', ')}`);
    }

    const mode: BrainstormMode = params.mode || 'explore';
    const count = params.count || DEFAULT_IDEA_COUNT;
    const model = params.model || DEFAULT_MODEL;
    const thinkingLevel: 'low' | 'high' = mode === 'explore' ? 'low' : 'high';
    const { contextFilesUsed, contextSnippet } = await loadContextFiles(params);

    const prompt = buildBrainstormPrompt(params, mode, count, contextSnippet);
    const ai = new GoogleGenAI({ apiKey });
    const config: any = {
      responseMimeType: 'application/json',
      systemInstruction: BRAINSTORM_ASSIST_SYSTEM_PROMPT,
      thinkingConfig: { thinkingLevel }
    };

    const response = await ai.models.generateContent({
      model,
      config,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    });

    const responseText = response.text || '';
    const parsed = parseJsonResponse<Partial<BrainstormAssistResult>>(responseText);
    const ideas = Array.isArray(parsed?.ideas)
      ? parsed!.ideas
          .slice(0, count)
          .map((idea: any, index: number): BrainstormAssistIdea => ({
            title: typeof idea?.title === 'string' && idea.title.trim() ? idea.title : `Idea ${index + 1}`,
            rationale: typeof idea?.rationale === 'string' ? idea.rationale : 'No rationale provided.',
            benefits: Array.isArray(idea?.benefits) ? idea.benefits.map(String) : [],
            risks: Array.isArray(idea?.risks) ? idea.risks.map(String) : [],
            implementationOutline: Array.isArray(idea?.implementationOutline)
              ? idea.implementationOutline.map(String)
              : []
          }))
      : [];

    return {
      topic: params.topic,
      mode,
      summary: typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary
        : responseText,
      recommendedDirection: typeof parsed?.recommendedDirection === 'string'
        ? parsed.recommendedDirection
        : 'No recommendation extracted.',
      ideas,
      nextSteps: Array.isArray(parsed?.nextSteps) ? parsed!.nextSteps.map(String) : [],
      contextFilesUsed: contextFilesUsed.length > 0 ? contextFilesUsed : undefined,
      metadata: {
        totalIdeas: ideas.length,
        modelUsed: model,
        thinkingLevel
      }
    };
  } catch (error: any) {
    logError('brainstormAssist', error);
    throw handleAPIError(error);
  }
}
