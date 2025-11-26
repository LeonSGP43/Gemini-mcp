# MCP 工具升级实现计划

**项目名称**: Gemini MCP Server 工具改进
**版本**: v1.0
**创建日期**: 2025-11-26
**基于**: [updatePRD.md](../updatePRD.md)

---

## 总览

本文档将 MCP 工具升级任务分解为 **10 个独立任务**，每个任务控制在 2 小时内完成。任务按技术依赖和优先级排序。

### 任务分布

| 阶段 | 任务数 | 预计时间 | 优先级 |
|------|--------|----------|--------|
| **Phase 1**: 基础设施 | 2 | 3 小时 | P0 |
| **Phase 2**: P0 核心功能 | 3 | 5 小时 | P0 |
| **Phase 3**: P1 重要功能 | 2 | 3 小时 | P1 |
| **Phase 4**: P2 次要功能 | 2 | 2 小时 | P2 |
| **Phase 5**: 测试与文档 | 1 | 2 小时 | P1 |
| **总计** | **10** | **15 小时** | - |

### 依赖关系图

```
Task 1 (安全模块) ──┬──> Task 3 (analyze_codebase 目录读取)
                   │
Task 2 (文件读取)  ─┴──> Task 4 (analyze_content 文件路径)
                         │
                         └──> Task 5 (集成测试 P0)

Task 6 (generate_ui) ─── 无依赖
Task 7 (fix_ui) ──────── 依赖 Task 2
Task 8 (brainstorm) ──── 依赖 Task 2
Task 9 (list_models) ─── 无依赖
Task 10 (测试文档) ───── 依赖 Task 1-9
```

---

## Phase 1: 基础设施

### Task 1: 安全验证模块实现

**预计时间**: 1.5 小时
**依赖**: 无
**优先级**: P0

**任务目标**: 创建安全验证模块，为后续的文件系统访问功能提供安全保障。

**AI 提示词**:

```
你是一位资深的 Node.js 安全工程师，擅长文件系统安全和路径验证。

ultrathink

## 任务目标
在 Gemini MCP 项目中创建安全验证模块，用于验证文件路径访问的安全性。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 目标文件: src/utils/security.ts (新建)

## 具体需求

### 1. 创建 src/utils/security.ts 文件

实现以下功能：

```typescript
// 安全检查配置接口
interface SecurityConfig {
  // 允许访问的目录白名单（可选，为空时允许所有非敏感路径）
  allowedDirectories?: string[];
  // 敏感文件模式黑名单
  sensitivePatterns?: string[];
  // 单文件大小限制（字节）
  maxFileSize?: number;
  // 最大文件数量限制
  maxFiles?: number;
}

// 默认敏感文件模式
const DEFAULT_SENSITIVE_PATTERNS = [
  '.env', '.env.*',
  '.ssh/*', '*.pem', '*.key', '*.pfx',
  '**/credentials*', '**/secrets*',
  '**/.git/config', '**/id_rsa*'
];

// 导出函数
export function validatePath(path: string, config?: SecurityConfig): void;
export function validatePaths(paths: string[], config?: SecurityConfig): void;
export function isSensitiveFile(filePath: string, patterns?: string[]): boolean;
export function normalizePath(inputPath: string): string;
export function isWithinAllowedDirectory(filePath: string, allowedDirs: string[]): boolean;
```

### 2. 实现要点

1. **路径遍历检测**：
   - 检测并拒绝包含 `..` 的路径
   - 规范化路径后再次验证
   - 支持 Windows 和 Unix 路径格式

2. **白名单验证**：
   - 如果配置了白名单，验证路径是否在白名单目录内
   - 使用 path.resolve 获取绝对路径后比较

3. **敏感文件保护**：
   - 使用 micromatch 库匹配敏感文件模式（fast-glob 内部依赖，无需额外安装）
   - 支持 glob 模式匹配
   - 安装命令：`npm install micromatch @types/micromatch`

4. **符号链接检测**：
   - 使用 fs.lstat 检测符号链接
   - 默认拒绝符号链接访问（可配置）

### 3. 错误处理

创建自定义错误类：
```typescript
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: 'PATH_TRAVERSAL' | 'ACCESS_DENIED' | 'SENSITIVE_FILE' | 'SYMLINK_DETECTED' | 'SIZE_EXCEEDED' | 'FILE_LIMIT_EXCEEDED'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

### 4. 测试用例（在注释中说明）

```typescript
// 应该通过的路径
// - "./src/index.ts"
// - "C:/Project/src/file.ts"
// - "/home/user/project/file.ts"

// 应该拒绝的路径
// - "../../../etc/passwd"
// - "./src/../../../secret"
// - "./.env"
// - "./config/credentials.json"
```

## 输出要求
1. 完整的 src/utils/security.ts 文件
2. 所有函数都要有 JSDoc 注释（中文）
3. 代码注释使用中文
```

---

### Task 2: 文件读取工具函数实现

**预计时间**: 1.5 小时
**依赖**: Task 1
**优先级**: P0

**任务目标**: 创建文件读取工具模块，支持单文件读取和目录批量读取。

**AI 提示词**:

```
你是一位资深的 Node.js 工程师，擅长文件系统操作和 glob 模式匹配。

ultrathink

## 任务目标
在 Gemini MCP 项目中创建文件读取工具模块，支持目录递归读取和 glob 模式过滤。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 目标文件: src/utils/file-reader.ts (新建)
- 依赖文件: src/utils/security.ts (Task 1 创建的安全模块)

## 具体需求

### 1. 添加依赖

首先更新 package.json，添加 fast-glob 依赖：
```bash
npm install fast-glob
```

### 2. 创建 src/utils/file-reader.ts

```typescript
import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validatePath, validatePaths, SecurityConfig, SecurityError } from './security.js';

// 文件内容接口
export interface FileContent {
  path: string;       // 相对路径
  absolutePath: string; // 绝对路径
  content: string;    // 文件内容
  size: number;       // 文件大小（字节）
  language?: string;  // 检测到的语言
}

// 目录读取选项
export interface ReadDirectoryOptions {
  include?: string[];  // glob 包含模式，默认 ["**/*"]
  exclude?: string[];  // glob 排除模式，默认排除常见忽略目录
  maxFileSize?: number; // 单文件大小限制，默认 1MB
  maxFiles?: number;    // 最大文件数，默认 500
  securityConfig?: SecurityConfig;
}

// 默认排除模式
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.lock',
  'package-lock.json',
  '*.min.js',
  '*.min.css',
  '*.map'
];

// 二进制文件扩展名（跳过这些文件）
const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.svg',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.db', '.sqlite', '.sqlite3'
];

// 导出函数
export async function readFile(filePath: string, config?: SecurityConfig): Promise<FileContent>;
export async function readFiles(filePaths: string[], config?: SecurityConfig): Promise<FileContent[]>;
export async function readDirectory(directory: string, options?: ReadDirectoryOptions): Promise<FileContent[]>;
export function detectLanguage(filePath: string): string;
export function isBinaryFile(filePath: string): boolean;  // 检测是否为二进制文件
```

### 3. 实现要点

1. **readFile 函数**:
   - 调用 security.ts 的 validatePath 验证路径
   - **先检查是否为二进制文件，如果是则跳过**
   - 使用 fs.readFile 读取文件内容（utf-8 编码）
   - 返回 FileContent 对象
   - 处理读取错误，给出清晰的错误信息

2. **readFiles 函数**:
   - 批量读取多个文件
   - **自动跳过二进制文件**
   - 使用 Promise.allSettled 并行读取
   - 返回成功读取的文件，失败的文件记录警告但不中断

3. **readDirectory 函数**:
   - 使用 fast-glob 获取匹配文件列表
   - 合并用户 exclude 和默认 exclude 模式
   - **自动排除二进制文件扩展名**
   - 检查文件数量限制，超出时抛出错误
   - 按文件大小过滤，跳过过大的文件
   - 调用 readFiles 读取所有文件

4. **detectLanguage 函数**:
   - 根据文件扩展名检测编程语言
   - 支持常见语言：TypeScript, JavaScript, Python, Go, Rust, Java 等
   - 返回语言名称字符串

5. **isBinaryFile 函数**:
   - 根据文件扩展名判断是否为二进制文件
   - 使用 BINARY_EXTENSIONS 常量列表匹配
   - 返回 boolean

### 4. 错误处理

```typescript
export class FileReadError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FileReadError';
  }
}
```

### 5. 使用示例

```typescript
// 读取单个文件
const file = await readFile('./src/index.ts');

// 读取多个文件
const files = await readFiles(['./src/a.ts', './src/b.ts']);

// 读取整个目录
const codebase = await readDirectory('./src', {
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['**/*.test.ts', '**/*.spec.ts'],
  maxFiles: 100
});
```

## 输出要求
1. 更新 package.json 添加 fast-glob 依赖
2. 完整的 src/utils/file-reader.ts 文件
3. 所有函数都要有 JSDoc 注释（中文）
4. 代码注释使用中文
5. 确保与 security.ts 正确集成
```

---

## Phase 2: P0 核心功能

### Task 3: analyze_codebase 工具升级 - 支持目录读取

**预计时间**: 2 小时
**依赖**: Task 1, Task 2
**优先级**: P0

**任务目标**: 升级 analyze_codebase 工具，支持直接传入目录路径进行分析。

**AI 提示词**:

```
你是一位资深的 TypeScript 工程师，擅长 MCP 协议开发和 API 设计。

ultrathink

## 任务目标
升级 Gemini MCP 的 analyze_codebase 工具，添加目录读取功能，同时保持向后兼容。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/analyze-codebase.ts
  - src/tools/definitions.ts

## 当前实现
请先阅读现有的 src/tools/analyze-codebase.ts 和 src/tools/definitions.ts 了解当前实现。

## 改进需求

### 1. 更新参数接口 (analyze-codebase.ts)

```typescript
export interface AnalyzeCodebaseParams {
  // ===== 输入方式（三选一）=====

  // 方式1：目录路径【新增】
  directory?: string;
  include?: string[];    // glob模式，如 ["**/*.ts", "**/*.js"]
  exclude?: string[];    // 排除模式，如 ["node_modules/**", "dist/**"]

  // 方式2：文件路径列表【新增】
  filePaths?: string[];

  // 方式3：文件内容数组【保留，向后兼容】
  files?: Array<{ path: string; content: string }>;

  // ===== 其他参数（保持不变）=====
  focus?: 'architecture' | 'security' | 'performance' | 'dependencies' | 'patterns';
  deepThink?: boolean;
  outputFormat?: 'markdown' | 'json';
}
```

### 2. 更新 handleAnalyzeCodebase 函数

1. **参数验证逻辑**:
   ```typescript
   // 验证至少提供一种输入方式
   const hasDirectory = !!params.directory;
   const hasFilePaths = params.filePaths && params.filePaths.length > 0;
   const hasFiles = params.files && params.files.length > 0;

   if (!hasDirectory && !hasFilePaths && !hasFiles) {
     throw new Error('必须提供 directory、filePaths 或 files 参数之一');
   }
   ```

2. **输入处理逻辑**:
   ```typescript
   let filesToAnalyze: Array<{ path: string; content: string }>;

   if (hasDirectory) {
     // 使用 file-reader.ts 的 readDirectory 函数
     const fileContents = await readDirectory(params.directory, {
       include: params.include,
       exclude: params.exclude
     });
     filesToAnalyze = fileContents.map(f => ({ path: f.path, content: f.content }));
   } else if (hasFilePaths) {
     // 使用 file-reader.ts 的 readFiles 函数
     const fileContents = await readFiles(params.filePaths);
     filesToAnalyze = fileContents.map(f => ({ path: f.path, content: f.content }));
   } else {
     // 原有逻辑，直接使用 files 参数
     filesToAnalyze = params.files;
   }
   ```

3. **安全验证**: 在读取文件前调用安全模块验证路径

### 3. 更新工具定义 (definitions.ts)

更新 TOOL_DEFINITIONS 中 analyze_codebase 的 inputSchema：

```typescript
{
  name: TOOL_NAMES.ANALYZE_CODEBASE,
  description: 'Analyze entire codebase using 1M token context. Supports directory path, file paths, or file contents. Provides architecture overview, identifies patterns, security issues, performance bottlenecks, and dependency problems.',
  inputSchema: {
    type: 'object',
    properties: {
      // 新增：目录路径
      directory: {
        type: 'string',
        description: 'Directory path to analyze (e.g., "./src" or "C:/Project/src")'
      },
      include: {
        type: 'array',
        items: { type: 'string' },
        description: 'Glob patterns to include (e.g., ["**/*.ts", "**/*.tsx"]). Only used with directory.'
      },
      exclude: {
        type: 'array',
        items: { type: 'string' },
        description: 'Glob patterns to exclude (e.g., ["node_modules/**", "**/*.test.ts"]). Only used with directory.'
      },
      // 新增：文件路径列表
      filePaths: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths to analyze'
      },
      // 保留：原有的 files 参数
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
        description: 'List of files with their content (for backward compatibility)'
      },
      // 其他参数保持不变
      focus: { ... },
      deepThink: { ... },
      outputFormat: { ... }
    },
    required: []  // 改为空数组，因为三种输入方式任选其一
  }
}
```

### 4. 错误处理

- 目录不存在时给出清晰提示
- 无匹配文件时给出提示
- 文件数量超限时给出提示和建议

## 测试用例

```typescript
// 测试1：目录读取
{
  directory: "./src",
  include: ["**/*.ts"],
  exclude: ["**/*.test.ts"],
  focus: "architecture"
}

// 测试2：文件路径列表
{
  filePaths: ["./src/index.ts", "./src/utils/helper.ts"],
  focus: "security"
}

// 测试3：向后兼容
{
  files: [{ path: "test.ts", content: "const a = 1;" }]
}
```

## 输出要求
1. 更新后的 src/tools/analyze-codebase.ts
2. 更新后的 src/tools/definitions.ts 中对应部分
3. 所有新增代码都要有中文注释
4. 确保向后兼容，原有调用方式不受影响
```

---

### Task 4: analyze_content 工具升级 - 支持文件路径

**预计时间**: 1 小时
**依赖**: Task 2
**优先级**: P0

**任务目标**: 升级 analyze_content 工具，支持直接传入文件路径。

**AI 提示词**:

```
你是一位资深的 TypeScript 工程师，擅长 MCP 协议开发。

## 任务目标
升级 Gemini MCP 的 analyze_content 工具，添加文件路径读取功能。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/analyze-content.ts
  - src/tools/definitions.ts

## 改进需求

### 1. 更新参数接口

```typescript
export interface AnalyzeContentParams {
  // 方式1：直接传内容【保留】
  content?: string;

  // 方式2：传文件路径【新增】
  filePath?: string;

  // 其他参数不变
  type?: 'code' | 'document' | 'data' | 'auto';
  task?: 'summarize' | 'review' | 'explain' | 'optimize' | 'debug';
  language?: string;
  focus?: string[];
  outputFormat?: 'text' | 'json' | 'markdown';
}
```

### 2. 更新处理函数

```typescript
export async function handleAnalyzeContent(
  params: AnalyzeContentParams,
  client: GeminiClient
): Promise<AnalyzeContentResult> {
  // 验证至少提供一种输入方式
  if (!params.content && !params.filePath) {
    throw new Error('必须提供 content 或 filePath 参数之一');
  }

  let contentToAnalyze: string;
  let detectedLanguage: string | undefined;

  if (params.filePath) {
    // 使用 file-reader.ts 读取文件
    const fileContent = await readFile(params.filePath);
    contentToAnalyze = fileContent.content;
    detectedLanguage = fileContent.language;
  } else {
    contentToAnalyze = params.content!;
  }

  // 后续处理逻辑不变...
}
```

### 3. 更新工具定义

在 definitions.ts 中添加 filePath 参数：

```typescript
{
  name: TOOL_NAMES.ANALYZE_CONTENT,
  description: 'Analyze code, documents, or data. Supports file path or direct content input.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Content to analyze (direct input)'
      },
      filePath: {
        type: 'string',
        description: 'File path to read and analyze (e.g., "./src/utils/parser.ts")'
      },
      // 其他参数保持不变...
    },
    required: []  // 改为空数组
  }
}
```

## 输出要求
1. 更新后的 src/tools/analyze-content.ts
2. 更新后的 src/tools/definitions.ts 中对应部分
3. 中文注释
4. 向后兼容
```

---

### Task 5: P0 功能集成测试

**预计时间**: 2 小时
**依赖**: Task 3, Task 4
**优先级**: P0

**任务目标**: 为 P0 功能编写集成测试，确保目录读取和文件路径功能正常工作。

**AI 提示词**:

```
你是一位资深的测试工程师，擅长 TypeScript 测试和 Jest 框架。

## 任务目标
为 Gemini MCP 的 P0 功能（analyze_codebase 目录读取、analyze_content 文件路径）编写集成测试。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 测试文件位置: tests/

## 测试需求

### 1. 安全模块测试 (tests/security.test.ts)

```typescript
describe('Security Module', () => {
  describe('validatePath', () => {
    it('应该允许正常路径');
    it('应该拒绝路径遍历攻击 (../)');
    it('应该拒绝敏感文件访问 (.env)');
    it('应该正确处理 Windows 路径');
    it('应该正确处理 Unix 路径');
  });

  describe('isSensitiveFile', () => {
    it('应该检测 .env 文件');
    it('应该检测 .pem 密钥文件');
    it('应该检测 credentials 文件');
    it('应该允许正常代码文件');
  });
});
```

### 2. 文件读取测试 (tests/file-reader.test.ts)

```typescript
describe('File Reader Module', () => {
  describe('readFile', () => {
    it('应该正确读取单个文件');
    it('应该正确检测文件语言');
    it('应该拒绝不存在的文件');
    it('应该拒绝敏感文件');
  });

  describe('readDirectory', () => {
    it('应该正确读取目录下所有文件');
    it('应该正确应用 include 过滤');
    it('应该正确应用 exclude 过滤');
    it('应该遵守文件数量限制');
    it('应该跳过过大的文件');
  });
});
```

### 3. analyze_codebase 测试 (tests/analyze-codebase.test.ts)

```typescript
describe('Analyze Codebase Tool', () => {
  describe('参数验证', () => {
    it('应该接受 directory 参数');
    it('应该接受 filePaths 参数');
    it('应该接受 files 参数（向后兼容）');
    it('应该拒绝没有输入的调用');
  });

  describe('目录读取功能', () => {
    it('应该正确读取目录并分析');
    it('应该正确应用 include/exclude 模式');
    it('应该拒绝路径遍历攻击');
  });
});
```

### 4. analyze_content 测试 (tests/analyze-content.test.ts)

```typescript
describe('Analyze Content Tool', () => {
  it('应该接受 content 参数');
  it('应该接受 filePath 参数');
  it('应该自动检测文件语言');
  it('应该拒绝没有输入的调用');
});
```

## 测试环境设置

1. 创建测试用的临时目录和文件
2. 使用 Jest 的 beforeAll/afterAll 进行清理
3. Mock Gemini API 调用（不测试实际 API）

## 输出要求
1. tests/security.test.ts
2. tests/file-reader.test.ts
3. tests/analyze-codebase.test.ts
4. tests/analyze-content.test.ts
5. 更新 jest.config.js（如需要）
6. 中文测试描述
```

---

## Phase 3: P1 重要功能

### Task 6: generate_ui 工具升级 - 技术栈上下文

**预计时间**: 1.5 小时
**依赖**: 无
**优先级**: P1

**任务目标**: 升级 generate_ui 工具，支持技术栈上下文参数。

**AI 提示词**:

```
你是一位资深的前端工程师，擅长 React、Vue 等框架和 UI 组件开发。

## 任务目标
升级 Gemini MCP 的 generate_ui 工具，添加技术栈上下文参数，使生成的代码更贴合用户项目。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/generate-ui.ts
  - src/tools/definitions.ts

## 改进需求

### 1. 新增参数接口

```typescript
// 技术栈上下文接口
interface TechContext {
  cssFramework?: 'tailwind' | 'bootstrap' | 'styled-components' | 'css-modules' | 'emotion';
  uiLibrary?: 'shadcn' | 'antd' | 'mui' | 'chakra' | 'radix';
  typescript?: boolean;
  stateManagement?: 'zustand' | 'redux' | 'jotai' | 'recoil';
}

export interface GenerateUIParams {
  description: string;
  designImage?: string;
  framework?: 'vanilla' | 'react' | 'vue' | 'svelte';

  // 【新增】技术栈上下文
  techContext?: TechContext;

  // 【新增】配置文件路径，自动检测技术栈
  configPath?: string;  // 如 package.json 路径

  includeAnimation?: boolean;
  responsive?: boolean;
  style?: 'modern' | 'minimal' | 'glassmorphism' | 'neumorphism';
}
```

### 2. 更新系统提示词

根据 techContext 动态调整系统提示词：

```typescript
function buildTechContextPrompt(techContext: TechContext): string {
  let prompt = '\n## 技术栈要求\n';

  if (techContext.cssFramework) {
    prompt += `- CSS 框架: 使用 ${techContext.cssFramework}`;
    if (techContext.cssFramework === 'tailwind') {
      prompt += '，使用 Tailwind CSS 类名，不要写原生 CSS';
    }
    prompt += '\n';
  }

  if (techContext.uiLibrary) {
    prompt += `- UI 组件库: 使用 ${techContext.uiLibrary} 的组件`;
    if (techContext.uiLibrary === 'shadcn') {
      prompt += '，遵循 shadcn/ui 的组件结构和命名规范';
    }
    prompt += '\n';
  }

  if (techContext.typescript) {
    prompt += '- 使用 TypeScript，添加完整的类型定义\n';
  }

  if (techContext.stateManagement) {
    prompt += `- 状态管理: 使用 ${techContext.stateManagement}\n`;
  }

  return prompt;
}
```

### 3. 配置文件自动检测

如果提供了 configPath（package.json 路径），自动检测技术栈：

```typescript
async function detectTechStackFromConfig(configPath: string): Promise<TechContext> {
  const content = await readFile(configPath);
  const pkg = JSON.parse(content.content);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const techContext: TechContext = {};

  // 检测 CSS 框架
  if (deps['tailwindcss']) techContext.cssFramework = 'tailwind';
  else if (deps['bootstrap']) techContext.cssFramework = 'bootstrap';
  else if (deps['styled-components']) techContext.cssFramework = 'styled-components';

  // 检测 UI 库
  if (deps['@shadcn/ui'] || deps['shadcn-ui']) techContext.uiLibrary = 'shadcn';
  else if (deps['antd']) techContext.uiLibrary = 'antd';
  else if (deps['@mui/material']) techContext.uiLibrary = 'mui';

  // 检测 TypeScript
  techContext.typescript = !!deps['typescript'];

  return techContext;
}
```

### 4. 更新工具定义

```typescript
{
  name: TOOL_NAMES.GENERATE_UI,
  inputSchema: {
    type: 'object',
    properties: {
      // ...原有参数...
      techContext: {
        type: 'object',
        properties: {
          cssFramework: {
            type: 'string',
            enum: ['tailwind', 'bootstrap', 'styled-components', 'css-modules', 'emotion'],
            description: 'CSS framework to use'
          },
          uiLibrary: {
            type: 'string',
            enum: ['shadcn', 'antd', 'mui', 'chakra', 'radix'],
            description: 'UI component library'
          },
          typescript: {
            type: 'boolean',
            description: 'Use TypeScript'
          },
          stateManagement: {
            type: 'string',
            enum: ['zustand', 'redux', 'jotai', 'recoil'],
            description: 'State management library'
          }
        },
        description: 'Technology stack context for code generation'
      },
      configPath: {
        type: 'string',
        description: 'Path to package.json for auto-detecting tech stack'
      }
    }
  }
}
```

## 输出要求
1. 更新后的 src/tools/generate-ui.ts
2. 更新后的 src/tools/definitions.ts 中对应部分
3. 中文注释
```

---

### Task 7: fix_ui_from_screenshot 工具升级 - 源代码关联

**预计时间**: 1.5 小时
**依赖**: Task 2
**优先级**: P1

**任务目标**: 升级 fix_ui_from_screenshot 工具，支持自动读取源代码文件。

**AI 提示词**:

```
你是一位资深的前端工程师，擅长 UI 调试和问题定位。

## 任务目标
升级 Gemini MCP 的 fix_ui_from_screenshot 工具，支持传入源代码文件路径进行更精确的问题诊断。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/fix-ui.ts
  - src/tools/definitions.ts

## 改进需求

### 1. 更新参数接口

```typescript
export interface FixUIParams {
  screenshot: string;

  // 【新增】源代码路径
  sourceCodePath?: string;  // 可疑的源文件路径

  // 【新增】多文件支持
  relatedFiles?: string[];  // 相关文件路径列表

  currentCode?: string;     // 保留，向后兼容
  issueDescription?: string;
  targetState?: string;
}
```

### 2. 更新处理函数

```typescript
export async function handleFixUI(
  params: FixUIParams,
  client: GeminiClient
): Promise<FixUIResult> {
  let codeContext = '';

  // 读取主要源代码文件
  if (params.sourceCodePath) {
    const fileContent = await readFile(params.sourceCodePath);
    codeContext += `## 主要源代码文件: ${fileContent.path}\n`;
    codeContext += `\`\`\`${fileContent.language?.toLowerCase() || ''}\n`;
    codeContext += fileContent.content;
    codeContext += '\n```\n\n';
  }

  // 读取相关文件
  if (params.relatedFiles && params.relatedFiles.length > 0) {
    const relatedContents = await readFiles(params.relatedFiles);
    for (const file of relatedContents) {
      codeContext += `## 相关文件: ${file.path}\n`;
      codeContext += `\`\`\`${file.language?.toLowerCase() || ''}\n`;
      codeContext += file.content;
      codeContext += '\n```\n\n';
    }
  }

  // 向后兼容：如果提供了 currentCode
  if (params.currentCode && !params.sourceCodePath) {
    codeContext += `## 当前代码\n\`\`\`\n${params.currentCode}\n\`\`\`\n\n`;
  }

  // 构建提示词时包含代码上下文
  // ...
}
```

### 3. 更新系统提示词

```typescript
const ENHANCED_FIX_UI_PROMPT = `你是一位资深的前端 UI 专家。

分析用户提供的 UI 截图和源代码，诊断问题并提供精确的修复方案。

分析步骤：
1. 仔细观察截图中的 UI 问题
2. 阅读提供的源代码，定位问题代码
3. 分析问题原因（布局、样式、响应式等）
4. 提供具体的代码修复建议，包含文件路径和行号

输出格式：
1. 问题诊断（截图分析 + 代码分析）
2. 问题原因
3. 修复代码（标明文件路径和修改位置）
4. 预防建议`;
```

### 4. 更新工具定义

```typescript
{
  name: TOOL_NAMES.FIX_UI,
  description: 'Identify and fix UI issues from screenshots. Supports source code file paths for precise diagnosis.',
  inputSchema: {
    type: 'object',
    properties: {
      screenshot: { ... },
      sourceCodePath: {
        type: 'string',
        description: 'Path to the main source code file causing the issue'
      },
      relatedFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to related files (CSS, parent components, etc.)'
      },
      currentCode: { ... },
      issueDescription: { ... },
      targetState: { ... }
    }
  }
}
```

## 输出要求
1. 更新后的 src/tools/fix-ui.ts
2. 更新后的 src/tools/definitions.ts 中对应部分
3. 中文注释
4. 向后兼容
```

---

## Phase 4: P2 次要功能

### Task 8: brainstorm 工具升级 - 项目上下文

**预计时间**: 1 小时
**依赖**: Task 2
**优先级**: P2

**任务目标**: 升级 brainstorm 工具，支持传入项目上下文文件。

**AI 提示词**:

```
你是一位资深的产品工程师，擅长需求分析和方案设计。

## 任务目标
升级 Gemini MCP 的 brainstorm 工具，添加项目上下文文件参数，使头脑风暴更贴合项目实际。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/brainstorm.ts
  - src/tools/definitions.ts

## 改进需求

### 1. 更新参数接口

```typescript
export interface BrainstormParams {
  topic: string;
  context?: string;

  // 【新增】项目上下文文件路径
  contextFilePath?: string;  // 如 README.md 或 PRD.md

  // 【新增】多个上下文文件
  contextFiles?: string[];   // 多个上下文文件路径

  count?: number;
  style?: 'innovative' | 'practical' | 'radical';
}
```

### 2. 更新处理函数

```typescript
export async function handleBrainstorm(
  params: BrainstormParams,
  client: GeminiClient
): Promise<BrainstormResult> {
  let projectContext = '';

  // 读取上下文文件
  if (params.contextFilePath) {
    const fileContent = await readFile(params.contextFilePath);
    projectContext += `## 项目上下文: ${fileContent.path}\n`;
    projectContext += fileContent.content + '\n\n';
  }

  if (params.contextFiles && params.contextFiles.length > 0) {
    const contextContents = await readFiles(params.contextFiles);
    for (const file of contextContents) {
      projectContext += `## ${file.path}\n`;
      projectContext += file.content + '\n\n';
    }
  }

  // 构建提示词时包含项目上下文
  let prompt = `# 头脑风暴主题\n${params.topic}\n\n`;

  if (projectContext) {
    prompt += `# 项目背景\n${projectContext}\n`;
    prompt += '请基于以上项目背景，确保提出的想法与项目架构和技术栈兼容。\n\n';
  }

  if (params.context) {
    prompt += `# 额外上下文\n${params.context}\n\n`;
  }

  // ...
}
```

### 3. 更新工具定义

```typescript
{
  name: TOOL_NAMES.BRAINSTORM,
  inputSchema: {
    properties: {
      // ...原有参数...
      contextFilePath: {
        type: 'string',
        description: 'Path to project context file (e.g., README.md, PRD.md)'
      },
      contextFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to multiple context files'
      }
    }
  }
}
```

## 输出要求
1. 更新后的 src/tools/brainstorm.ts
2. 更新后的 src/tools/definitions.ts 中对应部分
3. 中文注释
```

---

### Task 9: list_models 工具升级 - 结构化输出

**预计时间**: 1 小时
**依赖**: 无
**优先级**: P2

**任务目标**: 升级 list_models 工具，返回更详细的结构化模型信息。

**AI 提示词**:

```
你是一位资深的 API 工程师，擅长设计清晰的数据结构。

## 任务目标
升级 Gemini MCP 的 list_models 工具，返回更详细的结构化模型信息。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp
- 修改文件:
  - src/tools/list-models.ts
  - src/config/models.ts

## 改进需求

### 1. 更新模型配置 (models.ts)

```typescript
export interface ModelInfo {
  id: string;                    // 模型 ID
  name: string;                  // 显示名称
  description: string;           // 模型描述
  capabilities: {
    maxInputTokens: number;      // 最大输入 token
    maxOutputTokens: number;     // 最大输出 token
    supportsVision: boolean;     // 是否支持图像
    supportsFunctionCalling: boolean;  // 是否支持函数调用
    supportsStreaming: boolean;  // 是否支持流式输出
  };
  useCases: string[];            // 推荐使用场景
  isDefault: boolean;            // 是否为默认模型
  pricing?: {                    // 定价信息（可选）
    inputPerMillion: string;
    outputPerMillion: string;
  };
}

export const MODELS: ModelInfo[] = [
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: '最新的 Gemini 3 Pro 预览版，具有强大的推理和生成能力',
    capabilities: {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsStreaming: true
    },
    useCases: ['复杂推理', '代码生成', '长文档分析', 'UI 生成'],
    isDefault: true
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: '稳定的 Gemini 2.5 Pro 版本，平衡性能和速度',
    capabilities: {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsStreaming: true
    },
    useCases: ['通用任务', '代码审查', '文档生成'],
    isDefault: false
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: '快速响应的 Gemini 版本，适合实时交互',
    capabilities: {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsStreaming: true
    },
    useCases: ['快速问答', '实时分析', '轻量级任务'],
    isDefault: false
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: '最轻量的 Gemini 版本，极速响应',
    capabilities: {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsStreaming: true
    },
    useCases: ['简单查询', '快速验证', '低延迟场景'],
    isDefault: false
  }
];
```

### 2. 更新 list_models 返回格式

```typescript
export interface ListModelsResult {
  models: ModelInfo[];
  defaultModel: string;
  totalCount: number;
}

export async function handleListModels(): Promise<ListModelsResult> {
  const defaultModel = MODELS.find(m => m.isDefault);

  return {
    models: MODELS,
    defaultModel: defaultModel?.id || MODELS[0].id,
    totalCount: MODELS.length
  };
}
```

## 输出要求
1. 更新后的 src/config/models.ts
2. 更新后的 src/tools/list-models.ts
3. 中文注释
```

---

## Phase 5: 测试与文档

### Task 10: 完整测试与文档更新

**预计时间**: 2 小时
**依赖**: Task 1-9
**优先级**: P1

**任务目标**: 完成所有功能的测试和文档更新。

**AI 提示词**:

```
你是一位资深的技术文档工程师，擅长编写清晰的 API 文档和使用指南。

## 任务目标
为 Gemini MCP 的所有升级功能编写完整测试和文档。

## 项目位置
- 项目根目录: c:\Users\LiuKe\Desktop\AI-coding\AutoPilotWork\Gemini-mcp

## 具体任务

### 1. 补充 P1/P2 功能测试

创建或更新以下测试文件：
- tests/generate-ui.test.ts
- tests/fix-ui.test.ts
- tests/brainstorm.test.ts
- tests/list-models.test.ts

### 2. 更新 README.md

添加以下内容：
- 新增功能说明
- 各工具的参数说明和使用示例
- 安全机制说明
- 更新的版本历史

### 3. 创建 API 文档

创建 docs/API.md，包含：
- 所有 8 个工具的完整 API 文档
- 参数类型定义
- 返回值说明
- 使用示例
- 错误处理

### 4. 更新 CHANGELOG.md

记录本次升级的所有变更。

## 文档格式要求

每个工具的文档应包含：
```markdown
## gemini_analyze_codebase

分析整个代码库，支持直接传入目录路径、文件路径列表或文件内容。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| directory | string | 三选一 | 要分析的目录路径 |
| include | string[] | 否 | glob 包含模式 |
| exclude | string[] | 否 | glob 排除模式 |
| filePaths | string[] | 三选一 | 文件路径列表 |
| files | object[] | 三选一 | 文件内容数组（向后兼容） |
| focus | string | 否 | 分析重点 |
| deepThink | boolean | 否 | 深度分析模式 |
| outputFormat | string | 否 | 输出格式 |

### 示例

#### 目录分析
\`\`\`json
{
  "directory": "./src",
  "include": ["**/*.ts"],
  "exclude": ["**/*.test.ts"],
  "focus": "architecture"
}
\`\`\`

#### 文件列表分析
\`\`\`json
{
  "filePaths": ["./src/index.ts", "./src/utils/helper.ts"],
  "focus": "security"
}
\`\`\`
```

## 输出要求
1. 补充的测试文件
2. 更新后的 README.md
3. 新建的 docs/API.md
4. 更新后的 CHANGELOG.md
5. 中文文档
```

---

## 验收清单

### P0 功能验收

- [ ] `analyze_codebase` 能接收 `directory` 参数并正确读取文件
- [ ] `analyze_codebase` 能正确处理 `include/exclude` glob 模式
- [ ] `analyze_content` 能接收 `filePath` 参数并读取文件
- [ ] 安全验证能阻止路径遍历攻击
- [ ] 原有的 `files` 和 `content` 参数仍然正常工作

### P1 功能验收

- [ ] `generate_ui` 能根据 `techContext` 生成匹配技术栈的代码
- [ ] `generate_ui` 能从 `configPath` 自动检测技术栈
- [ ] `fix_ui_from_screenshot` 能读取 `sourceCodePath` 和 `relatedFiles`

### P2 功能验收

- [ ] `brainstorm` 能读取 `contextFilePath` 提供项目上下文
- [ ] `list_models` 返回结构化的模型能力信息

### 测试验收

- [ ] 所有单元测试通过
- [ ] 安全测试用例覆盖路径遍历、敏感文件等场景
- [ ] 向后兼容性测试通过

---

## 附录：参考资料

- [Anthropic Filesystem MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [fast-glob npm](https://www.npmjs.com/package/fast-glob)
- [MCP Specification](https://modelcontextprotocol.io/specification)
