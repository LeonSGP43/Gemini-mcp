# Gemini MCP Server

> Gemini assistants for Codex: one tool to brainstorm, one tool to accept or reject work.

This server intentionally exposes a small MCP surface:

- `gemini_brainstorm_assist`
- `gemini_acceptance_assist`

The goal is not to mirror every Gemini capability. The goal is to feel native inside Codex: low-ceremony inputs, strong defaults, and structured outputs that are easy for an agent to use reliably.

## Why This Shape

- Fewer tools means more predictable tool selection.
- `gemini_brainstorm_assist` is optimized for ideation, tradeoffs, and next steps.
- `gemini_acceptance_assist` is optimized for review, blocking findings, coverage gaps, and pass/fail style judgment.
- Legacy multimodal, search, and generic analysis handlers can remain in the codebase as implementation building blocks, but they are not part of the public MCP contract.

## Public Tools

| Tool | Purpose | Default Model |
|------|---------|---------------|
| `gemini_brainstorm_assist` | Generate concrete options, tradeoffs, and recommended direction from a topic plus optional repo context. | `gemini-3-flash-preview` |
| `gemini_acceptance_assist` | Evaluate a file or codebase against explicit acceptance criteria and return structured findings. | `gemini-3.1-pro-preview` |

## Quick Start

### 1. Get an API key

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Install and build locally

```bash
git clone https://github.com/LKbaba/Gemini-mcp.git
cd Gemini-mcp
npm install
npm run build
```

### 3. Configure Codex

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/Users/leongong/Desktop/LeonProjects/Gemini-mcp-1/dist/server.js"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

If you need a proxy, add `HTTP_PROXY` / `HTTPS_PROXY` in the same `env` block.

## Tool Contracts

### `gemini_brainstorm_assist`

Use this when Codex needs ideas that are concrete enough to act on.

Core inputs:

- `topic` required
- `goal` optional
- `context` optional
- `contextFilePath` or `contextFiles` optional
- `constraints` optional
- `count` optional, default `4`
- `mode` optional: `explore` | `refine` | `ship`
- `model` optional: `gemini-3.1-pro-preview` | `gemini-3-flash-preview`

Typical result shape:

```json
{
  "topic": "How should we restructure the MCP surface?",
  "mode": "ship",
  "summary": "Two assistants are enough; generic tools add ambiguity.",
  "recommendedDirection": "Expose two Codex-facing tools and keep lower-level handlers internal.",
  "ideas": [
    {
      "title": "Public dual-tool contract",
      "rationale": "Reduces tool-selection ambiguity for Codex.",
      "benefits": ["predictable routing"],
      "risks": ["less direct access to raw primitives"],
      "implementationOutline": ["add new definitions", "reroute server", "rewrite docs"]
    }
  ],
  "nextSteps": ["implement the new tool definitions"]
}
```

Example:

```json
{
  "name": "gemini_brainstorm_assist",
  "arguments": {
    "topic": "How should we make this MCP feel native in Codex?",
    "goal": "Choose the simplest high-signal public contract",
    "contextFilePath": "./README.md",
    "constraints": ["Keep latency low", "Prefer two public tools max"],
    "mode": "ship"
  }
}
```

### `gemini_acceptance_assist`

Use this when Codex needs a review-style judgment against explicit criteria.

Core inputs:

- `acceptanceCriteria` required
- Exactly one input source:
  - `filePath`
  - `content`
  - `directory`
  - `filePaths`
  - `files`
- `context` optional
- `include` / `exclude` optional for `directory`
- `focus` optional:
  `correctness`, `behavior`, `security`, `performance`, `tests`, `maintainability`
- `strictness` optional: `standard` | `strict`
- `model` optional: `gemini-3.1-pro-preview` | `gemini-3-flash-preview`

Typical result shape:

```json
{
  "verdict": "needs_work",
  "summary": "The public contract is moving in the right direction but the docs still expose removed tools.",
  "blockingFindings": [
    {
      "title": "README drift",
      "severity": "high",
      "description": "The README still documents removed public tools.",
      "location": "README.md",
      "suggestion": "Rewrite the public docs to match the new two-tool contract."
    }
  ],
  "nonBlockingFindings": [],
  "coverageGaps": [],
  "recommendedNextSteps": ["rewrite docs", "run build", "smoke-test tools/list"]
}
```

Example:

```json
{
  "name": "gemini_acceptance_assist",
  "arguments": {
    "acceptanceCriteria": "Review whether the public MCP contract is limited to two Codex-oriented tools and whether the docs match runtime behavior.",
    "directory": "./src",
    "focus": ["correctness", "maintainability"],
    "strictness": "strict"
  }
}
```

## Models

The public tool layer intentionally exposes only two models:

- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`

Recommended defaults:

- Brainstorming: Flash
- Acceptance review: Pro

## Development

```bash
npm run build
npm start
```

## Notes

- Public MCP scope is intentionally small.
- If you want to add more Gemini capabilities later, prefer implementing them as internal helpers first and exposing them only when they clearly improve Codex ergonomics.
