'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import { analyzeDiff, type DiffResult, type DiffItem } from '@/lib/api'

const versions = [
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
]

const categoryLabels = {
  newFeatures: '새로운 기능',
  behaviorChanges: '동작 변경',
  deprecated: '비권장 (Deprecated)',
  removed: '제거됨 (Removed)',
  libraryChanges: '라이브러리 변경',
}

const categoryColors = {
  newFeatures: 'bg-green-50 border-green-200 text-green-800',
  behaviorChanges: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  deprecated: 'bg-orange-50 border-orange-200 text-orange-800',
  removed: 'bg-red-50 border-red-200 text-red-800',
  libraryChanges: 'bg-blue-50 border-blue-200 text-blue-800',
}

function DiffItemCard({ item, category }: { item: DiffItem; category: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-surface-border rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.title}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${categoryColors[category as keyof typeof categoryColors]}`}>
              {item.category}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              {item.impact}
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && item.examples && item.examples.length > 0 && (
        <div className="border-t border-surface-border p-4 bg-gray-50">
          <h5 className="text-sm font-medium text-gray-700 mb-3">코드 예제</h5>
          {item.examples.map((example, idx) => (
            <div key={idx} className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Before</p>
                <pre className="text-xs">{example.before}</pre>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">After</p>
                <pre className="text-xs">{example.after}</pre>
              </div>
              <p className="text-sm text-gray-600 mt-2">{example.explanation}</p>
            </div>
          ))}
          {item.references && item.references.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">참고 문서</p>
              <ul className="text-xs text-primary-600 mt-1">
                {item.references.map((ref, idx) => (
                  <li key={idx}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiffPage() {
  const [sourceVersion, setSourceVersion] = useState('cpp11')
  const [targetVersion, setTargetVersion] = useState('cpp14')
  const [result, setResult] = useState<DiffResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (sourceVersion === targetVersion) {
      setError('소스 버전과 타겟 버전이 같습니다.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await analyzeDiff(sourceVersion, targetVersion)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title="버전 비교" description="C++ 표준 버전 간 차이점 분석">
      {/* Version Selector */}
      <div className="card p-5 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
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

          <div className="pb-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>

          <div className="flex-1">
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

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary px-6"
          >
            {loading ? '분석 중...' : '분석'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="card p-5 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">분석 결과</h3>
            <p className="text-sm text-gray-600">{result.summary}</p>
            <div className="flex gap-4 mt-4 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-semibold text-primary-600">{result.totalChanges}</p>
                <p className="text-xs text-gray-500">총 변경사항</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{result.diff.newFeatures.length}</p>
                <p className="text-xs text-gray-500">새 기능</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-yellow-600">{result.diff.behaviorChanges.length}</p>
                <p className="text-xs text-gray-500">동작 변경</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-orange-600">{result.diff.deprecated?.length || 0}</p>
                <p className="text-xs text-gray-500">비권장</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{result.diff.removed?.length || 0}</p>
                <p className="text-xs text-gray-500">제거됨</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{result.diff.libraryChanges.length}</p>
                <p className="text-xs text-gray-500">라이브러리</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            {(Object.entries(result.diff) as [keyof typeof categoryLabels, DiffItem[]][]).map(([key, items]) => (
              items.length > 0 && (
                <div key={key}>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${key === 'newFeatures' ? 'bg-green-500' : key === 'behaviorChanges' ? 'bg-yellow-500' : key === 'deprecated' ? 'bg-orange-500' : key === 'removed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    {categoryLabels[key]}
                    <span className="text-sm font-normal text-gray-500">({items.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <DiffItemCard key={item.id} item={item} category={key} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-gray-500">버전을 선택하고 분석 버튼을 클릭하세요.</p>
        </div>
      )}
    </MainLayout>
  )
}
