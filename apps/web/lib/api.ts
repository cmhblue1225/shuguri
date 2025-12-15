// Production: Railway API URL, Development: localhost
const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://shuguridanapi-production.up.railway.app'
    : 'http://localhost:3001')

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

// Types
export interface DiffItem {
  id: string
  title: string
  description: string
  category: 'language' | 'library' | 'compiler'
  impact: 'compile-time' | 'runtime' | 'ub' | 'memory-model'
  examples?: Array<{
    before: string
    after: string
    explanation: string
  }>
  references?: string[]
}

export interface DiffCategory {
  newFeatures: DiffItem[]
  behaviorChanges: DiffItem[]
  deprecated: DiffItem[]
  removed: DiffItem[]
  libraryChanges: DiffItem[]
}

export interface DiffResult {
  source: string
  target: string
  diff: DiffCategory
  summary: string
  totalChanges: number
}

export interface GenerationResult {
  id: string
  sourceVersion: string
  targetVersion: string
  docType: string
  content: string
  format: string
  ragSourcesUsed: number
  generationTimeMs: number
  cached: boolean
  createdAt: string
}

// API Functions
export async function getVersions(): Promise<string[]> {
  const res = await fetchApi<{ versions: string[] }>('/api/versions')
  return res.data?.versions || []
}

export async function getDiffPairs(): Promise<Array<{ source: string; target: string }>> {
  const res = await fetchApi<Array<{ source: string; target: string }>>('/api/diff/pairs')
  return res.data || []
}

export async function analyzeDiff(
  sourceVersion: string,
  targetVersion: string,
  categories?: string[]
): Promise<DiffResult> {
  const res = await fetchApi<DiffResult>('/api/diff', {
    method: 'POST',
    body: JSON.stringify({ sourceVersion, targetVersion, categories }),
  })
  if (!res.data) throw new Error('No data returned')
  return res.data
}

export async function generateDocument(params: {
  sourceVersion: string
  targetVersion: string
  docType: 'migration_guide' | 'release_notes' | 'test_points'
  options: {
    targetLevel: 'beginner' | 'intermediate' | 'senior' | 'compiler-engineer'
    outputLanguage: 'ko' | 'en'
    outputFormat?: 'bullet' | 'table' | 'prose' | 'mixed'
    useRag?: boolean
    ragLimit?: number
  }
  code?: string
  filename?: string
}): Promise<GenerationResult> {
  const res = await fetchApi<GenerationResult>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('No data returned')
  return res.data
}

export async function modernizeCode(params: {
  sourceVersion: string
  targetVersion: string
  code: string
  filename?: string
  outputLanguage?: 'ko' | 'en'
}): Promise<{
  id: string
  sourceVersion: string
  targetVersion: string
  modernizedCode: string
  ragSourcesUsed: number
  generationTimeMs: number
  cached: boolean
}> {
  const res = await fetchApi<{
    id: string
    sourceVersion: string
    targetVersion: string
    modernizedCode: string
    ragSourcesUsed: number
    generationTimeMs: number
    cached: boolean
  }>('/api/generate/modernize', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('No data returned')
  return res.data
}

// Project Types
export interface Project {
  id: string
  name: string
  description: string | null
  sourceVersion: string
  targetVersion: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProjectDocument {
  id: string
  projectId: string
  docType: string
  content: string
  metadata: Record<string, unknown>
  createdAt: string
}

// Project API Functions
export async function getProjects(): Promise<Project[]> {
  const res = await fetchApi<Project[]>('/api/projects')
  return res.data || []
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetchApi<Project>(`/api/projects/${id}`)
  if (!res.data) throw new Error('Project not found')
  return res.data
}

export async function createProject(params: {
  name: string
  description?: string
  sourceVersion: string
  targetVersion: string
  settings?: Record<string, unknown>
}): Promise<Project> {
  const res = await fetchApi<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('Failed to create project')
  return res.data
}

export async function updateProject(
  id: string,
  params: Partial<{
    name: string
    description: string
    sourceVersion: string
    targetVersion: string
    settings: Record<string, unknown>
  }>
): Promise<Project> {
  const res = await fetchApi<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('Failed to update project')
  return res.data
}

export async function deleteProject(id: string): Promise<void> {
  await fetchApi(`/api/projects/${id}`, { method: 'DELETE' })
}

export async function getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const res = await fetchApi<ProjectDocument[]>(`/api/projects/${projectId}/documents`)
  return res.data || []
}

// Export Types
export type ExportFormat = 'markdown' | 'html' | 'json'

export interface ExportResult {
  content: string
  filename: string
  mimeType: string
  size: number
}

// Export API Functions
export async function exportDocument(params: {
  documentId: string
  format: ExportFormat
  includeMetadata?: boolean
  includeTableOfContents?: boolean
  theme?: 'light' | 'dark'
}): Promise<ExportResult> {
  const res = await fetchApi<ExportResult>('/api/export/document', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('Failed to export document')
  return res.data
}

export async function exportDiff(params: {
  sourceVersion: string
  targetVersion: string
  format: ExportFormat
  includeMetadata?: boolean
  includeTableOfContents?: boolean
  theme?: 'light' | 'dark'
}): Promise<ExportResult> {
  const res = await fetchApi<ExportResult>('/api/export/diff', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.data) throw new Error('Failed to export diff')
  return res.data
}

// Upload Types
export interface FileResult {
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  documentId?: string
  chunksCreated?: number
  totalTokens?: number
  error?: string
}

export interface UploadProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  completed: number
  failed: number
  total: number
  files: FileResult[]
}

export interface UploadResult {
  jobId: string
  filesCount: number
  skippedFiles: string[]
}

export interface EmbeddingStats {
  total: number
  byVersion: Record<string, number>
}

// Upload API Functions
export async function uploadDocuments(
  files: File[],
  language: string,
  version: string
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('language', language)
  formData.append('version', version)

  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Upload failed')
  }

  return data.data
}

export async function getUploadStatus(jobId: string): Promise<UploadProgress> {
  const res = await fetchApi<UploadProgress>(`/api/upload/status/${jobId}`)
  if (!res.data) throw new Error('Job not found')
  return res.data
}

export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const res = await fetchApi<EmbeddingStats>('/api/upload/stats')
  if (!res.data) throw new Error('Failed to get stats')
  return res.data
}
