/**
 * Tool: gemini_video_analyze
 * Video understanding and analysis using Gemini multimodal capabilities
 */
import { GoogleGenAI } from '@google/genai';
import { validateRequired, validateString, validateArray, validateNumber, validateBoolean } from '../utils/validators.js';
import { handleAPIError, logError } from '../utils/error-handler.js';
const VIDEO_ANALYZE_SYSTEM_PROMPT = `You are a professional video understanding analyst.

Analyze videos with strong temporal reasoning and visual precision:
1. Capture key events in chronological order
2. Identify important entities, actions, and scene transitions
3. Reference timestamps when useful
4. Distinguish observations from inferences
5. Be explicit about uncertainty if evidence is limited

When requested, provide:
- Summaries
- Scene breakdowns
- Action/behavior analysis
- UI flow analysis from screen recordings
- Structured extraction in JSON

Output should be accurate, concise, and actionable.`;
const DURATION_PATTERN = /^\d+(?:\.\d+)?s$/;
const VIDEO_MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpg',
    '.mov': 'video/mov',
    '.avi': 'video/avi',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.wmv': 'video/wmv',
    '.3gp': 'video/3gpp',
    '.3gpp': 'video/3gpp',
    '.m4v': 'video/mp4'
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isYouTubeUrl(value) {
    try {
        const url = new URL(value);
        return (url.hostname.includes('youtube.com') ||
            url.hostname.includes('youtu.be'));
    }
    catch {
        return false;
    }
}
function isHttpUrl(value) {
    return value.startsWith('http://') || value.startsWith('https://');
}
function inferVideoMimeType(filePath) {
    const fileExtension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    return VIDEO_MIME_TYPES[fileExtension] || 'video/mp4';
}
function parseVideoDataUri(videoDataUri) {
    const match = videoDataUri.match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid video data URI. Expected format: data:video/*;base64,...');
    }
    return {
        mimeType: match[1],
        data: match[2]
    };
}
function buildVideoMetadata(params) {
    const videoMetadata = {};
    if (params.fps !== undefined) {
        videoMetadata.fps = params.fps;
    }
    if (params.startOffset) {
        videoMetadata.startOffset = params.startOffset;
    }
    if (params.endOffset) {
        videoMetadata.endOffset = params.endOffset;
    }
    return Object.keys(videoMetadata).length > 0 ? videoMetadata : undefined;
}
function parseDurationSeconds(duration) {
    return Number(duration.slice(0, -1));
}
async function uploadAndWaitForVideoReady(ai, videoPath, pollIntervalMs, maxPollAttempts) {
    let file = await ai.files.upload({
        file: videoPath,
        config: {
            mimeType: inferVideoMimeType(videoPath)
        }
    });
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        const state = file.state?.toString();
        if (state === 'ACTIVE') {
            if (!file.uri || !file.mimeType) {
                throw new Error(`Uploaded video is ACTIVE but missing uri/mimeType: ${videoPath}`);
            }
            return {
                uri: file.uri,
                mimeType: file.mimeType,
                name: file.name
            };
        }
        if (state === 'FAILED') {
            const reason = file.error?.message || 'unknown processing error';
            throw new Error(`Video processing failed for "${videoPath}": ${reason}`);
        }
        if (!file.name) {
            throw new Error(`Uploaded video is missing file name: ${videoPath}`);
        }
        await sleep(pollIntervalMs);
        file = await ai.files.get({ name: file.name });
    }
    throw new Error(`Video processing timeout for "${videoPath}" after ${maxPollAttempts} poll attempts`);
}
async function cleanupUploadedFiles(ai, fileNames) {
    const deletions = fileNames.map(async (fileName) => {
        try {
            await ai.files.delete({ name: fileName });
        }
        catch (error) {
            logError(`videoAnalyze:cleanup:${fileName}`, error);
        }
    });
    await Promise.all(deletions);
}
function validateVideoAnalyzeParams(params) {
    validateRequired(params.prompt, 'prompt');
    validateString(params.prompt, 'prompt', 3);
    validateRequired(params.videos, 'videos');
    validateArray(params.videos, 'videos', 1);
    if (params.videos.length > 10) {
        throw new Error('videos supports up to 10 items per request');
    }
    if (params.context) {
        validateString(params.context, 'context', 2);
    }
    if (params.fps !== undefined) {
        validateNumber(params.fps, 'fps', 0.01, 24);
    }
    if (params.startOffset && !DURATION_PATTERN.test(params.startOffset)) {
        throw new Error('startOffset must be Duration format, e.g. "40s" or "12.5s"');
    }
    if (params.endOffset && !DURATION_PATTERN.test(params.endOffset)) {
        throw new Error('endOffset must be Duration format, e.g. "80s" or "42.75s"');
    }
    if (params.startOffset && params.endOffset) {
        const start = parseDurationSeconds(params.startOffset);
        const end = parseDurationSeconds(params.endOffset);
        if (start >= end) {
            throw new Error('startOffset must be smaller than endOffset');
        }
    }
    if (params.pollIntervalMs !== undefined) {
        validateNumber(params.pollIntervalMs, 'pollIntervalMs', 500, 60000);
    }
    if (params.maxPollAttempts !== undefined) {
        validateNumber(params.maxPollAttempts, 'maxPollAttempts', 1, 3600);
    }
    if (params.deleteUploadedFiles !== undefined) {
        validateBoolean(params.deleteUploadedFiles, 'deleteUploadedFiles');
    }
    const validFormats = ['text', 'json', 'markdown'];
    if (params.outputFormat && !validFormats.includes(params.outputFormat)) {
        throw new Error(`Invalid outputFormat: ${params.outputFormat}. Must be one of: ${validFormats.join(', ')}`);
    }
    const validMediaResolutions = [
        'MEDIA_RESOLUTION_UNSPECIFIED',
        'MEDIA_RESOLUTION_LOW',
        'MEDIA_RESOLUTION_MEDIUM',
        'MEDIA_RESOLUTION_HIGH'
    ];
    if (params.mediaResolution && !validMediaResolutions.includes(params.mediaResolution)) {
        throw new Error(`Invalid mediaResolution: ${params.mediaResolution}. Must be one of: ${validMediaResolutions.join(', ')}`);
    }
}
function buildVideoPrompt(params, outputFormat) {
    let prompt = params.prompt;
    if (params.context) {
        prompt = `Context: ${params.context}\n\nTask: ${params.prompt}`;
    }
    if (outputFormat === 'json') {
        prompt += `\n\nReturn valid JSON with keys: summary, timeline, keyEvents, entities, answer.`;
    }
    else if (outputFormat === 'markdown') {
        prompt += `\n\nUse Markdown with clear headings and bullet lists.`;
    }
    return prompt;
}
async function buildVideoPart(ai, videoInput, videoMetadata, pollIntervalMs, maxPollAttempts, uploadedFileNames) {
    if (videoInput.startsWith('data:')) {
        const { mimeType, data } = parseVideoDataUri(videoInput);
        const part = {
            inlineData: { mimeType, data }
        };
        if (videoMetadata) {
            part.videoMetadata = videoMetadata;
        }
        return { part, sourceType: 'inline_base64' };
    }
    if (isYouTubeUrl(videoInput)) {
        const part = {
            fileData: {
                fileUri: videoInput,
                mimeType: 'video/*'
            }
        };
        if (videoMetadata) {
            part.videoMetadata = videoMetadata;
        }
        return { part, sourceType: 'youtube_url' };
    }
    if (isHttpUrl(videoInput)) {
        throw new Error('Only YouTube URLs are supported for URL video input. Use local file path or data URI for other videos.');
    }
    const uploaded = await uploadAndWaitForVideoReady(ai, videoInput, pollIntervalMs, maxPollAttempts);
    if (uploaded.name) {
        uploadedFileNames.push(uploaded.name);
    }
    const part = {
        fileData: {
            fileUri: uploaded.uri,
            mimeType: uploaded.mimeType
        }
    };
    if (videoMetadata) {
        part.videoMetadata = videoMetadata;
    }
    return { part, sourceType: 'local_file' };
}
export async function handleVideoAnalyze(params, apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const uploadedFileNames = [];
    try {
        validateVideoAnalyzeParams(params);
        const outputFormat = params.outputFormat || 'text';
        const thinkingLevel = params.thinkingLevel || 'high';
        const model = params.model || 'gemini-3.1-pro-preview';
        const pollIntervalMs = params.pollIntervalMs || 5000;
        const maxPollAttempts = params.maxPollAttempts || 60;
        const videoMetadata = buildVideoMetadata(params);
        const prompt = buildVideoPrompt(params, outputFormat);
        const videoParts = [];
        const sourceTypes = [];
        for (const videoInput of params.videos) {
            const { part, sourceType } = await buildVideoPart(ai, videoInput, videoMetadata, pollIntervalMs, maxPollAttempts, uploadedFileNames);
            videoParts.push(part);
            sourceTypes.push(sourceType);
        }
        const config = {
            systemInstruction: VIDEO_ANALYZE_SYSTEM_PROMPT,
            thinkingConfig: { thinkingLevel },
            temperature: 0.3,
            maxOutputTokens: 8192
        };
        if (params.mediaResolution) {
            config.mediaResolution = params.mediaResolution;
        }
        if (outputFormat === 'json') {
            config.responseMimeType = 'application/json';
        }
        const response = await ai.models.generateContent({
            model,
            config,
            contents: [
                {
                    role: 'user',
                    parts: [...videoParts, { text: prompt }]
                }
            ]
        });
        if (params.deleteUploadedFiles && uploadedFileNames.length > 0) {
            await cleanupUploadedFiles(ai, uploadedFileNames);
        }
        return {
            response: response.text || '',
            format: outputFormat,
            metadata: {
                modelUsed: model,
                thinkingLevel,
                videoCount: params.videos.length,
                uploadedVideoCount: sourceTypes.filter(type => type === 'local_file').length,
                sourceTypes,
                processing: {
                    pollIntervalMs,
                    maxPollAttempts
                }
            }
        };
    }
    catch (error) {
        if (params.deleteUploadedFiles && uploadedFileNames.length > 0) {
            await cleanupUploadedFiles(ai, uploadedFileNames);
        }
        logError('videoAnalyze', error);
        throw handleAPIError(error);
    }
}
//# sourceMappingURL=video-analyze.js.map