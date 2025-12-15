'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MainLayout } from '@/components/layout'
import {
  uploadDocuments,
  getUploadStatus,
  getEmbeddingStats,
  type UploadProgress,
  type EmbeddingStats,
  type FileResult,
} from '@/lib/api'

const SUPPORTED_VERSIONS = [
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
  { id: 'cpp26', name: 'C++26' },
]

export default function EmbeddingPage() {
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState('cpp')
  const [version, setVersion] = useState('cpp17')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [stats, setStats] = useState<EmbeddingStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])

  // Poll for progress when job is active
  useEffect(() => {
    if (!jobId) return

    const interval = setInterval(async () => {
      try {
        const status = await getUploadStatus(jobId)
        setProgress(status)

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval)
          setUploading(false)
          loadStats() // Refresh stats
        }
      } catch {
        clearInterval(interval)
        setUploading(false)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [jobId])

  const loadStats = async () => {
    try {
      setLoadingStats(true)
      const data = await getEmbeddingStats()
      setStats(data)
    } catch {
      // Stats loading failed silently
    } finally {
      setLoadingStats(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles = selectedFiles.filter((f) =>
      /\.(md|txt|pdf)$/i.test(f.name)
    )
    setFiles((prev) => [...prev, ...validFiles])
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter((f) =>
      /\.(md|txt|pdf)$/i.test(f.name)
    )
    setFiles((prev) => [...prev, ...validFiles])
    setError(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setFiles([])
    setProgress(null)
    setJobId(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('파일을 선택해주세요.')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(null)

    try {
      const result = await uploadDocuments(files, language, version)
      setJobId(result.jobId)

      if (result.skippedFiles.length > 0) {
        setError(`건너뛴 파일: ${result.skippedFiles.join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
      setUploading(false)
    }
  }

  const getStatusIcon = (status: FileResult['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
        )
    }
  }

  return (
    <MainLayout
      title="문서 임베딩"
      description="C++ 스펙 문서를 업로드하여 RAG 시스템에 임베딩합니다."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">파일 업로드</h3>

            {/* Language & Version Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">언어</label>
                <select
                  className="select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={uploading}
                >
                  <option value="cpp">C++</option>
                </select>
              </div>
              <div>
                <label className="label">버전</label>
                <select
                  className="select"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={uploading}
                >
                  {SUPPORTED_VERSIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.txt,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                accept=".md,.txt,.pdf"
                onChange={handleFileChange}
                className="hidden"
                {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              />
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                지원 형식: .md, .txt, .pdf
              </p>
            </div>

            {/* Folder Upload Button */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary text-sm"
              >
                폴더 선택
              </button>
              {files.length > 0 && (
                <button
                  onClick={clearFiles}
                  disabled={uploading}
                  className="btn-secondary text-sm"
                >
                  전체 삭제
                </button>
              )}
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  선택된 파일 ({files.length}개)
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="btn-primary w-full mt-4 py-3"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  임베딩 중...
                </span>
              ) : (
                `임베딩 시작 (${files.length}개 파일)`
              )}
            </button>
          </div>

          {/* Progress Panel */}
          {progress && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white">진행 상황</h3>
                <span className={`text-sm font-medium ${
                  progress.status === 'completed' ? 'text-green-600' :
                  progress.status === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {progress.status === 'completed' ? '완료' :
                   progress.status === 'failed' ? '실패' :
                   progress.status === 'processing' ? '처리 중' : '대기 중'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>{progress.progress}%</span>
                  <span>{progress.completed + progress.failed} / {progress.total}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>

              {/* File List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {progress.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.filename}
                      </p>
                      {file.status === 'completed' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {file.chunksCreated} chunks, {file.totalTokens} tokens
                        </p>
                      )}
                      {file.status === 'failed' && file.error && (
                        <p className="text-xs text-red-500">{file.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {progress.status === 'completed' && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    완료: {progress.completed}개 성공, {progress.failed}개 실패
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">임베딩 현황</h3>

            {loadingStats ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Total */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <p className="text-sm text-primary-600 dark:text-primary-400">전체 문서</p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                    {stats.total.toLocaleString()}개
                  </p>
                </div>

                {/* By Version */}
                <div className="space-y-2">
                  {SUPPORTED_VERSIONS.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {v.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(stats.byVersion[v.id] || 0).toLocaleString()}개
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={loadStats}
                  className="btn-secondary w-full text-sm"
                >
                  새로고침
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                통계를 불러올 수 없습니다.
              </p>
            )}
          </div>

          {/* Info Panel */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">안내</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-primary-500">*</span>
                <span>지원 형식: Markdown, 텍스트, PDF</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">*</span>
                <span>큰 문서는 자동으로 청킹됩니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">*</span>
                <span>임베딩 모델: text-embedding-3-small</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">*</span>
                <span>청크 크기: 약 500 토큰</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
