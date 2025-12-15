import { Hono } from 'hono'
import { z } from 'zod'
import { getSupabaseClient } from '../db/supabase.js'
import { createEmbeddingProvider } from '../services/embedding/index.js'
import { DocumentProcessor } from '../services/rag/index.js'
import type { CppVersionId } from '@shuguridan/shared'

const ingestRouter = new Hono()

// Validation schemas
const metadataSchema = z.object({
  category: z.enum(['language', 'library', 'compiler']).optional(),
  section: z.string().optional(),
  feature: z.string().optional(),
  url: z.string().url().optional(),
})

const ingestDocumentSchema = z.object({
  versionId: z.enum(['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: metadataSchema.optional(),
})

const batchIngestSchema = z.object({
  documents: z.array(ingestDocumentSchema).min(1).max(100),
})

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

// POST /api/ingest - Ingest single document
ingestRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = ingestDocumentSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const processor = await getProcessor()
    const result = await processor.ingestDocument({
      versionId: parsed.data.versionId as CppVersionId,
      title: parsed.data.title,
      content: parsed.data.content,
      metadata: parsed.data.metadata,
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// POST /api/ingest/batch - Ingest multiple documents
ingestRouter.post('/batch', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = batchIngestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const processor = await getProcessor()
    const result = await processor.ingestBatch(
      parsed.data.documents.map((doc) => ({
        versionId: doc.versionId as CppVersionId,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
      }))
    )

    return c.json({
      success: true,
      data: {
        totalProcessed: parsed.data.documents.length,
        successful: result.successful.length,
        failed: result.failed.length,
        results: result,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// GET /api/ingest/stats - Get document statistics
ingestRouter.get('/stats', async (c) => {
  try {
    const processor = await getProcessor()
    const versionId = c.req.query('versionId') as CppVersionId | undefined

    const count = await processor.getDocumentCount(versionId)

    return c.json({
      success: true,
      data: {
        versionId: versionId || 'all',
        documentCount: count,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// GET /api/ingest/urls - Get all existing URLs from documents
ingestRouter.get('/urls', async (c) => {
  try {
    const supabase = await getSupabaseClient()

    // Query distinct URLs from spec_documents metadata
    const { data, error } = await supabase
      .from('spec_documents')
      .select('metadata')

    if (error) {
      throw new Error(error.message)
    }

    // Extract unique URLs from metadata
    const urls = new Set<string>()
    for (const doc of data || []) {
      if (doc.metadata && typeof doc.metadata === 'object' && 'url' in doc.metadata) {
        urls.add(doc.metadata.url as string)
      }
    }

    return c.json({
      success: true,
      data: {
        urls: Array.from(urls),
        count: urls.size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// DELETE /api/ingest/:versionId - Delete all documents for a version
ingestRouter.delete('/:versionId', async (c) => {
  try {
    const versionId = c.req.param('versionId') as CppVersionId
    const validVersions = ['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']

    if (!validVersions.includes(versionId)) {
      return c.json({ error: 'Invalid version ID' }, 400)
    }

    const processor = await getProcessor()
    const deletedCount = await processor.deleteByVersion(versionId)

    return c.json({
      success: true,
      data: {
        versionId,
        deletedCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

export { ingestRouter }
