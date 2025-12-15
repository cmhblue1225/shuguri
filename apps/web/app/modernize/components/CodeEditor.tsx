'use client'

import { Highlight, themes, type Language } from 'prism-react-renderer'

interface CodeEditorProps {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
  language?: Language
  filename?: string
  showLineNumbers?: boolean
  highlightedLines?: number[]
  onLineClick?: (lineNumber: number) => void
}

export function CodeEditor({
  code,
  onChange,
  readOnly = false,
  language = 'cpp',
  filename,
  showLineNumbers = true,
  highlightedLines = [],
  onLineClick,
}: CodeEditorProps) {
  if (readOnly) {
    return (
      <div className="relative h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden">
        {filename && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-slate-300">{filename}</span>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <Highlight theme={themes.nightOwl} code={code || ''} language={language}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre className={`${className} m-0 p-4 text-sm`} style={{ ...style, background: 'transparent' }}>
                {tokens.map((line, i) => {
                  const lineNumber = i + 1
                  const isHighlighted = highlightedLines.includes(lineNumber)
                  return (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      onClick={() => onLineClick?.(lineNumber)}
                      className={`
                        flex
                        ${isHighlighted ? 'bg-yellow-500/20 -mx-4 px-4' : ''}
                        ${onLineClick ? 'cursor-pointer hover:bg-slate-800/50' : ''}
                      `}
                    >
                      {showLineNumbers && (
                        <span className="select-none text-slate-600 text-right w-8 mr-4 flex-shrink-0">
                          {lineNumber}
                        </span>
                      )}
                      <span className="flex-1">
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  )
                })}
              </pre>
            )}
          </Highlight>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden">
      {filename && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-slate-300">{filename}</span>
        </div>
      )}
      <div className="flex-1 relative">
        <textarea
          value={code}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="// Enter your C++ code here..."
          className="absolute inset-0 w-full h-full resize-none bg-transparent text-slate-100 font-mono text-sm p-4 outline-none"
          spellCheck={false}
          style={{ caretColor: 'white' }}
        />
      </div>
    </div>
  )
}
