/**
 * Tool: gemini_acceptance_assist
 * Codex-oriented acceptance and review assistant.
 */

import { GoogleGenAI } from '@google/genai';
import { ACCEPTANCE_FOCUS, ACCEPTANCE_STRICTNESS } from '../config/constants.js';
import { PUBLIC_TOOL_MODELS, PublicToolModel } from '../config/models.js';
import {
  validateArray,
  validateRequired,
  validateString
} from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
import { readDirectory, readFile } from '../utils/file-reader.js';

const MAX_ACCEPTANCE_FILES = 40;
const MAX_ACCEPTANCE_INPUT_BYTES = 250_000;
const DEFAULT_ACCEPTANCE_MODEL: PublicToolModel = 'gemini-3.1-pro-preview';

type AcceptanceFocus = typeof ACCEPTANCE_FOCUS[number];
type AcceptanceStrictness = typeof ACCEPTANCE_STRICTNESS[number];

interface InlineFile {
  path: string;
  content: string;
}

interface ReviewFile {
  path: string;
  content: string;
}

const ACCEPTANCE_ASSIST_SYSTEM_PROMPT = `You are Gemini Acceptance Assist, a skeptical delivery reviewer for Codex.

Your job is to evaluate whether work meets explicit acceptance criteria and to surface concrete gaps.

Rules:
1. Findings come before praise.
2. Distinguish blocking issues from non-blocking issues.
3. Prefer evidence from the provided files over speculation.
4. If coverage is incomplete, say so explicitly.
5. Return valid JSON only.`;

export interface AcceptanceAssistParams {
  acceptanceCriteria: string;
  context?: string;
  filePath?: string;
  content?: string;
  directory?: string;
  filePaths?: string[];
  files?: InlineFile[];
  include?: string[];
  exclude?: string[];
  focus?: AcceptanceFocus[];
  strictness?: AcceptanceStrictness;
  model?: PublicToolModel;
}

export interface AcceptanceFinding {
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface AcceptanceAssistResult {
  verdict: 'pass' | 'needs_work' | 'fail';
  summary: string;
  blockingFindings: AcceptanceFinding[];
  nonBlockingFindings: AcceptanceFinding[];
  coverageGaps: string[];
  recommendedNextSteps: string[];
  metadata: {
    modelUsed: PublicToolModel;
    thinkingLevel: 'low' | 'high';
    strictness: AcceptanceStrictness;
    targetType: 'file' | 'content' | 'codebase';
    filesAnalyzed: number;
    bytesAnalyzed: number;
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

function normalizeFinding(finding: any, fallbackTitle: string): AcceptanceFinding {
  return {
    title: typeof finding?.title === 'string' && finding.title.trim() ? finding.title : fallbackTitle,
    severity: finding?.severity === 'high' || finding?.severity === 'medium' || finding?.severity === 'low'
      ? finding.severity
      : 'medium',
    description: typeof finding?.description === 'string'
      ? finding.description
      : 'No description provided.',
    location: typeof finding?.location === 'string' ? finding.location : undefined,
    suggestion: typeof finding?.suggestion === 'string' ? finding.suggestion : undefined
  };
}

async function readExplicitFiles(filePaths: string[]): Promise<ReviewFile[]> {
  const files = await Promise.all(filePaths.map(filePath => readFile(filePath)));
  return files.map(file => ({
    path: file.path,
    content: file.content
  }));
}

async function collectReviewFiles(params: AcceptanceAssistParams): Promise<{
  targetType: 'file' | 'content' | 'codebase';
  files: ReviewFile[];
}> {
  const providedInputCount = [
    params.filePath,
    params.content,
    params.directory,
    params.filePaths && params.filePaths.length > 0 ? 'filePaths' : undefined,
    params.files && params.files.length > 0 ? 'files' : undefined
  ].filter(Boolean).length;

  if (providedInputCount === 0) {
    throw new Error(
      'One input source is required: filePath, content, directory, filePaths, or files.'
    );
  }

  if (providedInputCount > 1) {
    throw new Error(
      'Provide exactly one input source. Do not mix filePath, content, directory, filePaths, and files in one request.'
    );
  }

  if (params.filePath) {
    const file = await readFile(params.filePath);
    return {
      targetType: 'file',
      files: [{ path: file.path, content: file.content }]
    };
  }

  if (params.content) {
    validateString(params.content, 'content', 10);
    return {
      targetType: 'content',
      files: [{ path: 'inline-content.txt', content: params.content }]
    };
  }

  if (params.directory) {
    const directoryFiles = await readDirectory(params.directory, {
      include: params.include,
      exclude: params.exclude,
      maxFiles: MAX_ACCEPTANCE_FILES
    });

    return {
      targetType: 'codebase',
      files: directoryFiles.map(file => ({
        path: file.path,
        content: file.content
      }))
    };
  }

  if (params.filePaths && params.filePaths.length > 0) {
    if (params.filePaths.length > MAX_ACCEPTANCE_FILES) {
      throw new Error(`filePaths supports up to ${MAX_ACCEPTANCE_FILES} files per request.`);
    }

    return {
      targetType: params.filePaths.length === 1 ? 'file' : 'codebase',
      files: await readExplicitFiles(params.filePaths)
    };
  }

  validateArray(params.files, 'files', 1);
  if (params.files!.length > MAX_ACCEPTANCE_FILES) {
    throw new Error(`files supports up to ${MAX_ACCEPTANCE_FILES} items per request.`);
  }

  const inlineFiles = params.files!.map((file, index) => {
    if (!file?.path || typeof file.path !== 'string') {
      throw new Error(`files[${index}].path is required and must be a string.`);
    }
    if (!file?.content || typeof file.content !== 'string') {
      throw new Error(`files[${index}].content is required and must be a string.`);
    }

    return {
      path: file.path,
      content: file.content
    };
  });

  return {
    targetType: inlineFiles.length === 1 ? 'file' : 'codebase',
    files: inlineFiles
  };
}

function buildAcceptancePrompt(
  params: AcceptanceAssistParams,
  files: ReviewFile[],
  strictness: AcceptanceStrictness
): string {
  const lines: string[] = [
    '# Acceptance Assist Request',
    '',
    '## Acceptance Criteria',
    params.acceptanceCriteria,
    ''
  ];

  if (params.context) {
    lines.push('## Extra Context', params.context, '');
  }

  if (params.focus && params.focus.length > 0) {
    lines.push('## Focus Areas');
    for (const focus of params.focus) {
      lines.push(`- ${focus}`);
    }
    lines.push('');
  }

  lines.push(
    '## Review Mode',
    `- Strictness: ${strictness}`,
    strictness === 'strict'
      ? '- Treat missing evidence, missing tests, and ambiguous behavior as findings.'
      : '- Use normal engineering judgment; do not invent issues without evidence.',
    ''
  );

  lines.push(
    '## Files Under Review',
    `- Total files: ${files.length}`,
    ''
  );

  for (const file of files) {
    lines.push(`### ${file.path}`, '```', file.content, '```', '');
  }

  lines.push(
    '## Return JSON',
    '{',
    '  "verdict": "pass" | "needs_work" | "fail",',
    '  "summary": "Short review summary",',
    '  "blockingFindings": [',
    '    {',
    '      "title": "Blocking issue title",',
    '      "severity": "high" | "medium" | "low",',
    '      "description": "Why this blocks acceptance",',
    '      "location": "Optional file path or line reference",',
    '      "suggestion": "Concrete fix suggestion"',
    '    }',
    '  ],',
    '  "nonBlockingFindings": [',
    '    {',
    '      "title": "Non-blocking issue title",',
    '      "severity": "high" | "medium" | "low",',
    '      "description": "Why it matters",',
    '      "location": "Optional file path or line reference",',
    '      "suggestion": "Concrete fix suggestion"',
    '    }',
    '  ],',
    '  "coverageGaps": ["Any area you could not confidently assess"],',
    '  "recommendedNextSteps": ["Ordered next steps for the coding agent"]',
    '}'
  );

  return lines.join('\n');
}

export async function handleAcceptanceAssist(
  params: AcceptanceAssistParams,
  apiKey: string
): Promise<AcceptanceAssistResult> {
  try {
    validateRequired(params.acceptanceCriteria, 'acceptanceCriteria');
    validateString(params.acceptanceCriteria, 'acceptanceCriteria', 5);

    if (params.context) {
      validateString(params.context, 'context', 3);
    }
    if (params.focus) {
      validateArray(params.focus, 'focus', 1);
      for (const focus of params.focus) {
        if (!ACCEPTANCE_FOCUS.includes(focus)) {
          throw new Error(`Invalid focus: ${focus}. Must be one of: ${ACCEPTANCE_FOCUS.join(', ')}`);
        }
      }
    }
    if (params.strictness && !ACCEPTANCE_STRICTNESS.includes(params.strictness)) {
      throw new Error(
        `Invalid strictness: ${params.strictness}. Must be one of: ${ACCEPTANCE_STRICTNESS.join(', ')}`
      );
    }
    if (params.model && !PUBLIC_TOOL_MODELS.includes(params.model)) {
      throw new Error(`Invalid model: ${params.model}. Must be one of: ${PUBLIC_TOOL_MODELS.join(', ')}`);
    }

    const strictness: AcceptanceStrictness = params.strictness || 'standard';
    const model = params.model || DEFAULT_ACCEPTANCE_MODEL;
    const { targetType, files } = await collectReviewFiles(params);
    const bytesAnalyzed = files.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0);

    if (bytesAnalyzed > MAX_ACCEPTANCE_INPUT_BYTES) {
      throw new Error(
        `Acceptance input exceeds ${MAX_ACCEPTANCE_INPUT_BYTES} bytes. Narrow the scope or review fewer files at once.`
      );
    }

    const thinkingLevel: 'low' | 'high' =
      strictness === 'strict' || files.length > 1 || targetType === 'codebase' ? 'high' : 'low';

    const prompt = buildAcceptancePrompt(params, files, strictness);
    const ai = new GoogleGenAI({ apiKey });
    const config: any = {
      responseMimeType: 'application/json',
      systemInstruction: ACCEPTANCE_ASSIST_SYSTEM_PROMPT,
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
    const parsed = parseJsonResponse<Partial<AcceptanceAssistResult>>(responseText);
    const blockingFindings = Array.isArray(parsed?.blockingFindings)
      ? parsed!.blockingFindings.map((finding, index) => normalizeFinding(finding, `Blocking finding ${index + 1}`))
      : [];
    const nonBlockingFindings = Array.isArray(parsed?.nonBlockingFindings)
      ? parsed!.nonBlockingFindings.map((finding, index) => normalizeFinding(finding, `Non-blocking finding ${index + 1}`))
      : [];
    const verdict = parsed?.verdict === 'pass' || parsed?.verdict === 'needs_work' || parsed?.verdict === 'fail'
      ? parsed.verdict
      : (blockingFindings.length > 0 ? 'needs_work' : 'pass');

    return {
      verdict,
      summary: typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary : responseText,
      blockingFindings,
      nonBlockingFindings,
      coverageGaps: Array.isArray(parsed?.coverageGaps) ? parsed!.coverageGaps.map(String) : [],
      recommendedNextSteps: Array.isArray(parsed?.recommendedNextSteps)
        ? parsed!.recommendedNextSteps.map(String)
        : [],
      metadata: {
        modelUsed: model,
        thinkingLevel,
        strictness,
        targetType,
        filesAnalyzed: files.length,
        bytesAnalyzed
      }
    };
  } catch (error: any) {
    logError('acceptanceAssist', error);
    throw handleAPIError(error);
  }
}
