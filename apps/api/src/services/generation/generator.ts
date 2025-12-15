import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LLMProvider } from '../llm/types.js'
import type { DocumentRetriever } from '../rag/retriever.js'
import { analyzeDiff } from '../diff/index.js'
import { getPromptBuilder, getSystemPrompt, buildCodeModernizationPrompt } from '../prompts/index.js'
import type { PromptContext, CodeModernizationContext } from '../prompts/types.js'
import type { GenerationRequest, GenerationResult, GenerationOptions } from './types.js'

const DEFAULT_RAG_LIMIT = 5
const CACHE_EXPIRY_HOURS = 24

export class DocumentGenerator {
  private supabase: SupabaseClient
  private llmProvider: LLMProvider
  private retriever: DocumentRetriever | null

  constructor(
    supabase: SupabaseClient,
    llmProvider: LLMProvider,
    retriever?: DocumentRetriever
  ) {
    this.supabase = supabase
    this.llmProvider = llmProvider
    this.retriever = retriever || null
  }

  private hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex')
  }

  private async checkCache(promptHash: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('llm_cache')
      .select('response')
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    return data.response
  }

  private async saveToCache(promptHash: string, response: string, model: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + CACHE_EXPIRY_HOURS)

    await this.supabase.from('llm_cache').upsert({
      prompt_hash: promptHash,
      response,
      model,
      expires_at: expiresAt.toISOString(),
    })
  }

  private async retrieveContext(
    query: string,
    sourceVersion: string,
    targetVersion: string,
    limit: number
  ): Promise<{ context: string; sourcesUsed: number }> {
    if (!this.retriever) {
      return { context: 'No RAG context available.', sourcesUsed: 0 }
    }

    try {
      // Retrieve from both source and target versions
      const [sourceDocs, targetDocs] = await Promise.all([
        this.retriever.retrieve(query, { filterVersion: sourceVersion as any, limit: Math.ceil(limit / 2) }),
        this.retriever.retrieve(query, { filterVersion: targetVersion as any, limit: Math.ceil(limit / 2) }),
      ])

      const allDocs = [...sourceDocs, ...targetDocs]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      if (allDocs.length === 0) {
        return { context: 'No relevant documents found in knowledge base.', sourcesUsed: 0 }
      }

      const context = this.retriever.formatContextForLLM(allDocs)
      return { context, sourcesUsed: allDocs.length }
    } catch {
      return { context: 'RAG retrieval failed.', sourcesUsed: 0 }
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now()
    const { sourceVersion, targetVersion, docType, options, code, filename } = request

    // Get diff data
    const diffResult = await analyzeDiff({ sourceVersion, targetVersion })

    // Build RAG query based on diff summary
    const ragQuery = `${sourceVersion} to ${targetVersion} migration: ${diffResult.summary}`
    const ragLimit = options.ragLimit ?? DEFAULT_RAG_LIMIT
    const useRag = options.useRag !== false

    // Retrieve RAG context
    const { context: ragContext, sourcesUsed } = useRag
      ? await this.retrieveContext(ragQuery, sourceVersion, targetVersion, ragLimit)
      : { context: 'RAG disabled.', sourcesUsed: 0 }

    // Build prompt based on type
    let userPrompt: string
    const systemPrompt = getSystemPrompt(docType)

    if (code) {
      // Code modernization request
      const codeContext: CodeModernizationContext = {
        sourceVersion,
        targetVersion,
        diffSummary: JSON.stringify(diffResult.diff, null, 2),
        ragContext,
        outputLanguage: options.outputLanguage,
        targetLevel: options.targetLevel,
        oldCode: code,
        filename,
      }
      userPrompt = buildCodeModernizationPrompt(codeContext)
    } else {
      // Document generation request
      const promptContext: PromptContext = {
        sourceVersion,
        targetVersion,
        diffSummary: JSON.stringify(diffResult.diff, null, 2),
        ragContext,
        outputLanguage: options.outputLanguage,
        targetLevel: options.targetLevel,
      }
      const promptBuilder = getPromptBuilder(docType)
      userPrompt = promptBuilder(promptContext)
    }

    // Check cache
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
    const promptHash = this.hashPrompt(fullPrompt)
    const cachedResponse = await this.checkCache(promptHash)

    let content: string
    let cached = false

    if (cachedResponse) {
      content = cachedResponse
      cached = true
    } else {
      // Generate with LLM
      content = await this.llmProvider.generate(userPrompt, [systemPrompt])

      // Save to cache
      await this.saveToCache(promptHash, content, this.llmProvider.name)
    }

    const generationTimeMs = Date.now() - startTime

    return {
      id: crypto.randomUUID(),
      sourceVersion,
      targetVersion,
      docType,
      content,
      format: 'markdown',
      ragSourcesUsed: sourcesUsed,
      generationTimeMs,
      cached,
      createdAt: new Date(),
    }
  }
}
