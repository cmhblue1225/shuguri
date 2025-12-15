'use client'

import { useState, useCallback } from 'react'
import { CompileStatusBadge } from './CompileStatusBadge'

interface CompilerMessage {
  type: 'warning' | 'error'
  line?: number
  column?: number
  message: string
}

interface CompileResult {
  status: 'success' | 'error' | 'timeout'
  exitCode: number
  stdout: string
  stderr: string
  compileTimeMs: number
  warnings: CompilerMessage[]
  errors: CompilerMessage[]
}

interface RunResult {
  status: 'success' | 'error' | 'timeout' | 'runtime_error'
  stdout: string
  stderr: string
  exitCode: number
  runTimeMs: number
}

interface CompilePanelProps {
  code: string
  cppStandard: string
  title: string
  type: 'original' | 'modernized'
}

type CompileStatus = 'idle' | 'compiling' | 'success' | 'error' | 'warning'
type CompileStep = 'idle' | 'sending' | 'compiling' | 'done'

export function CompilePanel({ code, cppStandard, title, type }: CompilePanelProps) {
  const [status, setStatus] = useState<CompileStatus>('idle')
  const [compileStep, setCompileStep] = useState<CompileStep>('idle')
  const [result, setResult] = useState<CompileResult | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [stdin, setStdin] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showRawOutput, setShowRawOutput] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const handleCompile = useCallback(async () => {
    if (!code.trim()) return

    setStatus('compiling')
    setCompileStep('sending')
    setResult(null)
    setRunResult(null)

    try {
      // Step 1: Sending request
      await new Promise(resolve => setTimeout(resolve, 100))
      setCompileStep('compiling')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cppStandard,
          timeout: 30000,
        }),
      })

      setCompileStep('done')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Compilation failed')
      }

      const compileResult = data.compileResult as CompileResult

      setResult(compileResult)
      setShowDetails(true)

      if (compileResult.status === 'success') {
        if (compileResult.warnings.length > 0) {
          setStatus('warning')
        } else {
          setStatus('success')
        }
      } else {
        setStatus('error')
      }
    } catch (err) {
      setCompileStep('done')
      setStatus('error')
      setResult({
        status: 'error',
        exitCode: 1,
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Unknown error',
        compileTimeMs: 0,
        warnings: [],
        errors: [{ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }],
      })
      setShowDetails(true)
    }
  }, [code, cppStandard])

  const handleExecute = useCallback(async () => {
    if (!code.trim()) return

    setIsExecuting(true)
    setCompileStep('sending')
    setRunResult(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      setCompileStep('compiling')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/compile/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cppStandard,
          stdin,
          timeout: 30000,
          runTimeout: 10000,
        }),
      })

      setCompileStep('done')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed')
      }

      const compileResult = data.compileResult as CompileResult
      setResult(compileResult)

      if (compileResult.status === 'success') {
        if (compileResult.warnings.length > 0) {
          setStatus('warning')
        } else {
          setStatus('success')
        }
        if (data.runResult) {
          setRunResult(data.runResult as RunResult)
        }
      } else {
        setStatus('error')
      }

      setShowDetails(true)
    } catch (err) {
      setCompileStep('done')
      setStatus('error')
      setRunResult({
        status: 'error',
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Unknown error',
        exitCode: 1,
        runTimeMs: 0,
      })
      setShowDetails(true)
    } finally {
      setIsExecuting(false)
    }
  }, [code, cppStandard, stdin])

  const typeColors = type === 'original'
    ? { header: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' }
    : { header: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' }

  // Compile step progress indicator
  const renderProgressSteps = () => {
    if (status !== 'compiling' && compileStep === 'idle') return null
    if (compileStep === 'done' && status !== 'compiling') return null

    const steps = [
      { id: 'sending', label: 'Sending', icon: '📤' },
      { id: 'compiling', label: 'Compiling', icon: '⚙️' },
      { id: 'done', label: 'Done', icon: '✅' },
    ]

    const currentStepIndex = steps.findIndex(s => s.id === compileStep)

    return (
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 ${
                index <= currentStepIndex ? 'text-primary-600' : 'text-slate-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  index < currentStepIndex
                    ? 'bg-primary-100 text-primary-700'
                    : index === currentStepIndex
                    ? 'bg-primary-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {index < currentStepIndex ? '✓' : step.icon}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-primary-400' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Summary stats card
  const renderSummaryCard = () => {
    if (!result || status === 'idle') return null

    const statusConfig = {
      success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✅', label: 'Compilation Successful' },
      warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⚠️', label: 'Compiled with Warnings' },
      error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '❌', label: 'Compilation Failed' },
      compiling: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '⏳', label: 'Compiling...' },
      idle: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: '⏹️', label: 'Ready' },
    }

    const config = statusConfig[status]

    return (
      <div className={`mx-4 mt-4 p-4 rounded-lg border ${config.bg} ${config.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <p className={`font-semibold ${config.text}`}>{config.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Compiler: GCC | Standard: {cppStandard.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-slate-700">
              {(result.compileTimeMs / 1000).toFixed(2)}s
            </p>
            <p className="text-xs text-slate-500">compile time</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/50">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${result.errors.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-xs text-slate-600">{result.errors.length} errors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${result.warnings.length > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-xs text-slate-600">{result.warnings.length} warnings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600">Exit: {result.exitCode}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${typeColors.header} flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors.badge}`}>
            {title}
          </span>
          <span className="text-sm text-slate-600 font-medium">{cppStandard.toUpperCase()}</span>
        </div>
        <CompileStatusBadge
          status={status}
          warningCount={result?.warnings.length || 0}
          errorCount={result?.errors.length || 0}
          size="sm"
        />
      </div>

      {/* Progress Steps */}
      {(status === 'compiling' || isExecuting) && renderProgressSteps()}

      {/* Actions */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCompile}
          disabled={status === 'compiling' || !code.trim()}
          className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {status === 'compiling' && !isExecuting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Compiling...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Compile
            </>
          )}
        </button>

        <button
          onClick={handleExecute}
          disabled={isExecuting || !code.trim()}
          className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isExecuting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run
            </>
          )}
        </button>

        {result && (
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="ml-auto px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            {showRawOutput ? 'Hide' : 'Show'} Raw Output
          </button>
        )}
      </div>

      {/* stdin Input */}
      <div className="px-4 py-2 border-b border-slate-100 flex-shrink-0">
        <label className="text-xs text-slate-500 block mb-1">stdin (optional)</label>
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Enter input for program..."
          rows={2}
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none font-mono"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!result && status === 'idle' && !code.trim() && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">먼저 코드를 변환해주세요</p>
              <p className="text-xs text-slate-300 mt-1">Diff View에서 코드 변환 후 컴파일할 수 있습니다</p>
            </div>
          </div>
        )}

        {!result && status === 'idle' && code.trim() && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Click Compile to check the code</p>
              <p className="text-xs text-slate-300 mt-1">Using Wandbox API (GCC {cppStandard.toUpperCase()})</p>
            </div>
          </div>
        )}

        {result && showDetails && (
          <div className="space-y-0">
            {/* Summary Card */}
            {renderSummaryCard()}

            <div className="p-4 space-y-4">
              {/* Raw Compiler Output (toggleable) */}
              {showRawOutput && (result.stdout || result.stderr) && (
                <div>
                  <h4 className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Raw Compiler Output
                  </h4>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
                    {result.stdout && (
                      <pre className="whitespace-pre-wrap text-green-400">{result.stdout}</pre>
                    )}
                    {result.stderr && (
                      <pre className="whitespace-pre-wrap text-red-400 mt-2">{result.stderr}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Errors ({result.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {result.errors.map((error, i) => (
                      <div key={i} className="text-xs bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">●</span>
                          <div className="flex-1">
                            {error.line && (
                              <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium mb-1">
                                Line {error.line}{error.column ? `:${error.column}` : ''}
                              </span>
                            )}
                            <p className="text-red-700 font-mono">{error.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-yellow-600 mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Warnings ({result.warnings.length})
                  </h4>
                  <div className="space-y-2">
                    {result.warnings.map((warning, i) => (
                      <div key={i} className="text-xs bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">▲</span>
                          <div className="flex-1">
                            {warning.line && (
                              <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded text-xs font-medium mb-1">
                                Line {warning.line}{warning.column ? `:${warning.column}` : ''}
                              </span>
                            )}
                            <p className="text-yellow-700 font-mono">{warning.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Result */}
              {runResult && (
                <div>
                  <h4 className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Program Output
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      runResult.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {runResult.status === 'success' ? 'Success' : runResult.status}
                    </span>
                    <span className="text-slate-400 font-normal">
                      ({(runResult.runTimeMs / 1000).toFixed(3)}s)
                    </span>
                  </h4>
                  <div className={`rounded-lg border overflow-hidden ${
                    runResult.status === 'success'
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-red-900 border-red-700'
                  }`}>
                    <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                      <span className="text-xs text-slate-400">stdout</span>
                      <span className="text-xs text-slate-500">Exit: {runResult.exitCode}</span>
                    </div>
                    <pre className={`p-3 text-xs font-mono whitespace-pre-wrap min-h-[60px] ${
                      runResult.status === 'success' ? 'text-green-400' : 'text-red-300'
                    }`}>
                      {runResult.stdout || runResult.stderr || '(no output)'}
                    </pre>
                  </div>
                  {runResult.status !== 'success' && runResult.stderr && runResult.stdout && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-mono">
                      <strong>stderr:</strong> {runResult.stderr}
                    </div>
                  )}
                </div>
              )}

              {/* Success message (only when no warnings, errors, and no run result) */}
              {result.status === 'success' && result.errors.length === 0 && result.warnings.length === 0 && !runResult && (
                <div className="flex items-center gap-3 text-green-600 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">Compilation Successful!</p>
                    <p className="text-xs text-green-500 mt-0.5">No errors or warnings detected</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
