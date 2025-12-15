'use client'

import { useState, useCallback } from 'react'
import { TestResultCard, type TestResult } from './TestResultCard'

interface GeneratedTest {
  id: string
  name: string
  description: string
  type: 'unit' | 'io'
  input?: string
  expectedOutput?: string
  assertions: string[]
}

interface TestPanelProps {
  originalCode: string
  modernizedCode: string
  sourceVersion: string
  targetVersion: string
}

type TestStatus = 'idle' | 'generating' | 'running' | 'comparing' | 'done'

export function TestPanel({
  originalCode,
  modernizedCode,
  sourceVersion,
  targetVersion,
}: TestPanelProps) {
  const [tests, setTests] = useState<GeneratedTest[]>([])
  const [originalResults, setOriginalResults] = useState<TestResult[]>([])
  const [modernizedResults, setModernizedResults] = useState<TestResult[]>([])
  const [status, setStatus] = useState<TestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<{
    matching: number
    different: number
    errors: number
  } | null>(null)

  const handleGenerateTests = useCallback(async () => {
    if (!originalCode.trim() || !modernizedCode.trim()) return

    setStatus('generating')
    setError(null)
    setTests([])
    setOriginalResults([])
    setModernizedResults([])
    setComparison(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/test/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalCode,
            modernizedCode,
            sourceVersion,
            targetVersion,
            testType: 'io',
            outputLanguage: 'ko',
            maxTestCases: 5,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tests')
      }

      setTests(data.tests)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('idle')
    }
  }, [originalCode, modernizedCode, sourceVersion, targetVersion])

  const handleRunComparison = useCallback(async () => {
    if (tests.length === 0) return

    setStatus('comparing')
    setError(null)

    // 진행중 상태 표시
    setOriginalResults(
      tests.map((t) => ({
        testId: t.id,
        testName: t.name,
        status: 'pending' as const,
        description: t.description,
        assertions: t.assertions,
      }))
    )
    setModernizedResults(
      tests.map((t) => ({
        testId: t.id,
        testName: t.name,
        status: 'pending' as const,
        description: t.description,
        assertions: t.assertions,
      }))
    )

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/test/compare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalCode,
            modernizedCode,
            tests,
            sourceVersion,
            targetVersion,
            timeout: 30000,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run tests')
      }

      // 결과에 description과 assertions 추가
      const enrichedOriginalResults = data.originalResults.map((r: TestResult, idx: number) => ({
        ...r,
        description: tests[idx]?.description,
        assertions: tests[idx]?.assertions,
      }))

      const enrichedModernizedResults = data.modernizedResults.map((r: TestResult, idx: number) => ({
        ...r,
        description: tests[idx]?.description,
        assertions: tests[idx]?.assertions,
      }))

      setOriginalResults(enrichedOriginalResults)
      setModernizedResults(enrichedModernizedResults)
      setComparison(data.comparison)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('idle')
    }
  }, [tests, originalCode, modernizedCode, sourceVersion, targetVersion])

  const getSummary = () => {
    if (!comparison) return null

    const total = comparison.matching + comparison.different + comparison.errors
    const percentage = total > 0 ? Math.round((comparison.matching / total) * 100) : 0

    return { total, percentage }
  }

  const summary = getSummary()

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-slate-800">Test Comparison</h3>
          {summary && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                summary.percentage === 100
                  ? 'bg-green-100 text-green-700'
                  : summary.percentage >= 80
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {comparison?.matching}/{summary.total} matching ({summary.percentage}%)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateTests}
            disabled={status === 'generating' || status === 'comparing' || !originalCode.trim()}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {status === 'generating' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Tests
              </>
            )}
          </button>
          {tests.length > 0 && (
            <button
              onClick={handleRunComparison}
              disabled={status === 'generating' || status === 'comparing'}
              className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {status === 'comparing' ? (
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
                  Run Comparison
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {status === 'idle' && tests.length === 0 && (!originalCode.trim() || !modernizedCode.trim()) && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">먼저 코드를 변환해주세요</p>
              <p className="text-xs text-slate-300 mt-1">
                Diff View에서 코드 변환 후 테스트를 생성할 수 있습니다
              </p>
            </div>
          </div>
        )}

        {status === 'idle' && tests.length === 0 && originalCode.trim() && modernizedCode.trim() && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Click &quot;Generate Tests&quot; to create test cases</p>
              <p className="text-xs text-slate-300 mt-1">
                Tests will verify that original and modernized code produce identical outputs
              </p>
            </div>
          </div>
        )}

        {tests.length > 0 && (
          <div className="p-4">
            {/* Test Summary */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Generated {tests.length} test case{tests.length > 1 ? 's' : ''}
                </span>
                {comparison && (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600">
                      {comparison.matching} matching
                    </span>
                    <span className="text-red-600">
                      {comparison.different} different
                    </span>
                    <span className="text-yellow-600">
                      {comparison.errors} errors
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Two-column comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Original Results */}
              <div>
                <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Original</span>
                  {sourceVersion.toUpperCase()}
                </h4>
                <div className="space-y-2">
                  {originalResults.length > 0
                    ? originalResults.map((result) => (
                        <TestResultCard key={result.testId} result={result} />
                      ))
                    : tests.map((test) => (
                        <TestResultCard
                          key={test.id}
                          result={{
                            testId: test.id,
                            testName: test.name,
                            status: 'pending',
                            description: test.description,
                            assertions: test.assertions,
                            expectedOutput: test.expectedOutput,
                          }}
                        />
                      ))}
                </div>
              </div>

              {/* Modernized Results */}
              <div>
                <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Modernized</span>
                  {targetVersion.toUpperCase()}
                </h4>
                <div className="space-y-2">
                  {modernizedResults.length > 0
                    ? modernizedResults.map((result) => (
                        <TestResultCard key={result.testId} result={result} />
                      ))
                    : tests.map((test) => (
                        <TestResultCard
                          key={test.id}
                          result={{
                            testId: test.id,
                            testName: test.name,
                            status: 'pending',
                            description: test.description,
                            assertions: test.assertions,
                            expectedOutput: test.expectedOutput,
                          }}
                        />
                      ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
