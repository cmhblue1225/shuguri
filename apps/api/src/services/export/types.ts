export type ExportFormat = 'markdown' | 'html' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeTableOfContents?: boolean
  theme?: 'light' | 'dark'
}

export interface ExportResult {
  content: string
  filename: string
  mimeType: string
  size: number
}

export interface DocumentToExport {
  id: string
  title: string
  docType: string
  sourceVersion: string
  targetVersion: string
  content: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface DiffToExport {
  sourceVersion: string
  targetVersion: string
  summary: string
  totalChanges: number
  categories: {
    newFeatures: ExportDiffItem[]
    behaviorChanges: ExportDiffItem[]
    deprecated: ExportDiffItem[]
    libraryChanges: ExportDiffItem[]
  }
}

export interface ExportDiffItem {
  title: string
  description: string
  category: string
  impact: string
  examples?: Array<{
    before: string
    after: string
    explanation: string
  }>
}
