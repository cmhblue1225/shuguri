import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { getSupabaseClient } from '../db/supabase.js'
import { ClaudeProvider, type ChatMessage } from '../services/llm/claude.js'
import { createEmbeddingProvider } from '../services/embedding/index.js'
import { DocumentRetriever } from '../services/rag/index.js'

const chatRouter = new Hono()

// 채팅 요청 스키마
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ),
  sourceVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  targetVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  useRag: z.boolean().optional().default(true),
  ragLimit: z.number().min(1).max(10).optional().default(5),
  responseMode: z.enum(['short', 'detailed']).optional().default('detailed'),
})

/**
 * POST /api/chat - SSE 스트리밍 채팅
 * 멀티턴 대화 히스토리와 RAG 컨텍스트를 지원
 */
chatRouter.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = chatRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { error: 'Validation failed', details: parsed.error.errors },
      400
    )
  }

  const { messages, sourceVersion, targetVersion, useRag, ragLimit, responseMode } = parsed.data

  // API 키 확인
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)
  }

  // RAG 컨텍스트 가져오기
  let ragContext: string[] = []

  if (useRag && openaiKey) {
    try {
      const supabase = await getSupabaseClient()
      const embeddingProvider = createEmbeddingProvider({
        provider: 'openai',
        apiKey: openaiKey,
      })
      const retriever = new DocumentRetriever(supabase, embeddingProvider)

      // 마지막 사용자 메시지로 RAG 검색
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      if (lastUserMessage) {
        const resultsMap = await retriever.retrieveMultiVersion(
          lastUserMessage.content,
          [sourceVersion, targetVersion],
          { limit: ragLimit }
        )
        // 모든 버전의 결과를 합치고 유니크하게 처리
        const allResults = [...resultsMap.values()].flat()
        const uniqueResults = allResults.filter((r, idx, arr) =>
          arr.findIndex(x => x.id === r.id) === idx
        ).slice(0, ragLimit)
        ragContext = uniqueResults.map(
          (r) => `[${r.title}] (관련도: ${Math.round(r.similarity * 100)}%)\n${r.content}`
        )
      }
    } catch (err) {
      console.error('RAG retrieval error:', err)
      // RAG 실패해도 계속 진행
    }
  }

  // 응답 모드에 따른 지시사항
  const responseModeInstruction = responseMode === 'short'
    ? '답변은 간결하게 핵심만 3-5문장으로 작성하세요. 코드 예시는 필요한 경우에만 최소화하여 포함하세요.'
    : '답변은 상세하게 작성하고, 관련 코드 예시와 설명을 충분히 포함하세요.'

  // 시스템 프롬프트 커스터마이즈
  const systemPrompt = `당신은 C++ 전문가입니다. ${sourceVersion.toUpperCase()}에서 ${targetVersion.toUpperCase()}로의 마이그레이션에 대해 정확한 답변을 제공합니다.

답변 시 다음 사항을 지켜주세요:
1. 공식 C++ 표준 문서를 기반으로 정확한 정보를 제공하세요.
2. ${responseModeInstruction}
3. 마이그레이션 시 주의사항이나 잠재적 문제점을 언급하세요.
4. 한글로 답변하세요.
5. 불확실한 경우 명확히 밝히세요.`

  // SSE 스트리밍 응답
  return streamSSE(c, async (stream) => {
    try {
      const claude = new ClaudeProvider(anthropicKey)

      for await (const chunk of claude.generateStream(
        messages as ChatMessage[],
        ragContext,
        systemPrompt
      )) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'content', content: chunk }),
        })
      }

      // 완료 이벤트
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'done',
          ragSourcesUsed: ragContext.length,
        }),
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', error: errorMessage }),
      })
    }
  })
})

export { chatRouter }
