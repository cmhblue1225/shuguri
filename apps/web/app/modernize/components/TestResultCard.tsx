'use client'

import { useState } from 'react'

export interface TestResult {
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'error' | 'timeout' | 'pending'
  actualOutput?: string
  expectedOutput?: string
  errorMessage?: string
  runTimeMs?: number
  description?: string
  assertions?: string[]
}

interface TestResultCardProps {
  result: TestResult
  showDetails?: boolean
}

export function TestResultCard({ result, showDetails = false }: TestResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)

  const statusConfig = {
    passed: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      label: 'Passed',
    },
    failed: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      label: 'Failed',
    },
    error: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      label: 'Error',
    },
    timeout: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      label: 'Timeout',
    },
    pending: {
      icon: (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ),
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-600',
      label: 'Running...',
    },
  }

  const config = statusConfig[result.status]

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={config.text}>{config.icon}</span>
          <div className="text-left">
            <span className="font-medium text-slate-800">{result.testName}</span>
            {result.description && (
              <p className="text-xs text-slate-500 mt-0.5">{result.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {result.runTimeMs !== undefined && (
            <span className="text-xs text-slate-500">
              {(result.runTimeMs / 1000).toFixed(3)}s
            </span>
          )}
          <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200/50">
          {/* Assertions */}
          {result.assertions && result.assertions.length > 0 && (
            <div className="pt-3">
              <h4 className="text-xs font-medium text-slate-500 mb-2">Assertions</h4>
              <ul className="space-y-1">
                {result.assertions.map((assertion, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">-</span>
                    {assertion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expected vs Actual */}
          {(result.expectedOutput || result.actualOutput) && (
            <div className="pt-3 grid grid-cols-2 gap-3">
              {result.expectedOutput && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 mb-1">Expected Output</h4>
                  <pre className="text-xs bg-white p-2 rounded border border-slate-200 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                    {result.expectedOutput || '(empty)'}
                  </pre>
                </div>
              )}
              {result.actualOutput !== undefined && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 mb-1">Actual Output</h4>
                  <pre className={`text-xs p-2 rounded border font-mono whitespace-pre-wrap overflow-auto max-h-32 ${
                    result.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}>
                    {result.actualOutput || '(empty)'}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {result.errorMessage && (
            <div className="pt-3">
              <h4 className="text-xs font-medium text-red-500 mb-1">Error</h4>
              <pre className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-200 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                {result.errorMessage}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
