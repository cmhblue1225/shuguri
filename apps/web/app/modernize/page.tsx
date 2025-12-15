'use client'

import { useState, useCallback, useMemo } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useSidebar } from '@/lib/sidebar-context'
import { FileUpload, CodeEditor, DiffViewer, ExplanationPanel, CompilePanel, TestPanel, type Change } from './components'
import { computeChanges, groupSimilarChanges } from './lib/computeChanges'

// Extract pure code from markdown if needed
function extractCode(text: string): string {
  if (!text) return ''
  const codeBlockMatch = text.match(/```(?:cpp|c\+\+)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }
  return text
}

const VERSIONS = [
  { id: 'cpp98', name: 'C++98' },
  { id: 'cpp03', name: 'C++03' },
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
  { id: 'cpp26', name: 'C++26' },
]

const SAMPLE_CODE = `#include <iostream>
#include <vector>
#include <algorithm>

class Widget {
public:
    Widget() : data(NULL), size(0) {}
    ~Widget() { delete[] data; }

    void init(int n) {
        data = new int[n];
        size = n;
        for (int i = 0; i < n; i++) {
            data[i] = 0;
        }
    }

    typedef std::vector<int>::iterator iter_type;

    void process(std::vector<int>& vec) {
        for (iter_type it = vec.begin(); it != vec.end(); ++it) {
            std::cout << *it << std::endl;
        }
    }

private:
    int* data;
    int size;
};

int main() {
    Widget* w = new Widget();
    w->init(10);

    std::vector<int> nums;
    nums.push_back(1);
    nums.push_back(2);
    nums.push_back(3);

    w->process(nums);

    delete w;
    return 0;
}`

interface ModernizeResult {
  id: string
  originalCode: string
  modernizedCode: string
  changes: Change[]
  ragSourcesUsed: number
  generationTimeMs: number
}

type ViewMode = 'input' | 'result'
type ResultTab = 'diff' | 'compile' | 'tests'

export default function ModernizePage() {
  const { isOpen, toggle } = useSidebar()

  // Input state
  const [sourceVersion, setSourceVersion] = useState('cpp11')
  const [targetVersion, setTargetVersion] = useState('cpp17')
  const [code, setCode] = useState('')
  const [filename, setFilename] = useState('')
  const [outputLanguage, setOutputLanguage] = useState<'ko' | 'en'>('ko')

  // Result state
  const [result, setResult] = useState<ModernizeResult | null>(null)
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('input')
  const [resultTab, setResultTab] = useState<ResultTab>('diff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileLoad = useCallback((content: string, name: string) => {
    setCode(content)
    setFilename(name)
  }, [])

  const loadSampleCode = useCallback(() => {
    setCode(SAMPLE_CODE)
    setFilename('widget.cpp')
  }, [])

  const handleModernize = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter code to transform.')
      return
    }

    const sourceIdx = VERSIONS.findIndex(v => v.id === sourceVersion)
    const targetIdx = VERSIONS.findIndex(v => v.id === targetVersion)
    if (sourceIdx >= targetIdx) {
      setError('Target version must be newer than source version.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/generate/modernize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceVersion,
          targetVersion,
          code,
          filename: filename || undefined,
          outputLanguage,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to transform code')
      }

      const data = await response.json()

      // Get modernized code and extract pure code
      const modernizedCodeRaw = data.data?.modernizedCode || data.data?.content || code
      const modernizedCodeClean = extractCode(modernizedCodeRaw)

      // Compute real changes by comparing original and modernized code
      const rawChanges = computeChanges(code, modernizedCodeClean, outputLanguage)
      const changes = groupSimilarChanges(rawChanges)

      setResult({
        id: data.data?.id || 'result-1',
        originalCode: code,
        modernizedCode: modernizedCodeRaw,
        changes,
        ragSourcesUsed: data.data?.ragSourcesUsed || 0,
        generationTimeMs: data.data?.generationTimeMs || 0,
      })
      setViewMode('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [code, sourceVersion, targetVersion, filename, outputLanguage])

  const cleanModernizedCode = useMemo(() => {
    return result ? extractCode(result.modernizedCode) : ''
  }, [result])

  const handleDownload = useCallback(() => {
    if (!cleanModernizedCode) return
    const blob = new Blob([cleanModernizedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ? `modernized_${filename}` : 'modernized_code.cpp'
    a.click()
    URL.revokeObjectURL(url)
  }, [cleanModernizedCode, filename])

  const handleChangeSelect = useCallback((change: Change) => {
    setSelectedChangeId(change.id)
  }, [])

  const handleReset = useCallback(() => {
    setViewMode('input')
    setResult(null)
    setSelectedChangeId(null)
    setResultTab('diff')
  }, [])

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${isOpen ? 'pl-56' : 'pl-0'}`}>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title={isOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Code Modernizer</h1>
              <span className="text-sm text-slate-500">Transform legacy C++ to modern standards</span>
            </div>
          </div>

          {/* Version Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">From:</label>
              <select
                value={sourceVersion}
                onChange={(e) => setSourceVersion(e.target.value)}
                disabled={viewMode === 'result'}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {VERSIONS.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <span className="text-slate-400 text-lg">→</span>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">To:</label>
              <select
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                disabled={viewMode === 'result'}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {VERSIONS.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <label className="text-sm text-slate-600 font-medium">Lang:</label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value as 'ko' | 'en')}
                disabled={viewMode === 'result'}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="ko">Korean</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-4">
          {viewMode === 'input' ? (
            /* Input View */
            <div className="h-full flex flex-col gap-4">
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* Code Input */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="filename.cpp"
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={loadSampleCode}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Load Sample
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      code={code}
                      onChange={setCode}
                      filename={filename || 'input.cpp'}
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium text-slate-700">Or upload a file</h3>
                  <FileUpload onFileLoad={handleFileLoad} />

                  <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 flex flex-col items-center justify-center">
                    <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-600 mb-2">Ready to Transform</h3>
                    <p className="text-sm text-slate-400 text-center max-w-sm">
                      Enter your legacy C++ code on the left or upload a file.
                      The AI will modernize it to the target C++ standard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transform Button */}
              <div className="flex items-center justify-center gap-4">
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <button
                  onClick={handleModernize}
                  disabled={loading || !code.trim()}
                  className="px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Transforming...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Transform Code
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Result View - 3 Column Layout */
            <div className="h-full flex flex-col gap-4">
              {/* Result Header */}
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200">
                <div className="flex items-center gap-4">
                  {/* Tab Navigation */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setResultTab('diff')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        resultTab === 'diff'
                          ? 'bg-white text-slate-900 shadow-sm font-medium'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Diff View
                    </button>
                    <button
                      onClick={() => setResultTab('compile')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        resultTab === 'compile'
                          ? 'bg-white text-slate-900 shadow-sm font-medium'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Compile Check
                    </button>
                    <button
                      onClick={() => setResultTab('tests')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        resultTab === 'tests'
                          ? 'bg-white text-slate-900 shadow-sm font-medium'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tests
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">
                    {result?.changes.length || 0} changes | RAG: {result?.ragSourcesUsed || 0} sources | {((result?.generationTimeMs || 0) / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(cleanModernizedCode)}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New Transform
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {resultTab === 'diff' && (
                <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                  {/* Left: Diff Viewer (spans 2 columns) */}
                  <div className="col-span-2 min-h-0">
                    <DiffViewer
                      originalCode={result?.originalCode || ''}
                      modernizedCode={result?.modernizedCode || ''}
                      filename={filename || 'code.cpp'}
                      changes={result?.changes || []}
                      selectedChangeId={selectedChangeId}
                      onChangeClick={handleChangeSelect}
                    />
                  </div>

                  {/* Right: Explanation Panel */}
                  <div className="min-h-0">
                    <ExplanationPanel
                      changes={result?.changes || []}
                      selectedChangeId={selectedChangeId}
                      onChangeSelect={handleChangeSelect}
                      modernizedCode={result?.modernizedCode}
                    />
                  </div>
                </div>
              )}

              {resultTab === 'compile' && (
                <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                  {/* Original Code Compile Panel */}
                  <CompilePanel
                    code={result?.originalCode || ''}
                    cppStandard={sourceVersion}
                    title="Original"
                    type="original"
                  />

                  {/* Modernized Code Compile Panel */}
                  <CompilePanel
                    code={cleanModernizedCode}
                    cppStandard={targetVersion}
                    title="Modernized"
                    type="modernized"
                  />
                </div>
              )}

              {resultTab === 'tests' && (
                <TestPanel
                  originalCode={result?.originalCode || ''}
                  modernizedCode={cleanModernizedCode}
                  sourceVersion={sourceVersion}
                  targetVersion={targetVersion}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
