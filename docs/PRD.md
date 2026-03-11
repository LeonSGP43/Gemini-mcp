# Gemini MCP 双助手 PRD

## 目标

把当前 Gemini MCP 收敛成两个对 Codex 友好的高频工具：

- `gemini_brainstorm_assist`
- `gemini_acceptance_assist`

重点不是“能力越多越好”，而是：

- 工具选择稳定
- 输入参数低心智负担
- 输出结构足够稳定，方便 Codex 消费
- 默认模型和默认行为偏高性能

## 产品原则

1. 公开 MCP 面尽量小。
2. 通用能力优先做内部实现，不急着暴露成公共 tool。
3. 输出必须结构化，便于代理消费。
4. 默认参数应服务 Codex 常见工作流，而不是暴露 Gemini 全量原语。

## 公开工具

### 1. `gemini_brainstorm_assist`

用途：

- 架构选型
- 功能方向讨论
- 实现方案对比
- 下一步执行建议

输入：

```typescript
{
  topic: string
  goal?: string
  context?: string
  contextFilePath?: string
  contextFiles?: string[]
  constraints?: string[]
  count?: number
  mode?: 'explore' | 'refine' | 'ship'
  model?: 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview'
}
```

输出：

```typescript
{
  topic: string
  mode: 'explore' | 'refine' | 'ship'
  summary: string
  recommendedDirection: string
  ideas: Array<{
    title: string
    rationale: string
    benefits: string[]
    risks: string[]
    implementationOutline: string[]
  }>
  nextSteps: string[]
}
```

默认模型：

- `gemini-3-flash-preview`

原因：

- 头脑风暴更需要交互速度
- 大多数场景不需要一上来就走最重模型

### 2. `gemini_acceptance_assist`

用途：

- 文件验收
- 代码改动 review
- 对照明确标准做 pass / fail 判断
- 输出阻塞问题与覆盖缺口

输入：

```typescript
{
  acceptanceCriteria: string
  context?: string
  filePath?: string
  content?: string
  directory?: string
  filePaths?: string[]
  files?: Array<{ path: string; content: string }>
  include?: string[]
  exclude?: string[]
  focus?: Array<
    'correctness' |
    'behavior' |
    'security' |
    'performance' |
    'tests' |
    'maintainability'
  >
  strictness?: 'standard' | 'strict'
  model?: 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview'
}
```

要求：

- 一次只能提供一种输入源
- 输出必须区分 `blockingFindings` 与 `nonBlockingFindings`

输出：

```typescript
{
  verdict: 'pass' | 'needs_work' | 'fail'
  summary: string
  blockingFindings: Array<{
    title: string
    severity: 'high' | 'medium' | 'low'
    description: string
    location?: string
    suggestion?: string
  }>
  nonBlockingFindings: Array<{
    title: string
    severity: 'high' | 'medium' | 'low'
    description: string
    location?: string
    suggestion?: string
  }>
  coverageGaps: string[]
  recommendedNextSteps: string[]
}
```

默认模型：

- `gemini-3.1-pro-preview`

原因：

- 验收更强调判断质量
- 对 blocking issue 的误判成本更高

## 不再作为公共工具暴露的能力

以下能力可以保留在代码库中作为内部实现，但不再建议作为公共 MCP tool 暴露：

- `gemini_multimodal_query`
- `gemini_video_analyze`
- `gemini_analyze_content`
- `gemini_analyze_codebase`
- `gemini_brainstorm`
- `gemini_search`

原因：

- 与新双助手存在明显能力重叠
- 增加 Codex 的工具选择歧义
- 扩大文档、测试、schema、运行时 contract 的维护成本

## 性能策略

### Brainstorm

- 默认走 Flash
- 输入上下文总量做限制
- 输出保持结构化，减少二次整理成本

### Acceptance

- 默认走 Pro
- 限制单次文件数和总字节数
- 对代码库场景要求更高推理深度

## 工程要求

1. `tools/list` 只返回两个公开工具。
2. README 与 PRD 只描述这两个公开工具。
3. 旧工具源文件可以保留，但不能继续出现在公共 schema 里。
4. 默认行为必须有明确偏向：
   - brainstorm 偏速度
   - acceptance 偏判断质量
