import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider } from './types.js'

// Claude API 모델 ID (2025년 기준)
// - claude-sonnet-4-5-20250929: 최신 Sonnet 4.5 (권장, 64K max output)
// - claude-haiku-4-5-20251001: 최신 Haiku 4.5 (빠른 응답, 64K max output)
// - claude-opus-4-5-20251101: 최신 Opus 4.5 (최고 성능, 64K max output)
// 참고: https://platform.claude.com/docs/en/about-claude/models/overview
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_MAX_TOKENS = 16384 // 기본 16K (최대 64K까지 가능)

const DEFAULT_SYSTEM_PROMPT =
  'You are a C++ expert specializing in language standard migrations. Only provide answers based on official C++ standard documentation. If uncertain, say so.'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ClaudeProvider implements LLMProvider {
  name = 'claude'
  private client: Anthropic
  private model: string
  private maxTokens: number

  constructor(apiKey: string, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS) {
    this.client = new Anthropic({ apiKey })
    this.model = model
    this.maxTokens = maxTokens
  }

  async generate(prompt: string, context?: string[]): Promise<string> {
    const contextStr = context?.length
      ? `\n\n[CONTEXT]\n${context.join('\n\n')}`
      : ''

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt + contextStr,
        },
      ],
      system: DEFAULT_SYSTEM_PROMPT,
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }

  /**
   * 스트리밍 채팅 생성 (SSE용)
   * 멀티턴 대화 히스토리와 RAG 컨텍스트를 지원
   */
  async *generateStream(
    messages: ChatMessage[],
    context?: string[],
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const contextStr = context?.length
      ? `\n\n[참고 문서]\n${context.join('\n\n---\n\n')}`
      : ''

    // 시스템 프롬프트에 컨텍스트 추가
    const fullSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT
    const systemWithContext = contextStr
      ? `${fullSystemPrompt}\n\n다음은 참고할 수 있는 문서입니다:${contextStr}`
      : fullSystemPrompt

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      system: systemWithContext,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }
}
