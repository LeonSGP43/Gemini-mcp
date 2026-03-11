# Gemini MCP Server

> **Give Claude Code the power of Gemini 3.0**

An MCP server that connects Claude Code to Google's Gemini 3.0, unlocking capabilities that complement Claude's strengths.

## Why Gemini + Claude?

| Gemini's Strengths | Use Case |
|-------------------|----------|
| **1M Token Context** | Analyze entire codebases in one shot |
| **Google Search Grounding** | Get real-time documentation & latest info |
| **Multimodal Vision** | Understand screenshots, diagrams, designs |

> **Philosophy**: Claude is the commander, Gemini is the specialist.

## Quick Start

### 1. Get API Key

Visit [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.

### 2. Configure Claude Code

Add to your MCP config file:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "@lkbaba/mcp-server-gemini"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Code

## Tools (6)

### Research & Search
| Tool | Description |
|------|-------------|
| `gemini_search` | Web search with Google Search grounding. Get real-time info, latest docs, current events. |

### Analysis (1M Token Context)
| Tool | Description |
|------|-------------|
| `gemini_analyze_codebase` | Analyze entire projects with 1M token context. Supports directory path, file paths, or direct content. |
| `gemini_analyze_content` | Analyze code, documents, or data. Supports file path or direct content input. |

### Multimodal
| Tool | Description |
|------|-------------|
| `gemini_multimodal_query` | Analyze images with natural language. Understand designs, diagrams, screenshots. |
| `gemini_video_analyze` | Analyze videos with temporal understanding. Supports local file path, Base64 video, and YouTube URL. |

### Creative
| Tool | Description |
|------|-------------|
| `gemini_brainstorm` | Generate creative ideas with project context. Supports reading README, PRD files. |

## Model Selection (v1.2.0)

All tools now support an optional `model` parameter:

| Model | Speed | Best For |
|-------|-------|----------|
| `gemini-3.1-pro-preview` | Standard | Complex analysis, deep reasoning (default) |
| `gemini-3-flash-preview` | Fast | Simple tasks, quick responses |

**Example: Use Flash for faster response**
```json
{
  "name": "gemini_analyze_content",
  "arguments": {
    "filePath": "./src/index.ts",
    "task": "review",
    "model": "gemini-3-flash-preview"
  }
}
```

## Usage Examples

### Analyze a Large Codebase
```
"Use Gemini to analyze the ./src directory for architectural patterns and potential issues"
```

### Search for Latest Documentation
```
"Search for the latest Next.js 15 App Router documentation"
```

### Analyze an Image
```
"Analyze this architecture diagram and explain the data flow" (attach image)
```

### Analyze a Video
```
"Analyze this product demo video and list key user actions by timeline"
```

### Video Tool Example (JSON)
```json
{
  "name": "gemini_video_analyze",
  "arguments": {
    "prompt": "Summarize this demo video and extract key actions with timestamps",
    "videos": ["./assets/demo.mp4"],
    "outputFormat": "markdown",
    "model": "gemini-3.1-pro-preview",
    "thinkingLevel": "high",
    "mediaResolution": "MEDIA_RESOLUTION_MEDIUM",
    "fps": 1,
    "startOffset": "0s",
    "endOffset": "90s",
    "deleteUploadedFiles": true
  }
}
```

### Brainstorm with Context
```
"Brainstorm feature ideas based on this project's README.md"
```

## Proxy Configuration

<details>
<summary>For users behind proxy/VPN</summary>

Add proxy environment variable to your config:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "@lkbaba/mcp-server-gemini"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here",
        "HTTPS_PROXY": "http://127.0.0.1:7897"
      }
    }
  }
}
```
</details>

## Local Development

<details>
<summary>Build from source</summary>

```bash
git clone https://github.com/LKbaba/Gemini-mcp.git
cd Gemini-mcp
npm install
npm run build
export GEMINI_API_KEY="your_api_key_here"
npm start
```
</details>

## Codex MCP 配置

如果你希望在 Codex CLI 中直接使用这个 MCP server，可在 Codex 的 MCP 配置里添加一个 `stdio` 服务（下面是推荐本地源码方式）：

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

如果你希望直接用 npm 包运行：

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "@lkbaba/mcp-server-gemini"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

注意：
- 本项目现在支持 `Content-Length` 分帧与按行 JSON 两种 stdio 传输方式，适配主流 MCP host（包括 Codex）。
- 首次本地运行前请先执行：`npm install && npm run build`。

## Project Structure

```
src/
├── config/
│   ├── models.ts           # Model configurations
│   └── constants.ts        # Global constants
├── tools/
│   ├── definitions.ts      # MCP tool definitions
│   ├── multimodal-query.ts # Multimodal queries
│   ├── video-analyze.ts    # Video analysis
│   ├── analyze-content.ts  # Content analysis
│   ├── analyze-codebase.ts # Codebase analysis
│   ├── brainstorm.ts       # Brainstorming
│   └── search.ts           # Web search
├── utils/
│   ├── gemini-client.ts    # Gemini API client
│   ├── file-reader.ts      # File system access
│   ├── security.ts         # Path validation
│   ├── validators.ts       # Parameter validation
│   └── error-handler.ts    # Error handling
├── types.ts                # Type definitions
└── server.ts               # Main server
```

## Credits

Based on [aliargun/mcp-server-gemini](https://github.com/aliargun/mcp-server-gemini)

## License

MIT
