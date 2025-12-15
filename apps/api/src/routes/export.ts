import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabase } from '../lib/supabase.js'
import {
  exportDocument,
  exportDiff,
  type ExportOptions,
  type DocumentToExport,
  type DiffToExport,
} from '../services/export/index.js'
import { analyzeDiff } from '../services/diff/index.js'
import type { CppVersionId } from '@shuguridan/shared'

const exportRouter = new Hono()

// Schemas
const exportDocumentSchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(['markdown', 'html', 'json']),
  includeMetadata: z.boolean().optional().default(true),
  includeTableOfContents: z.boolean().optional().default(true),
  theme: z.enum(['light', 'dark']).optional().default('light'),
})

const exportDiffSchema = z.object({
  sourceVersion: z.string(),
  targetVersion: z.string(),
  format: z.enum(['markdown', 'html', 'json']),
  includeMetadata: z.boolean().optional().default(true),
  includeTableOfContents: z.boolean().optional().default(true),
  theme: z.enum(['light', 'dark']).optional().default('light'),
})

// POST /api/export/document - Export a generated document
exportRouter.post(
  '/document',
  zValidator('json', exportDocumentSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      // Fetch document from database
      const { data: docData, error } = await supabase
        .from('generated_docs')
        .select('*')
        .eq('id', body.documentId)
        .single()

      if (error || !docData) {
        return c.json(
          { success: false, error: 'Document not found' },
          404
        )
      }

      // Prepare document for export
      const doc: DocumentToExport = {
        id: docData.id,
        title: getDocTitle(docData.doc_type, docData.source_version, docData.target_version),
        docType: docData.doc_type,
        sourceVersion: docData.source_version,
        targetVersion: docData.target_version,
        content: docData.content,
        createdAt: docData.created_at,
        metadata: docData.metadata,
      }

      // Export options
      const options: ExportOptions = {
        format: body.format,
        includeMetadata: body.includeMetadata,
        includeTableOfContents: body.includeTableOfContents,
        theme: body.theme,
      }

      // Export
      const result = exportDocument(doc, options)

      return c.json({
        success: true,
        data: {
          content: result.content,
          filename: result.filename,
          mimeType: result.mimeType,
          size: result.size,
        },
      })
    } catch (err) {
      console.error('Failed to export document:', err)
      return c.json(
        { success: false, error: 'Failed to export document' },
        500
      )
    }
  }
)

// POST /api/export/diff - Export a diff analysis
exportRouter.post(
  '/diff',
  zValidator('json', exportDiffSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      // Analyze diff
      const diffResult = await analyzeDiff({
        sourceVersion: body.sourceVersion as CppVersionId,
        targetVersion: body.targetVersion as CppVersionId,
      })

      // Prepare diff for export
      const diff: DiffToExport = {
        sourceVersion: body.sourceVersion,
        targetVersion: body.targetVersion,
        summary: diffResult.summary,
        totalChanges: diffResult.totalChanges,
        categories: {
          newFeatures: diffResult.diff.newFeatures.map((item) => ({
            title: item.title,
            description: item.description,
            category: item.category,
            impact: item.impact,
            examples: item.examples,
          })),
          behaviorChanges: diffResult.diff.behaviorChanges.map((item) => ({
            title: item.title,
            description: item.description,
            category: item.category,
            impact: item.impact,
            examples: item.examples,
          })),
          deprecated: diffResult.diff.deprecated.map((item) => ({
            title: item.title,
            description: item.description,
            category: item.category,
            impact: item.impact,
            examples: item.examples,
          })),
          libraryChanges: diffResult.diff.libraryChanges.map((item) => ({
            title: item.title,
            description: item.description,
            category: item.category,
            impact: item.impact,
            examples: item.examples,
          })),
        },
      }

      // Export options
      const options: ExportOptions = {
        format: body.format,
        includeMetadata: body.includeMetadata,
        includeTableOfContents: body.includeTableOfContents,
        theme: body.theme,
      }

      // Export
      const result = exportDiff(diff, options)

      return c.json({
        success: true,
        data: {
          content: result.content,
          filename: result.filename,
          mimeType: result.mimeType,
          size: result.size,
        },
      })
    } catch (err) {
      console.error('Failed to export diff:', err)
      return c.json(
        { success: false, error: 'Failed to export diff' },
        500
      )
    }
  }
)

// GET /api/export/formats - Get available export formats
exportRouter.get('/formats', (c) => {
  return c.json({
    success: true,
    data: {
      formats: [
        { id: 'markdown', name: 'Markdown', extension: '.md', mimeType: 'text/markdown' },
        { id: 'html', name: 'HTML', extension: '.html', mimeType: 'text/html' },
        { id: 'json', name: 'JSON', extension: '.json', mimeType: 'application/json' },
      ],
      themes: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' },
      ],
    },
  })
})

function getDocTitle(docType: string, sourceVersion: string, targetVersion: string): string {
  const docLabels: Record<string, string> = {
    migration_guide: '마이그레이션 가이드',
    release_notes: '릴리즈 노트',
    test_points: '테스트 포인트',
  }
  const label = docLabels[docType] || docType
  return `${sourceVersion.replace('cpp', 'C++')} → ${targetVersion.replace('cpp', 'C++')} ${label}`
}

export { exportRouter }
