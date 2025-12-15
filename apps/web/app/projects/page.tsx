'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { getProjects, createProject, updateProject, deleteProject, type Project } from '@/lib/api'

const versions = [
  { id: 'cpp11', name: 'C++11' },
  { id: 'cpp14', name: 'C++14' },
  { id: 'cpp17', name: 'C++17' },
  { id: 'cpp20', name: 'C++20' },
  { id: 'cpp23', name: 'C++23' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Create form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    sourceVersion: 'cpp11',
    targetVersion: 'cpp17',
  })

  // Edit form state
  const [editProject, setEditProject] = useState({
    name: '',
    description: '',
    sourceVersion: 'cpp11',
    targetVersion: 'cpp17',
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newProject.name.trim()) return

    setCreating(true)
    try {
      const project = await createProject({
        name: newProject.name,
        description: newProject.description || undefined,
        sourceVersion: newProject.sourceVersion,
        targetVersion: newProject.targetVersion,
      })
      setProjects([project, ...projects])
      setShowCreateModal(false)
      setNewProject({
        name: '',
        description: '',
        sourceVersion: 'cpp11',
        targetVersion: 'cpp17',
      })
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return

    try {
      await deleteProject(id)
      setProjects(projects.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setEditProject({
      name: project.name,
      description: project.description || '',
      sourceVersion: project.sourceVersion,
      targetVersion: project.targetVersion,
    })
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!editingProject || !editProject.name.trim()) return

    setEditing(true)
    try {
      const updated = await updateProject(editingProject.id, {
        name: editProject.name,
        description: editProject.description || undefined,
        sourceVersion: editProject.sourceVersion,
        targetVersion: editProject.targetVersion,
      })
      setProjects(projects.map((p) => (p.id === editingProject.id ? updated : p)))
      setShowEditModal(false)
      setEditingProject(null)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setEditing(false)
    }
  }

  return (
    <MainLayout title="프로젝트" description="마이그레이션 프로젝트 관리">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            총 {projects.length}개의 프로젝트
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          새 프로젝트
        </button>
      </div>

      {/* Project List */}
      {loading ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-gray-500 mb-4">아직 프로젝트가 없습니다.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            첫 프로젝트 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-5 hover:border-primary-300 transition-colors">
              <div className="flex items-start justify-between">
                <Link href={`/projects/${project.id}`} className="flex-1">
                  <h3 className="font-medium text-gray-900 hover:text-primary-600">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </Link>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(project)}
                    className="text-gray-400 hover:text-primary-500 p-1"
                    title="수정"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  {project.sourceVersion.replace('cpp', 'C++')} → {project.targetVersion.replace('cpp', 'C++')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              새 프로젝트 만들기
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">프로젝트 이름</label>
                <input
                  type="text"
                  className="input"
                  placeholder="프로젝트 이름을 입력하세요"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">설명 (선택)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="프로젝트 설명을 입력하세요"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">소스 버전</label>
                  <select
                    className="select"
                    value={newProject.sourceVersion}
                    onChange={(e) => setNewProject({ ...newProject, sourceVersion: e.target.value })}
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
                    value={newProject.targetVersion}
                    onChange={(e) => setNewProject({ ...newProject, targetVersion: e.target.value })}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newProject.name.trim()}
                className="btn-primary"
              >
                {creating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              프로젝트 수정
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">프로젝트 이름</label>
                <input
                  type="text"
                  className="input"
                  placeholder="프로젝트 이름을 입력하세요"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">설명 (선택)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="프로젝트 설명을 입력하세요"
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">소스 버전</label>
                  <select
                    className="select"
                    value={editProject.sourceVersion}
                    onChange={(e) => setEditProject({ ...editProject, sourceVersion: e.target.value })}
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
                    value={editProject.targetVersion}
                    onChange={(e) => setEditProject({ ...editProject, targetVersion: e.target.value })}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProject(null)
                }}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleEdit}
                disabled={editing || !editProject.name.trim()}
                className="btn-primary"
              >
                {editing ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
