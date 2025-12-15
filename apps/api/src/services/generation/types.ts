import type { CppVersionId, DocType, TargetLevel, OutputLanguage, DocFormat } from '@shuguridan/shared'

export interface GenerationRequest {
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  docType: DocType
  options: GenerationOptions
  code?: string
  filename?: string
}

export interface GenerationOptions {
  targetLevel: TargetLevel
  outputLanguage: OutputLanguage
  outputFormat: 'bullet' | 'table' | 'prose' | 'mixed'
  useRag?: boolean
  ragLimit?: number
}

export interface GenerationResult {
  id: string
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  docType: DocType
  content: string
  format: DocFormat
  ragSourcesUsed: number
  generationTimeMs: number
  cached: boolean
  createdAt: Date
}

export interface CacheEntry {
  promptHash: string
  response: string
  model: string
  createdAt: Date
  expiresAt: Date
}
