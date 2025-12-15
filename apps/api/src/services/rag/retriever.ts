import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmbeddingProvider } from '../embedding/types.js'
import type { RetrievedDocument, RetrievalOptions } from './types.js'

const DEFAULT_THRESHOLD = 0.5
const DEFAULT_LIMIT = 10

export class DocumentRetriever {
  private supabase: SupabaseClient
  private embeddingProvider: EmbeddingProvider

  constructor(supabase: SupabaseClient, embeddingProvider: EmbeddingProvider) {
    this.supabase = supabase
    this.embeddingProvider = embeddingProvider
  }

  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedDocument[]> {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD
    const limit = options.limit ?? DEFAULT_LIMIT
    const filterVersion = options.filterVersion ?? null

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingProvider.embed(query)

    // Call the similarity search function
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_version: filterVersion,
    })

    if (error) {
      throw new Error(`Failed to retrieve documents: ${error.message}`)
    }

    return (data || []).map((doc: {
      id: string
      version_id: string
      title: string
      content: string
      metadata: Record<string, unknown>
      similarity: number
    }) => ({
      id: doc.id,
      versionId: doc.version_id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      similarity: doc.similarity,
    }))
  }

  async retrieveMultiVersion(
    query: string,
    versions: string[],
    options: Omit<RetrievalOptions, 'filterVersion'> = {}
  ): Promise<Map<string, RetrievedDocument[]>> {
    const results = new Map<string, RetrievedDocument[]>()

    await Promise.all(
      versions.map(async (version) => {
        const docs = await this.retrieve(query, {
          ...options,
          filterVersion: version as RetrievalOptions['filterVersion'],
        })
        results.set(version, docs)
      })
    )

    return results
  }

  formatContextForLLM(documents: RetrievedDocument[]): string {
    if (documents.length === 0) {
      return 'No relevant documents found.'
    }

    return documents
      .map((doc, index) => {
        const header = `[Document ${index + 1}] ${doc.title} (${doc.versionId})`
        const similarity = `Relevance: ${(doc.similarity * 100).toFixed(1)}%`
        return `${header}\n${similarity}\n\n${doc.content}`
      })
      .join('\n\n---\n\n')
  }
}
