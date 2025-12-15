import { Hono } from 'hono'
import { z } from 'zod'
import { getSupabaseClient } from '../db/supabase.js'
import { createLLMProvider } from '../services/llm/index.js'
import { createEmbeddingProvider } from '../services/embedding/index.js'
import { DocumentRetriever } from '../services/rag/index.js'
import { DocumentGenerator } from '../services/generation/index.js'
import type { CppVersionId, DocType, TargetLevel, OutputLanguage } from '@shuguridan/shared'

const generateRouter = new Hono()

// Validation schema
const generateRequestSchema = z.object({
  sourceVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  targetVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  docType: z.enum(['migration_guide', 'release_notes', 'test_points']),
  options: z.object({
    targetLevel: z.enum(['beginner', 'intermediate', 'senior', 'compiler-engineer']),
    outputLanguage: z.enum(['ko', 'en']),
    outputFormat: z.enum(['bullet', 'table', 'prose', 'mixed']).optional().default('mixed'),
    useRag: z.boolean().optional().default(true),
    ragLimit: z.number().min(1).max(20).optional().default(5),
  }),
  code: z.string().optional(),
  filename: z.string().optional(),
})

// Helper to create generator instance
async function createGenerator() {
  const supabase = await getSupabaseClient()

  // LLM Provider (Claude as default)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey && !openaiKey) {
    throw new Error('Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be configured')
  }

  const llmProvider = anthropicKey
    ? createLLMProvider({
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: 'claude-sonnet-4-5-20250929',
      })
    : createLLMProvider({
        provider: 'openai',
        apiKey: openaiKey!,
        model: 'gpt-4-turbo-preview',
      })

  // RAG Retriever (optional - depends on OpenAI key for embeddings)
  let retriever: DocumentRetriever | undefined

  if (openaiKey) {
    const embeddingProvider = createEmbeddingProvider({
      provider: 'openai',
      apiKey: openaiKey,
    })
    retriever = new DocumentRetriever(supabase, embeddingProvider)
  }

  return new DocumentGenerator(supabase, llmProvider, retriever)
}

// POST /api/generate - Generate document
generateRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = generateRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { sourceVersion, targetVersion, docType, options, code, filename } = parsed.data

    // Validate version order
    const versionOrder = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']
    const sourceIndex = versionOrder.indexOf(sourceVersion)
    const targetIndex = versionOrder.indexOf(targetVersion)

    if (sourceIndex >= targetIndex) {
      return c.json(
        { error: 'Target version must be newer than source version' },
        400
      )
    }

    const generator = await createGenerator()

    const result = await generator.generate({
      sourceVersion: sourceVersion as CppVersionId,
      targetVersion: targetVersion as CppVersionId,
      docType: docType as DocType,
      options: {
        targetLevel: options.targetLevel as TargetLevel,
        outputLanguage: options.outputLanguage as OutputLanguage,
        outputFormat: options.outputFormat as 'bullet' | 'table' | 'prose' | 'mixed',
        useRag: options.useRag,
        ragLimit: options.ragLimit,
      },
      code,
      filename,
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// POST /api/generate/modernize - Modernize code
generateRouter.post('/modernize', async (c) => {
  try {
    const body = await c.req.json()

    const modernizeSchema = z.object({
      sourceVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
      targetVersion: z.enum(['cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
      code: z.string().min(1),
      filename: z.string().optional(),
      outputLanguage: z.enum(['ko', 'en']).optional().default('ko'),
    })

    const parsed = modernizeSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { sourceVersion, targetVersion, code, filename, outputLanguage } = parsed.data

    const generator = await createGenerator()

    const result = await generator.generate({
      sourceVersion: sourceVersion as CppVersionId,
      targetVersion: targetVersion as CppVersionId,
      docType: 'migration_guide',
      options: {
        targetLevel: 'intermediate',
        outputLanguage: outputLanguage as OutputLanguage,
        outputFormat: 'mixed',
        useRag: true,
        ragLimit: 5,
      },
      code,
      filename,
    })

    return c.json({
      success: true,
      data: {
        id: result.id,
        sourceVersion: result.sourceVersion,
        targetVersion: result.targetVersion,
        modernizedCode: result.content,
        ragSourcesUsed: result.ragSourcesUsed,
        generationTimeMs: result.generationTimeMs,
        cached: result.cached,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

export { generateRouter }
