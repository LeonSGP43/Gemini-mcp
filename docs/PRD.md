# Gemini MCP v1.2.0 更新 PRD

## 版本信息
- **当前版本**: v1.1.1
- **目标版本**: v1.2.0
- **更新日期**: 2026-01-27
- **作者**: LKbaba

---

## 1. 更新概述

本次更新主要目标：**精简工具、增加模型选择灵活性**

### 1.1 删除的工具（4个）

| 工具名 | 删除原因 |
|--------|---------|
| `list_models` | 模型列表固定，无需动态查询 |
| `create_animation` | 功能与其他工具重叠 |
| `fix_ui_from_screenshot` | 使用率低，精简工具集 |
| `generate_ui` | 使用率低，精简工具集 |

### 1.2 保留的工具（4个）

| 工具名 | 功能 |
|--------|------|
| `gemini_multimodal_query` | 多模态查询（图片+文本） |
| `gemini_analyze_content` | 内容分析（代码/文档/数据） |
| `gemini_analyze_codebase` | 代码库分析（100万上下文） |
| `gemini_brainstorm` | 创意头脑风暴 |
| `gemini_search` | Google 搜索（实时信息） |

### 1.3 新增功能

**所有工具新增 `model` 参数**，允许用户选择使用的模型。

---

## 2. 模型配置

### 2.1 支持的模型（2个）

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `gemini-3-pro-preview` | Gemini 3.0 Pro | **默认**，最强推理能力，100万上下文 |
| `gemini-3-flash-preview` | Gemini 3.0 Flash | 快速响应，适合简单任务 |

### 2.2 model 参数定义

```typescript
{
  model: {
    type: 'string',
    enum: ['gemini-3-pro-preview', 'gemini-3-flash-preview'],
    description: '使用的 Gemini 模型 (可选，默认: gemini-3-pro-preview)'
  }
}
```

---

## 3. 工具参数更新

### 3.1 gemini_multimodal_query

```typescript
{
  prompt: string,           // 必填：问题或指令
  images: string[],         // 必填：图片路径或 Base64
  outputFormat?: string,    // 可选：text | code | json
  context?: string,         // 可选：额外上下文
  model?: string            // 新增：模型选择
}
```

### 3.2 gemini_analyze_content

```typescript
{
  content?: string,         // 内容（与 filePath 二选一）
  filePath?: string,        // 文件路径（与 content 二选一）
  type?: string,            // 可选：code | document | data | auto
  task?: string,            // 可选：summarize | review | explain | optimize | debug
  language?: string,        // 可选：编程语言
  focus?: string[],         // 可选：关注点
  outputFormat?: string,    // 可选：text | json | markdown
  model?: string            // 新增：模型选择
}
```

### 3.3 gemini_analyze_codebase

```typescript
{
  directory?: string,       // 目录路径（三种输入方式之一）
  filePaths?: string[],     // 文件路径列表（三种输入方式之一）
  files?: object[],         // 文件内容数组（三种输入方式之一）
  include?: string[],       // 可选：包含的 glob 模式
  exclude?: string[],       // 可选：排除的 glob 模式
  focus?: string,           // 可选：architecture | security | performance | dependencies | patterns
  outputFormat?: string,    // 可选：markdown | json
  model?: string            // 新增：模型选择
}
```

### 3.4 gemini_brainstorm

```typescript
{
  topic: string,            // 必填：主题
  context?: string,         // 可选：额外上下文
  contextFilePath?: string, // 可选：上下文文件路径
  contextFiles?: string[],  // 可选：多个上下文文件
  count?: number,           // 可选：生成数量，默认 5
  style?: string,           // 可选：innovative | practical | radical
  model?: string            // 新增：模型选择
}
```

### 3.5 gemini_search

```typescript
{
  query: string,            // 必填：搜索查询
  context?: string,         // 可选：额外上下文
  outputFormat?: string,    // 可选：text | json
  model?: string            // 新增：模型选择
}
```

---

## 4. 使用示例

### 4.1 使用默认模型

```json
{
  "name": "gemini_analyze_content",
  "arguments": {
    "filePath": "./src/index.ts",
    "task": "review"
  }
}
```

### 4.2 指定使用 Flash 模型（更快）

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

### 4.3 复杂任务使用 Pro 模型

```json
{
  "name": "gemini_analyze_codebase",
  "arguments": {
    "directory": "./src",
    "focus": "architecture",
    "model": "gemini-3-pro-preview"
  }
}
```

---

## 5. 技术实现

### 5.1 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `src/config/constants.ts` | 删除已移除工具的常量 |
| `src/tools/definitions.ts` | 删除工具定义，添加 model 参数 |
| `src/tools/index.ts` | 删除导出 |
| `src/server.ts` | 删除工具路由 |
| `src/tools/*.ts` | 各工具支持 model 参数 |

### 5.2 需要删除的文件

| 文件 | 说明 |
|------|------|
| `src/tools/list-models.ts` | list_models 工具 |
| `src/tools/generate-ui.ts` | generate_ui 工具 |
| `src/tools/fix-ui.ts` | fix_ui_from_screenshot 工具 |

---

## 6. 兼容性

- **向后兼容**: `model` 参数可选，默认行为不变
- **Breaking Change**: 删除的 4 个工具不再可用

---

## 7. 测试清单

- [ ] 删除的工具调用返回正确错误
- [ ] 保留的 5 个工具正常工作
- [ ] model 参数为空时使用默认模型
- [ ] model 参数指定 flash 时使用 flash 模型
- [ ] 无效 model 值返回错误
