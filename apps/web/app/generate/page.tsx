'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import { generateDocument, type GenerationResult } from '@/lib/api'

const versions = [
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
]

const docTypes = [
  { id: 'migration_guide', name: '마이그레이션 가이드', desc: '버전 업그레이드 가이드' },
  { id: 'release_notes', name: '릴리즈 노트', desc: '변경사항 정리 문서' },
  { id: 'test_points', name: '테스트 포인트', desc: '테스트 체크리스트' },
]

const targetLevels = [
  { id: 'beginner', name: '초급' },
  { id: 'intermediate', name: '중급' },
  { id: 'senior', name: '시니어' },
  { id: 'compiler-engineer', name: '컴파일러 엔지니어' },
]

export default function GeneratePage() {
  const [sourceVersion, setSourceVersion] = useState('cpp11')
  const [targetVersion, setTargetVersion] = useState('cpp17')
  const [docType, setDocType] = useState<'migration_guide' | 'release_notes' | 'test_points'>('migration_guide')
  const [targetLevel, setTargetLevel] = useState<'beginner' | 'intermediate' | 'senior' | 'compiler-engineer'>('intermediate')
  const [outputLanguage, setOutputLanguage] = useState<'ko' | 'en'>('ko')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (sourceVersion === targetVersion) {
      setError('소스 버전과 타겟 버전이 같습니다.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await generateDocument({
        sourceVersion,
        targetVersion,
        docType,
        options: {
          targetLevel,
          outputLanguage,
          outputFormat: 'mixed',
          useRag: true,
        },
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title="문서 생성" description="마이그레이션 가이드, 릴리즈 노트 자동 생성">
      <div className="grid grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="col-span-1 space-y-4">
          {/* Version Selection */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">버전 선택</h3>
            <div className="space-y-3">
              <div>
                <label className="label">소스 버전</label>
                <select
                  className="select"
                  value={sourceVersion}
                  onChange={(e) => setSourceVersion(e.target.value)}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">타겟 버전</label>
                <select
                  className="select"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Document Type */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">문서 유형</h3>
            <div className="space-y-2">
              {docTypes.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    docType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="docType"
                    value={type.id}
                    checked={docType === type.id}
                    onChange={(e) => setDocType(e.target.value as typeof docType)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{type.name}</p>
                    <p className="text-xs text-gray-500">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">옵션</h3>
            <div className="space-y-3">
              <div>
                <label className="label">대상 독자</label>
                <select
                  className="select"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value as typeof targetLevel)}
                >
                  {targetLevels.map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">언어</label>
                <select
                  className="select"
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value as typeof outputLanguage)}
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                생성 중...
              </span>
            ) : (
              '문서 생성'
            )}
          </button>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Result Panel */}
        <div className="col-span-2">
          {result ? (
            <div className="card">
              {/* Header */}
              <div className="p-4 border-b border-surface-border flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {docTypes.find((t) => t.id === result.docType)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {result.sourceVersion.replace('cpp', 'C++')} → {result.targetVersion.replace('cpp', 'C++')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {result.cached && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">캐시됨</span>
                  )}
                  <span>{(result.generationTimeMs / 1000).toFixed(1)}초</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 prose max-w-none overflow-auto max-h-[calc(100vh-300px)]">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result.content) }} />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-surface-border flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  RAG 참조 문서: {result.ragSourcesUsed}개
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(result.content)}
                    className="btn-secondary text-sm"
                  >
                    복사
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([result.content], { type: 'text/markdown' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${result.docType}_${result.sourceVersion}_to_${result.targetVersion}.md`
                      a.click()
                    }}
                    className="btn-secondary text-sm"
                  >
                    다운로드
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center h-full flex flex-col items-center justify-center">
              <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">설정을 선택하고 문서 생성 버튼을 클릭하세요.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

// Simple markdown to HTML converter
function formatMarkdown(text: string): string {
  return text
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
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match
      return `<p>${match}</p>`
    })
}
