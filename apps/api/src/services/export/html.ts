import type {
  ExportOptions,
  ExportResult,
  DocumentToExport,
  DiffToExport
} from './types.js'

const lightThemeStyles = `
  body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 2rem; background: #fff; }
  h1 { color: #111827; border-bottom: 2px solid #0a5c5c; padding-bottom: 0.5rem; }
  h2 { color: #1f2937; margin-top: 2rem; }
  h3 { color: #374151; }
  .metadata { background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; font-size: 0.9rem; }
  .metadata dt { font-weight: 600; color: #4b5563; }
  .metadata dd { margin: 0 0 0.5rem 0; }
  pre { background: #1f2937; color: #f3f4f6; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9rem; }
  .category-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
  .badge-new { background: #d1fae5; color: #065f46; }
  .badge-behavior { background: #fef3c7; color: #92400e; }
  .badge-deprecated { background: #fee2e2; color: #991b1b; }
  .badge-library { background: #dbeafe; color: #1e40af; }
  .diff-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
  .diff-item h3 { margin-top: 0; }
  blockquote { border-left: 4px solid #0a5c5c; margin: 1rem 0; padding-left: 1rem; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  .toc { background: #f9fafb; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
  .toc ul { margin: 0; padding-left: 1.5rem; }
  .toc a { color: #0a5c5c; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
`

const darkThemeStyles = `
  body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #e5e7eb; max-width: 900px; margin: 0 auto; padding: 2rem; background: #111827; }
  h1 { color: #f9fafb; border-bottom: 2px solid #0ea5a5; padding-bottom: 0.5rem; }
  h2 { color: #e5e7eb; margin-top: 2rem; }
  h3 { color: #d1d5db; }
  .metadata { background: #1f2937; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; font-size: 0.9rem; }
  .metadata dt { font-weight: 600; color: #9ca3af; }
  .metadata dd { margin: 0 0 0.5rem 0; }
  pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid #334155; }
  code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9rem; }
  .category-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
  .badge-new { background: #065f46; color: #d1fae5; }
  .badge-behavior { background: #92400e; color: #fef3c7; }
  .badge-deprecated { background: #991b1b; color: #fee2e2; }
  .badge-library { background: #1e40af; color: #dbeafe; }
  .diff-item { border: 1px solid #374151; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #1f2937; }
  .diff-item h3 { margin-top: 0; }
  blockquote { border-left: 4px solid #0ea5a5; margin: 1rem 0; padding-left: 1rem; color: #9ca3af; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #374151; padding: 0.75rem; text-align: left; }
  th { background: #1f2937; font-weight: 600; }
  .toc { background: #1f2937; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
  .toc ul { margin: 0; padding-left: 1.5rem; }
  .toc a { color: #0ea5a5; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
`

export function exportDocumentToHtml(
  doc: DocumentToExport,
  options: ExportOptions
): ExportResult {
  const styles = options.theme === 'dark' ? darkThemeStyles : lightThemeStyles
  const parts: string[] = []

  parts.push('<!DOCTYPE html>')
  parts.push('<html lang="ko">')
  parts.push('<head>')
  parts.push('<meta charset="UTF-8">')
  parts.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
  parts.push(`<title>${escapeHtml(doc.title)}</title>`)
  parts.push(`<style>${styles}</style>`)
  parts.push('</head>')
  parts.push('<body>')

  // Title
  parts.push(`<h1>${escapeHtml(doc.title)}</h1>`)

  // Metadata
  if (options.includeMetadata) {
    parts.push('<dl class="metadata">')
    parts.push(`<dt>문서 유형</dt><dd>${escapeHtml(formatDocType(doc.docType))}</dd>`)
    parts.push(`<dt>소스 버전</dt><dd>${escapeHtml(formatVersion(doc.sourceVersion))}</dd>`)
    parts.push(`<dt>타겟 버전</dt><dd>${escapeHtml(formatVersion(doc.targetVersion))}</dd>`)
    parts.push(`<dt>생성일</dt><dd>${new Date(doc.createdAt).toLocaleDateString('ko-KR')}</dd>`)
    parts.push('</dl>')
  }

  // Content - convert markdown to basic HTML
  parts.push('<div class="content">')
  parts.push(markdownToHtml(doc.content))
  parts.push('</div>')

  parts.push('</body>')
  parts.push('</html>')

  const content = parts.join('\n')
  const filename = generateFilename(doc, 'html')

  return {
    content,
    filename,
    mimeType: 'text/html',
    size: new TextEncoder().encode(content).length,
  }
}

export function exportDiffToHtml(
  diff: DiffToExport,
  options: ExportOptions
): ExportResult {
  const styles = options.theme === 'dark' ? darkThemeStyles : lightThemeStyles
  const parts: string[] = []

  parts.push('<!DOCTYPE html>')
  parts.push('<html lang="ko">')
  parts.push('<head>')
  parts.push('<meta charset="UTF-8">')
  parts.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
  parts.push(`<title>${formatVersion(diff.sourceVersion)} → ${formatVersion(diff.targetVersion)} 변경사항</title>`)
  parts.push(`<style>${styles}</style>`)
  parts.push('</head>')
  parts.push('<body>')

  // Title
  parts.push(`<h1>${formatVersion(diff.sourceVersion)} → ${formatVersion(diff.targetVersion)} 변경사항</h1>`)

  // Summary
  parts.push('<section>')
  parts.push('<h2>개요</h2>')
  parts.push(`<p>${escapeHtml(diff.summary)}</p>`)
  parts.push(`<p><strong>총 변경사항: ${diff.totalChanges}개</strong></p>`)
  parts.push('</section>')

  // Table of Contents
  if (options.includeTableOfContents) {
    parts.push('<nav class="toc">')
    parts.push('<h2>목차</h2>')
    parts.push('<ul>')
    if (diff.categories.newFeatures.length > 0) {
      parts.push(`<li><a href="#new-features">새로운 기능 (${diff.categories.newFeatures.length})</a></li>`)
    }
    if (diff.categories.behaviorChanges.length > 0) {
      parts.push(`<li><a href="#behavior-changes">동작 변경 (${diff.categories.behaviorChanges.length})</a></li>`)
    }
    if (diff.categories.deprecated.length > 0) {
      parts.push(`<li><a href="#deprecated">Deprecated / Removed (${diff.categories.deprecated.length})</a></li>`)
    }
    if (diff.categories.libraryChanges.length > 0) {
      parts.push(`<li><a href="#library-changes">라이브러리 변경 (${diff.categories.libraryChanges.length})</a></li>`)
    }
    parts.push('</ul>')
    parts.push('</nav>')
  }

  // Categories
  if (diff.categories.newFeatures.length > 0) {
    parts.push('<section id="new-features">')
    parts.push('<h2>새로운 기능</h2>')
    for (const item of diff.categories.newFeatures) {
      parts.push(formatDiffItemHtml(item, 'new'))
    }
    parts.push('</section>')
  }

  if (diff.categories.behaviorChanges.length > 0) {
    parts.push('<section id="behavior-changes">')
    parts.push('<h2>동작 변경</h2>')
    for (const item of diff.categories.behaviorChanges) {
      parts.push(formatDiffItemHtml(item, 'behavior'))
    }
    parts.push('</section>')
  }

  if (diff.categories.deprecated.length > 0) {
    parts.push('<section id="deprecated">')
    parts.push('<h2>Deprecated / Removed</h2>')
    for (const item of diff.categories.deprecated) {
      parts.push(formatDiffItemHtml(item, 'deprecated'))
    }
    parts.push('</section>')
  }

  if (diff.categories.libraryChanges.length > 0) {
    parts.push('<section id="library-changes">')
    parts.push('<h2>라이브러리 변경</h2>')
    for (const item of diff.categories.libraryChanges) {
      parts.push(formatDiffItemHtml(item, 'library'))
    }
    parts.push('</section>')
  }

  parts.push('</body>')
  parts.push('</html>')

  const content = parts.join('\n')
  const filename = `diff_${diff.sourceVersion}_to_${diff.targetVersion}.html`

  return {
    content,
    filename,
    mimeType: 'text/html',
    size: new TextEncoder().encode(content).length,
  }
}

function formatDiffItemHtml(
  item: DiffToExport['categories']['newFeatures'][0],
  badgeType: string
): string {
  const lines: string[] = []

  lines.push('<div class="diff-item">')
  lines.push(`<h3>${escapeHtml(item.title)}</h3>`)
  lines.push(`<p>${escapeHtml(item.description)}</p>`)
  lines.push(`<p><span class="category-badge badge-${badgeType}">${escapeHtml(item.category)}</span> <span class="category-badge">${escapeHtml(item.impact)}</span></p>`)

  if (item.examples && item.examples.length > 0) {
    lines.push('<h4>예제</h4>')
    for (const example of item.examples) {
      lines.push('<p><strong>Before:</strong></p>')
      lines.push(`<pre><code>${escapeHtml(example.before)}</code></pre>`)
      lines.push('<p><strong>After:</strong></p>')
      lines.push(`<pre><code>${escapeHtml(example.after)}</code></pre>`)
      lines.push(`<blockquote>${escapeHtml(example.explanation)}</blockquote>`)
    }
  }

  lines.push('</div>')

  return lines.join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplo])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>')
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
