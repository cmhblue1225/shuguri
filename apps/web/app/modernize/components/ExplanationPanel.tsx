'use client'

import type { Change } from './DiffViewer'

interface ExplanationPanelProps {
  changes: Change[]
  selectedChangeId?: string | null
  onChangeSelect?: (change: Change) => void
  modernizedCode?: string
}

const categoryLabels: Record<string, string> = {
  auto: 'Auto Keyword',
  lambda: 'Lambda Expression',
  smartpointer: 'Smart Pointer',
  rangefor: 'Range-based For',
  nullptr: 'nullptr',
  constexpr: 'constexpr',
  initializer: 'Initializer List',
  default: 'Modernization',
}

const categoryColors: Record<string, string> = {
  auto: 'bg-blue-100 text-blue-800 border-blue-200',
  lambda: 'bg-purple-100 text-purple-800 border-purple-200',
  smartpointer: 'bg-green-100 text-green-800 border-green-200',
  rangefor: 'bg-orange-100 text-orange-800 border-orange-200',
  nullptr: 'bg-pink-100 text-pink-800 border-pink-200',
  constexpr: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  initializer: 'bg-amber-100 text-amber-800 border-amber-200',
  default: 'bg-slate-100 text-slate-800 border-slate-200',
}

export function ExplanationPanel({
  changes,
  selectedChangeId,
  onChangeSelect,
  modernizedCode,
}: ExplanationPanelProps) {
  // If no changes but we have modernized code, show a summary
  const hasContent = changes.length > 0 || modernizedCode

  if (!hasContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-6">
        <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-600 mb-2">No Analysis Yet</h3>
        <p className="text-sm text-slate-400 text-center">
          Transform your code to see detailed explanations of each modernization change.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <h3 className="font-semibold text-slate-800">Modernization Details</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {changes.length > 0 ? `${changes.length} changes applied` : 'Code transformed successfully'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {changes.length > 0 ? (
          /* Changes List */
          <div className="divide-y divide-slate-100">
            {changes.map((change, index) => {
              const isSelected = selectedChangeId === change.id
              const colorClass = categoryColors[change.category] || categoryColors.default
              const label = categoryLabels[change.category] || change.category

              return (
                <div
                  key={change.id}
                  onClick={() => onChangeSelect?.(change)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-50 border-l-4 border-l-primary-500'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorClass}`}>
                      {label}
                    </span>
                    <span className="text-xs text-slate-400">
                      Line {change.lineStart}
                      {change.lineEnd !== change.lineStart ? `-${change.lineEnd}` : ''}
                    </span>
                  </div>

                  {/* Code Comparison */}
                  <div className="space-y-1.5 mb-3">
                    {change.originalSnippet && (
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 font-mono text-xs mt-0.5">-</span>
                        <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-mono flex-1 overflow-x-auto">
                          {change.originalSnippet}
                        </code>
                      </div>
                    )}
                    {change.modernizedSnippet && (
                      <div className="flex items-start gap-2">
                        <span className="text-green-500 font-mono text-xs mt-0.5">+</span>
                        <code className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-mono flex-1 overflow-x-auto">
                          {change.modernizedSnippet}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {change.explanation}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          /* Summary when no specific changes */
          <div className="p-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-green-800">Transformation Complete</span>
              </div>
              <p className="text-sm text-green-700">
                Your code has been modernized to use newer C++ standards.
              </p>
            </div>

            <h4 className="font-medium text-slate-700 mb-2">Common Modernizations Applied:</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>nullptr instead of NULL for type safety</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>Smart pointers for automatic memory management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>Range-based for loops for cleaner iteration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>auto keyword for type inference</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>using instead of typedef for type aliases</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
