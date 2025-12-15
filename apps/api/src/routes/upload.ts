import { Hono } from 'hono'
import { getSupabaseClient } from '../db/supabase.js'
import { createEmbeddingProvider } from '../services/embedding/index.js'
import { DocumentProcessor } from '../services/rag/index.js'
import {
  parseFile,
  isSupportedFile,
  createJob,
  getJob,
  getJobProgress,
  updateFileStatus,
  updateJobStatus,
} from '../services/upload/index.js'
import type { CppVersionId } from '@shuguridan/shared'

const uploadRouter = new Hono()

// Supported versions for all C++ standards
const SUPPORTED_VERSIONS = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26'] as const
type SupportedVersion = (typeof SUPPORTED_VERSIONS)[number]

function isValidVersion(version: string): version is SupportedVersion {
  return SUPPORTED_VERSIONS.includes(version as SupportedVersion)
}

// Helper to get processor instance
async function getProcessor() {
  const supabase = await getSupabaseClient()
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  const embeddingProvider = createEmbeddingProvider({
    provider: 'openai',
    apiKey: openaiKey,
  })
  return new DocumentProcessor(supabase, embeddingProvider)
}

// POST /api/upload - Upload and process files
uploadRouter.post('/', async (c) => {
  try {
    const formData = await c.req.formData()

    const language = formData.get('language') as string
    const version = formData.get('version') as string
    const files: File[] = []

    // Collect all files from form data
    for (const [key, value] of formData.entries()) {
      if (key === 'files' || key.startsWith('file')) {
        if (value instanceof File) {
          files.push(value)
        }
      }
    }

    // Validation
    if (!language) {
      return c.json({ error: 'Language is required' }, 400)
    }

    if (!version) {
      return c.json({ error: 'Version is required' }, 400)
    }

    if (!isValidVersion(version)) {
      return c.json(
        { error: `Invalid version. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}` },
        400
      )
    }

    if (files.length === 0) {
      return c.json({ error: 'No files uploaded' }, 400)
    }

    // Filter supported files
    const supportedFiles = files.filter((f) => isSupportedFile(f.name))
    const unsupportedFiles = files.filter((f) => !isSupportedFile(f.name))

    if (supportedFiles.length === 0) {
      return c.json(
        { error: 'No supported files. Supported formats: .md, .txt, .pdf' },
        400
      )
    }

    // Create job
    const job = createJob(
      language,
      version,
      supportedFiles.map((f) => f.name)
    )

    // Start background processing
    processFilesInBackground(job.id, supportedFiles, version as CppVersionId)

    return c.json({
      success: true,
      data: {
        jobId: job.id,
        filesCount: supportedFiles.length,
        skippedFiles: unsupportedFiles.map((f) => f.name),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// GET /api/upload/status/:jobId - Get job status
uploadRouter.get('/status/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const progress = getJobProgress(jobId)

    if (!progress) {
      return c.json({ error: 'Job not found' }, 404)
    }

    return c.json({
      success: true,
      data: progress,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// GET /api/upload/stats - Get embedding statistics by version
uploadRouter.get('/stats', async (c) => {
  try {
    const processor = await getProcessor()

    const stats: Record<string, number> = {}
    let total = 0

    for (const version of SUPPORTED_VERSIONS) {
      const count = await processor.getDocumentCount(version as CppVersionId)
      stats[version] = count
      total += count
    }

    return c.json({
      success: true,
      data: {
        total,
        byVersion: stats,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Background processing function
async function processFilesInBackground(
  jobId: string,
  files: File[],
  versionId: CppVersionId
) {
  const job = getJob(jobId)
  if (!job) return

  updateJobStatus(jobId, 'processing')

  let processor: DocumentProcessor
  try {
    processor = await getProcessor()
  } catch (error) {
    // Mark all files as failed
    for (const file of files) {
      updateFileStatus(jobId, file.name, {
        status: 'failed',
        error: 'Failed to initialize processor',
      })
    }
    updateJobStatus(jobId, 'failed')
    return
  }

  // Process files sequentially to avoid overwhelming the API
  for (const file of files) {
    updateFileStatus(jobId, file.name, { status: 'processing' })

    try {
      // Parse file content
      const parsed = await parseFile(file)

      // Create title from filename (remove extension)
      const title = file.name.replace(/\.[^/.]+$/, '')

      // Ingest document
      const result = await processor.ingestDocument({
        versionId,
        title,
        content: parsed.content,
        metadata: {
          category: 'language',
          section: 'Uploaded Document',
        },
      })

      updateFileStatus(jobId, file.name, {
        status: 'completed',
        documentId: result.documentId,
        chunksCreated: result.chunksCreated,
        totalTokens: result.totalTokens,
      })
    } catch (error) {
      updateFileStatus(jobId, file.name, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  updateJobStatus(jobId, 'completed')
}

export { uploadRouter }
