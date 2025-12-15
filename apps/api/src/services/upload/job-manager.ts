import { v4 as uuidv4 } from 'uuid'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface FileResult {
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  documentId?: string
  chunksCreated?: number
  totalTokens?: number
  error?: string
}

export interface UploadJob {
  id: string
  language: string
  version: string
  status: JobStatus
  totalFiles: number
  processedFiles: number
  files: FileResult[]
  createdAt: Date
  updatedAt: Date
}

// In-memory job storage (consider Redis for production)
const jobs = new Map<string, UploadJob>()

// Auto-cleanup jobs older than 1 hour
const JOB_TTL_MS = 60 * 60 * 1000

export function createJob(
  language: string,
  version: string,
  filenames: string[]
): UploadJob {
  const id = uuidv4()
  const now = new Date()

  const job: UploadJob = {
    id,
    language,
    version,
    status: 'pending',
    totalFiles: filenames.length,
    processedFiles: 0,
    files: filenames.map((filename) => ({
      filename,
      status: 'pending',
    })),
    createdAt: now,
    updatedAt: now,
  }

  jobs.set(id, job)
  scheduleCleanup(id)

  return job
}

export function getJob(jobId: string): UploadJob | null {
  return jobs.get(jobId) || null
}

export function updateJobStatus(jobId: string, status: JobStatus): void {
  const job = jobs.get(jobId)
  if (job) {
    job.status = status
    job.updatedAt = new Date()
  }
}

export function updateFileStatus(
  jobId: string,
  filename: string,
  update: Partial<FileResult>
): void {
  const job = jobs.get(jobId)
  if (!job) return

  const file = job.files.find((f) => f.filename === filename)
  if (file) {
    Object.assign(file, update)

    // Update processed count
    job.processedFiles = job.files.filter(
      (f) => f.status === 'completed' || f.status === 'failed'
    ).length

    // Update job status
    if (job.processedFiles === job.totalFiles) {
      const hasFailures = job.files.some((f) => f.status === 'failed')
      job.status = hasFailures ? 'completed' : 'completed'
    } else if (job.files.some((f) => f.status === 'processing')) {
      job.status = 'processing'
    }

    job.updatedAt = new Date()
  }
}

export function getJobProgress(jobId: string): {
  status: JobStatus
  progress: number
  completed: number
  failed: number
  total: number
  files: FileResult[]
} | null {
  const job = jobs.get(jobId)
  if (!job) return null

  const completed = job.files.filter((f) => f.status === 'completed').length
  const failed = job.files.filter((f) => f.status === 'failed').length
  const progress = job.totalFiles > 0
    ? Math.round((job.processedFiles / job.totalFiles) * 100)
    : 0

  return {
    status: job.status,
    progress,
    completed,
    failed,
    total: job.totalFiles,
    files: job.files,
  }
}

function scheduleCleanup(jobId: string): void {
  setTimeout(() => {
    jobs.delete(jobId)
  }, JOB_TTL_MS)
}

export function deleteJob(jobId: string): boolean {
  return jobs.delete(jobId)
}

// Get all active jobs (for debugging)
export function getAllJobs(): UploadJob[] {
  return Array.from(jobs.values())
}
