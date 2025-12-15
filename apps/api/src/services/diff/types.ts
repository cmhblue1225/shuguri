import type { CppVersionId, DiffCategory, DiffItem } from '@shuguridan/shared'

export interface VersionDiff {
  id: string
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  categories: DiffCategory
  summary: string
  totalChanges: number
  createdAt: Date
}

export interface DiffAnalysisRequest {
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  categories?: Array<'newFeatures' | 'behaviorChanges' | 'deprecated' | 'libraryChanges'>
}

export interface DiffAnalysisResult {
  source: CppVersionId
  target: CppVersionId
  diff: DiffCategory
  summary: string
  totalChanges: number
}

export interface StoredDiffData {
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  newFeatures: DiffItem[]
  behaviorChanges: DiffItem[]
  deprecated: DiffItem[]
  removed: DiffItem[]
  libraryChanges: DiffItem[]
}
