import type {
  ExportOptions,
  ExportResult,
  DocumentToExport,
  DiffToExport
} from './types.js'

export function exportDocumentToMarkdown(
  doc: DocumentToExport,
  options: ExportOptions
): ExportResult {
  const parts: string[] = []

  // Header
  parts.push(`# ${doc.title}`)
  parts.push('')

  // Metadata
  if (options.includeMetadata) {
    parts.push('---')
    parts.push(`문서 유형: ${formatDocType(doc.docType)}`)
    parts.push(`소스 버전: ${formatVersion(doc.sourceVersion)}`)
    parts.push(`타겟 버전: ${formatVersion(doc.targetVersion)}`)
    parts.push(`생성일: ${new Date(doc.createdAt).toLocaleDateString('ko-KR')}`)
    parts.push('---')
    parts.push('')
  }

  // Content
  parts.push(doc.content)

  const content = parts.join('\n')
  const filename = generateFilename(doc, 'md')

  return {
    content,
    filename,
    mimeType: 'text/markdown',
    size: new TextEncoder().encode(content).length,
  }
}

export function exportDiffToMarkdown(
  diff: DiffToExport,
  options: ExportOptions
): ExportResult {
  const parts: string[] = []

  // Header
  parts.push(`# ${formatVersion(diff.sourceVersion)} → ${formatVersion(diff.targetVersion)} 변경사항`)
  parts.push('')

  // Summary
  parts.push('## 개요')
  parts.push('')
  parts.push(diff.summary)
  parts.push('')
  parts.push(`**총 변경사항: ${diff.totalChanges}개**`)
  parts.push('')

  // Table of Contents
  if (options.includeTableOfContents) {
    parts.push('## 목차')
    parts.push('')
    if (diff.categories.newFeatures.length > 0) {
      parts.push(`- [새로운 기능](#새로운-기능) (${diff.categories.newFeatures.length})`)
    }
    if (diff.categories.behaviorChanges.length > 0) {
      parts.push(`- [동작 변경](#동작-변경) (${diff.categories.behaviorChanges.length})`)
    }
    if (diff.categories.deprecated.length > 0) {
      parts.push(`- [Deprecated / Removed](#deprecated--removed) (${diff.categories.deprecated.length})`)
    }
    if (diff.categories.libraryChanges.length > 0) {
      parts.push(`- [라이브러리 변경](#라이브러리-변경) (${diff.categories.libraryChanges.length})`)
    }
    parts.push('')
  }

  // Categories
  if (diff.categories.newFeatures.length > 0) {
    parts.push('## 새로운 기능')
    parts.push('')
    for (const item of diff.categories.newFeatures) {
      parts.push(...formatDiffItem(item))
    }
  }

  if (diff.categories.behaviorChanges.length > 0) {
    parts.push('## 동작 변경')
    parts.push('')
    for (const item of diff.categories.behaviorChanges) {
      parts.push(...formatDiffItem(item))
    }
  }

  if (diff.categories.deprecated.length > 0) {
    parts.push('## Deprecated / Removed')
    parts.push('')
    for (const item of diff.categories.deprecated) {
      parts.push(...formatDiffItem(item))
    }
  }

  if (diff.categories.libraryChanges.length > 0) {
    parts.push('## 라이브러리 변경')
    parts.push('')
    for (const item of diff.categories.libraryChanges) {
      parts.push(...formatDiffItem(item))
    }
  }

  const content = parts.join('\n')
  const filename = `diff_${diff.sourceVersion}_to_${diff.targetVersion}.md`

  return {
    content,
    filename,
    mimeType: 'text/markdown',
    size: new TextEncoder().encode(content).length,
  }
}

function formatDiffItem(item: DiffToExport['categories']['newFeatures'][0]): string[] {
  const lines: string[] = []

  lines.push(`### ${item.title}`)
  lines.push('')
  lines.push(item.description)
  lines.push('')
  lines.push(`- **카테고리**: ${item.category}`)
  lines.push(`- **영향**: ${item.impact}`)
  lines.push('')

  if (item.examples && item.examples.length > 0) {
    lines.push('#### 예제')
    lines.push('')
    for (const example of item.examples) {
      lines.push('**Before:**')
      lines.push('```cpp')
      lines.push(example.before)
      lines.push('```')
      lines.push('')
      lines.push('**After:**')
      lines.push('```cpp')
      lines.push(example.after)
      lines.push('```')
      lines.push('')
      lines.push(`> ${example.explanation}`)
      lines.push('')
    }
  }

  return lines
}

function formatDocType(docType: string): string {
  const labels: Record<string, string> = {
    migration_guide: '마이그레이션 가이드',
    release_notes: '릴리즈 노트',
    test_points: '테스트 포인트',
  }
  return labels[docType] || docType
}

function formatVersion(version: string): string {
  return version.replace('cpp', 'C++')
}

function generateFilename(doc: DocumentToExport, ext: string): string {
  const sanitized = doc.title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50)
  return `${sanitized}_${doc.sourceVersion}_to_${doc.targetVersion}.${ext}`
}
