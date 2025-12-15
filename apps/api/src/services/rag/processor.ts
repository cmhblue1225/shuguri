import type { SupabaseClient } from '@supabase/supabase-js'
import type { CppVersionId } from '@shuguridan/shared'
import type { EmbeddingProvider } from '../embedding/types.js'
import { chunkText, estimateTokenCount } from './chunker.js'
import type { ChunkMetadata } from './types.js'

export interface IngestDocumentInput {
  versionId: CppVersionId
  title: string
  content: string
  metadata?: Partial<ChunkMetadata>
}

export interface IngestResult {
  documentId: string
  chunksCreated: number
  totalTokens: number
}

export interface BatchIngestResult {
  successful: IngestResult[]
  failed: Array<{ input: IngestDocumentInput; error: string }>
}

export class DocumentProcessor {
  private supabase: SupabaseClient
  private embeddingProvider: EmbeddingProvider

  constructor(supabase: SupabaseClient, embeddingProvider: EmbeddingProvider) {
    this.supabase = supabase
    this.embeddingProvider = embeddingProvider
  }

  async ingestDocument(input: IngestDocumentInput): Promise<IngestResult> {
    const { versionId, title, content, metadata = {} } = input

    // Check if content needs chunking
    const tokenCount = estimateTokenCount(content)
    const needsChunking = tokenCount > 500

    if (!needsChunking) {
      // Single document, no chunking needed
      const embedding = await this.embeddingProvider.embed(content)

      const { data, error } = await this.supabase
        .from('spec_documents')
        .insert({
          version_id: versionId,
          title,
          content,
          embedding,
          metadata: {
            ...metadata,
            chunkIndex: 0,
            totalChunks: 1,
          },
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to insert document: ${error.message}`)
      }

      return {
        documentId: data.id,
        chunksCreated: 1,
        totalTokens: tokenCount,
      }
    }

    // Chunk the content
    const chunks = chunkText(content, { maxTokens: 500, overlapTokens: 50 })
    const totalChunks = chunks.length

    // Generate embeddings for all chunks
    const embeddings = await this.embeddingProvider.embedBatch(chunks)

    // Prepare insert data
    const insertData = chunks.map((chunkContent, index) => ({
      version_id: versionId,
      title: `${title} (Part ${index + 1}/${totalChunks})`,
      content: chunkContent,
      embedding: embeddings[index],
      metadata: {
        ...metadata,
        originalTitle: title,
        chunkIndex: index,
        totalChunks,
      },
    }))

    // Insert all chunks
    const { data, error } = await this.supabase
      .from('spec_documents')
      .insert(insertData)
      .select('id')

    if (error) {
      throw new Error(`Failed to insert document chunks: ${error.message}`)
    }

    return {
      documentId: data[0].id,
      chunksCreated: totalChunks,
      totalTokens: tokenCount,
    }
  }

  async ingestBatch(inputs: IngestDocumentInput[]): Promise<BatchIngestResult> {
    const results: BatchIngestResult = {
      successful: [],
      failed: [],
    }

    // Process in parallel with concurrency limit
    const CONCURRENCY = 5
    for (let i = 0; i < inputs.length; i += CONCURRENCY) {
      const batch = inputs.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.allSettled(
        batch.map((input) => this.ingestDocument(input))
      )

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.successful.push(result.value)
        } else {
          results.failed.push({
            input: batch[index],
            error: result.reason?.message || 'Unknown error',
          })
        }
      })
    }

    return results
  }

  async deleteByVersion(versionId: CppVersionId): Promise<number> {
    const { data, error } = await this.supabase
      .from('spec_documents')
      .delete()
      .eq('version_id', versionId)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete documents: ${error.message}`)
    }

    return data?.length || 0
  }

  async getDocumentCount(versionId?: CppVersionId): Promise<number> {
    let query = this.supabase
      .from('spec_documents')
      .select('id', { count: 'exact', head: true })

    if (versionId) {
      query = query.eq('version_id', versionId)
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count documents: ${error.message}`)
    }

    return count || 0
  }
}
