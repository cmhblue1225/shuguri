'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  getProject,
  updateProject,
  deleteProject,
  getProjectDocuments,
  exportDocument,
  type Project,
  type ProjectDocument,
  type ExportFormat,
} from '@/lib/api'

const versions = [
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
]

type TabType = 'documents' | 'history'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('documents')
  const [exporting, setExporting] = useState<string | null>(null)
  const [showDocContent, setShowDocContent] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    sourceVersion: '',
    targetVersion: '',
  })

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const [projectData, docsData] = await Promise.all([
        getProject(projectId),
        getProjectDocuments(projectId),
      ])
      setProject(projectData)
      setDocuments(docsData)
      setEditForm({
        name: projectData.name,
        description: projectData.description || '',
        sourceVersion: projectData.sourceVersion,
        targetVersion: projectData.targetVersion,
      })
    } catch (err) {
      console.error('Failed to load project:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editForm.name.trim()) return

    setSaving(true)
    try {
      const updated = await updateProject(projectId, {
        name: editForm.name,
        description: editForm.description || undefined,
        sourceVersion: editForm.sourceVersion,
        targetVersion: editForm.targetVersion,
      })
      setProject(updated)
      setEditing(false)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      await deleteProject(projectId)
      router.push('/projects')
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleExport = async (docId: string, format: ExportFormat) => {
    setExporting(docId)
    try {
      const result = await exportDocument({
        documentId: docId,
        format,
        includeMetadata: true,
        includeTableOfContents: true,
      })

      // Create download link
      const blob = new Blob([result.content], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export:', err)
      alert('내보내기에 실패했습니다.')
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <MainLayout title="프로젝트" description="로딩 중...">
        <div className="card p-12 text-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout title="프로젝트" description="프로젝트를 찾을 수 없습니다">
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">프로젝트를 찾을 수 없습니다.</p>
          <Link href="/projects" className="btn-primary">
            프로젝트 목록으로
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={project.name} description="프로젝트 상세">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/projects" className="hover:text-primary-600">프로젝트</Link>
        <span>/</span>
        <span className="text-gray-900">{project.name}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="col-span-1 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">프로젝트 정보</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  수정
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="label">이름</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">설명</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">소스 버전</label>
                  <select
                    className="select"
                    value={editForm.sourceVersion}
                    onChange={(e) => setEditForm({ ...editForm, sourceVersion: e.target.value })}
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
                    value={editForm.targetVersion}
                    onChange={(e) => setEditForm({ ...editForm, targetVersion: e.target.value })}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="btn-secondary flex-1"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">이름</p>
                  <p className="text-sm text-gray-900">{project.name}</p>
                </div>

                {project.description && (
                  <div>
                    <p className="text-xs text-gray-500">설명</p>
                    <p className="text-sm text-gray-900">{project.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500">버전</p>
                  <p className="text-sm text-gray-900">
                    {project.sourceVersion.replace('cpp', 'C++')} → {project.targetVersion.replace('cpp', 'C++')}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">생성일</p>
                  <p className="text-sm text-gray-900">
                    {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">마지막 수정</p>
                  <p className="text-sm text-gray-900">
                    {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">빠른 작업</h3>
            <div className="space-y-2">
              <Link
                href={`/diff?from=${project.sourceVersion}&to=${project.targetVersion}`}
                className="block w-full btn-secondary text-center text-sm"
              >
                버전 비교
              </Link>
              <Link
                href={`/generate?from=${project.sourceVersion}&to=${project.targetVersion}`}
                className="block w-full btn-secondary text-center text-sm"
              >
                문서 생성
              </Link>
              <Link
                href={`/modernize?from=${project.sourceVersion}&to=${project.targetVersion}`}
                className="block w-full btn-secondary text-center text-sm"
              >
                코드 현대화
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-5 border-red-200">
            <h3 className="font-medium text-red-600 mb-4">위험 영역</h3>
            <button
              onClick={handleDelete}
              className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-md text-sm hover:bg-red-100 transition-colors"
            >
              프로젝트 삭제
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="col-span-2">
          <div className="card">
            {/* Tabs */}
            <div className="border-b border-surface-border">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  생성된 문서 ({documents.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  작업 히스토리
                </button>
              </nav>
            </div>

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <>
                {documents.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mb-4">아직 생성된 문서가 없습니다.</p>
                    <Link
                      href={`/generate?from=${project.sourceVersion}&to=${project.targetVersion}`}
                      className="btn-primary"
                    >
                      문서 생성하기
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDocType(doc.docType)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(doc.createdAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowDocContent(showDocContent === doc.id ? null : doc.id)}
                              className="btn-secondary text-xs"
                            >
                              {showDocContent === doc.id ? '접기' : '보기'}
                            </button>
                            <div className="relative group">
                              <button
                                disabled={exporting === doc.id}
                                className="btn-secondary text-xs"
                              >
                                {exporting === doc.id ? '...' : '내보내기'}
                              </button>
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                  onClick={() => handleExport(doc.id, 'markdown')}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  Markdown (.md)
                                </button>
                                <button
                                  onClick={() => handleExport(doc.id, 'html')}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  HTML (.html)
                                </button>
                                <button
                                  onClick={() => handleExport(doc.id, 'json')}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  JSON (.json)
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Document Content Preview */}
                        {showDocContent === doc.id && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md max-h-96 overflow-y-auto">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {doc.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 mb-2">작업 히스토리</p>
                <p className="text-sm text-gray-400">
                  프로젝트에서 수행한 분석, 문서 생성, 코드 현대화 기록이 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

function formatDocType(docType: string): string {
  const labels: Record<string, string> = {
    migration_guide: '마이그레이션 가이드',
    release_notes: '릴리즈 노트',
    test_points: '테스트 포인트',
  }
  return labels[docType] || docType
}
