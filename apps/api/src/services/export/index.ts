export * from './types.js'
export * from './markdown.js'
export * from './html.js'

import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  DocumentToExport,
  DiffToExport
} from './types.js'
import { exportDocumentToMarkdown, exportDiffToMarkdown } from './markdown.js'
import { exportDocumentToHtml, exportDiffToHtml } from './html.js'

export function exportDocument(
  doc: DocumentToExport,
  options: ExportOptions
): ExportResult {
  switch (options.format) {
    case 'markdown':
      return exportDocumentToMarkdown(doc, options)
    case 'html':
      return exportDocumentToHtml(doc, options)
    case 'json':
      return exportDocumentToJson(doc, options)
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

export function exportDiff(
  diff: DiffToExport,
  options: ExportOptions
): ExportResult {
  switch (options.format) {
    case 'markdown':
      return exportDiffToMarkdown(diff, options)
    case 'html':
      return exportDiffToHtml(diff, options)
    case 'json':
      return exportDiffToJson(diff, options)
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

function exportDocumentToJson(
  doc: DocumentToExport,
  _options: ExportOptions
): ExportResult {
  const content = JSON.stringify(doc, null, 2)
  return {
    content,
    filename: `${doc.docType}_${doc.sourceVersion}_to_${doc.targetVersion}.json`,
    mimeType: 'application/json',
    size: new TextEncoder().encode(content).length,
  }
}

function exportDiffToJson(
  diff: DiffToExport,
  _options: ExportOptions
): ExportResult {
  const content = JSON.stringify(diff, null, 2)
  return {
    content,
    filename: `diff_${diff.sourceVersion}_to_${diff.targetVersion}.json`,
    mimeType: 'application/json',
    size: new TextEncoder().encode(content).length,
  }
}
