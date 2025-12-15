'use client'

import { useMemo } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

export interface Change {
  id: string
  lineStart: number
  lineEnd: number
  type: 'modify' | 'add' | 'delete'
  originalSnippet: string
  modernizedSnippet: string
  explanation: string
  category: string
}

interface DiffViewerProps {
  originalCode: string
  modernizedCode: string
  filename?: string
  changes?: Change[]
  selectedChangeId?: string | null
  onChangeClick?: (change: Change) => void
}

interface DiffLine {
  type: 'unchanged' | 'removed' | 'added' | 'modified-old' | 'modified-new'
  content: string
  lineNumber: number | null
  otherLineNumber: number | null
}

function computeDiff(original: string, modified: string): { left: DiffLine[], right: DiffLine[] } {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')

  const left: DiffLine[] = []
  const right: DiffLine[] = []

  const maxLen = Math.max(originalLines.length, modifiedLines.length)

  for (let i = 0; i < maxLen; i++) {
    const origLine = originalLines[i]
    const modLine = modifiedLines[i]

    if (origLine === undefined && modLine !== undefined) {
      // Added line
      left.push({ type: 'unchanged', content: '', lineNumber: null, otherLineNumber: i + 1 })
      right.push({ type: 'added', content: modLine, lineNumber: i + 1, otherLineNumber: null })
    } else if (origLine !== undefined && modLine === undefined) {
      // Removed line
      left.push({ type: 'removed', content: origLine, lineNumber: i + 1, otherLineNumber: null })
      right.push({ type: 'unchanged', content: '', lineNumber: null, otherLineNumber: i + 1 })
    } else if (origLine === modLine) {
      // Unchanged
      left.push({ type: 'unchanged', content: origLine, lineNumber: i + 1, otherLineNumber: i + 1 })
      right.push({ type: 'unchanged', content: modLine, lineNumber: i + 1, otherLineNumber: i + 1 })
    } else {
      // Modified
      left.push({ type: 'modified-old', content: origLine, lineNumber: i + 1, otherLineNumber: i + 1 })
      right.push({ type: 'modified-new', content: modLine, lineNumber: i + 1, otherLineNumber: i + 1 })
    }
  }

  return { left, right }
}

function CodeBlock({ code, title, type }: { code: string, title: string, type: 'original' | 'modernized' }) {
  const bgClass = type === 'original' ? 'bg-slate-900' : 'bg-slate-900'

  return (
    <div className={`h-full flex flex-col rounded-lg overflow-hidden border border-slate-700 ${bgClass}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b border-slate-700 flex items-center gap-2 ${
        type === 'original' ? 'bg-red-900/30' : 'bg-green-900/30'
      }`}>
        <div className={`w-3 h-3 rounded-full ${type === 'original' ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <Highlight theme={themes.nightOwl} code={code || '// No code'} language="cpp">
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} m-0 p-0 text-sm`} style={{ ...style, background: 'transparent' }}>
              <table className="w-full border-collapse">
                <tbody>
                  {tokens.map((line, i) => (
                    <tr key={i} {...getLineProps({ line })} className="hover:bg-slate-800/50">
                      <td className="text-right pr-4 pl-2 py-0.5 text-slate-500 select-none w-12 text-xs border-r border-slate-700/50">
                        {i + 1}
                      </td>
                      <td className="pl-4 pr-2 py-0.5">
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                        {line.length === 0 || (line.length === 1 && line[0].content === '') ? (
                          <span className="opacity-0">.</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}

export function DiffViewer({
  originalCode,
  modernizedCode,
  filename = 'code.cpp',
  changes = [],
  selectedChangeId,
  onChangeClick,
}: DiffViewerProps) {
  // Extract pure code from markdown if needed
  const extractCode = (text: string): string => {
    // Check if text contains markdown code blocks
    const codeBlockMatch = text.match(/```(?:cpp|c\+\+)?\s*([\s\S]*?)```/i)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }
    // If no code block, return as is (might already be pure code)
    return text
  }

  const cleanModernizedCode = useMemo(() => extractCode(modernizedCode), [modernizedCode])

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">{filename}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-500">Original</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-slate-500">Modernized</span>
            </span>
          </div>
        </div>
        {changes.length > 0 && (
          <span className="text-xs text-slate-500">
            {changes.length} changes detected
          </span>
        )}
      </div>

      {/* Split View */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0 overflow-hidden">
        <CodeBlock
          code={originalCode}
          title="Original"
          type="original"
        />
        <CodeBlock
          code={cleanModernizedCode}
          title="Modernized"
          type="modernized"
        />
      </div>
    </div>
  )
}
