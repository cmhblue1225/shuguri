import type { CppVersionId } from '@shuguridan/shared'

export interface DocumentChunk {
  title: string
  content: string
  versionId: CppVersionId
  metadata: ChunkMetadata
}

export interface ChunkMetadata {
  category: 'language' | 'library' | 'compiler'
  section: string
  feature?: string
  url?: string
  chunkIndex: number
  totalChunks: number
}

export interface RetrievedDocument {
  id: string
  versionId: string
  title: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export interface RetrievalOptions {
  threshold?: number
  limit?: number
  filterVersion?: CppVersionId
}

export interface ChunkingOptions {
  maxTokens?: number
  overlapTokens?: number
}
