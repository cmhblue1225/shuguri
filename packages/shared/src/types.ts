// C++ Version Types
export type CppVersionId = 'cpp98' | 'cpp03' | 'cpp11' | 'cpp14' | 'cpp17' | 'cpp20' | 'cpp23' | 'cpp26'

export interface CppVersion {
  id: CppVersionId
  name: string
  year: number
  standardDoc: string
  features: string[]
}

// Diff Types
export interface DiffCategory {
  newFeatures: DiffItem[]
  behaviorChanges: DiffItem[]
  deprecated: DiffItem[]
  removed: DiffItem[]
  libraryChanges: DiffItem[]
}

export interface DiffItem {
  id: string
  title: string
  description: string
  category: 'language' | 'library' | 'compiler'
  impact: 'compile-time' | 'runtime' | 'ub' | 'memory-model'
  examples?: CodeExample[]
  references?: string[]
}

export interface CodeExample {
  before: string
  after: string
  explanation: string
}

// Project Types
export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

// Document Types
export type DocType = 'migration_guide' | 'release_notes' | 'test_points'
export type DocFormat = 'markdown' | 'html' | 'pdf'
export type TargetLevel = 'beginner' | 'intermediate' | 'senior' | 'compiler-engineer'
export type OutputLanguage = 'ko' | 'en'

export interface GeneratedDoc {
  id: string
  diffResultId: string
  docType: DocType
  content: string
  format: DocFormat
  options: GenerationOptions
  createdAt: Date
}

export interface GenerationOptions {
  targetLevel: TargetLevel
  outputLanguage: OutputLanguage
  outputFormat: 'bullet' | 'table' | 'prose' | 'mixed'
}

// API Request/Response Types
export interface DiffRequest {
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  categories?: string[]
}

export interface DiffResponse {
  id: string
  source: CppVersionId
  target: CppVersionId
  diff: DiffCategory
  createdAt: Date
}

export interface GenerateRequest {
  diffId: string
  docType: DocType
  options: GenerationOptions
}

export interface GenerateResponse {
  id: string
  diffId: string
  docType: DocType
  content: string
  format: DocFormat
  createdAt: Date
}
