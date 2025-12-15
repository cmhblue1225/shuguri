'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatProvider, useChat } from '@/components/chat/ChatContext'
import ChatContainer from '@/components/chat/ChatContainer'
import MindmapViewer from '@/components/mindmap/MindmapViewer'
import { Sidebar } from '@/components/layout/Sidebar'
import { useSidebar } from '@/lib/sidebar-context'
import { ResizableDivider } from '@/components/ui/ResizableDivider'

// 사용 가능한 C++ 버전 목록
const AVAILABLE_VERSIONS = [
  { id: 'cpp11', name: 'C++11', year: 2011 },
  { id: 'cpp14', name: 'C++14', year: 2014 },
  { id: 'cpp17', name: 'C++17', year: 2017 },
  { id: 'cpp20', name: 'C++20', year: 2020 },
  { id: 'cpp23', name: 'C++23', year: 2023 },
  { id: 'cpp26', name: 'C++26', year: 2026 },
]

/**
 * 메인 컨텐츠 컴포넌트 (ChatProvider 내부에서 사용)
 */
// 챗봇 패널 너비 상수
const MIN_CHAT_WIDTH = 300
const MAX_CHAT_WIDTH = 600
const DEFAULT_CHAT_WIDTH = 400

function ChatPageContent() {
  const { setVersions, sendMessage, sourceVersion, targetVersion } = useChat()
  const { isOpen, toggle } = useSidebar()
  const [localSourceVersion, setLocalSourceVersion] = useState('cpp11')
  const [localTargetVersion, setLocalTargetVersion] = useState('cpp14')
  const [isVersionValid, setIsVersionValid] = useState(true)
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH)

  // 패널 크기 조절 핸들러
  const handleResize = useCallback((delta: number) => {
    setChatWidth((prev) => {
      // 왼쪽으로 드래그(-delta)하면 챗봇이 넓어짐
      const newWidth = prev - delta
      return Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, newWidth))
    })
  }, [])

  // Source 버전 변경 핸들러
  const handleSourceChange = useCallback(
    (value: string) => {
      setLocalSourceVersion(value)
      // Target 버전보다 이후 버전이면 경고
      const sourceIndex = AVAILABLE_VERSIONS.findIndex(v => v.id === value)
      const targetIndex = AVAILABLE_VERSIONS.findIndex(v => v.id === localTargetVersion)
      setIsVersionValid(sourceIndex < targetIndex)
    },
    [localTargetVersion]
  )

  // Target 버전 변경 핸들러
  const handleTargetChange = useCallback(
    (value: string) => {
      setLocalTargetVersion(value)
      // Source 버전보다 이전 버전이면 경고
      const sourceIndex = AVAILABLE_VERSIONS.findIndex(v => v.id === localSourceVersion)
      const targetIndex = AVAILABLE_VERSIONS.findIndex(v => v.id === value)
      setIsVersionValid(sourceIndex < targetIndex)
    },
    [localSourceVersion]
  )

  // 버전 적용 핸들러
  const handleApplyVersions = useCallback(() => {
    if (isVersionValid) {
      setVersions(localSourceVersion, localTargetVersion)
    }
  }, [localSourceVersion, localTargetVersion, isVersionValid, setVersions])

  // 초기 버전 설정
  useEffect(() => {
    setVersions(localSourceVersion, localTargetVersion)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 마인드맵 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (nodeData: { label: string; description?: string; category?: string }) => {
      // 노드 클릭 시 자동 질문 생성
      const question = nodeData.description
        ? `"${nodeData.label}"에 대해 자세히 설명해주세요. (${nodeData.description})`
        : `"${nodeData.label}"에 대해 자세히 설명해주세요.`

      sendMessage(question)
    },
    [sendMessage]
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div
        className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${
          isOpen ? 'pl-56' : 'pl-0'
        }`}
      >
        {/* 헤더 */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 사이드바 토글 버튼 */}
            <button
              onClick={toggle}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title={isOpen ? '사이드바 닫기' : '사이드바 열기'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">C++ 버전 가이드</h1>
              <span className="text-sm text-slate-500">
                마인드맵 + RAG 챗봇
              </span>
            </div>
          </div>

          {/* 버전 선택 UI */}
          <div className="flex items-center gap-3">
            {/* Source 버전 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">From:</label>
              <select
                value={localSourceVersion}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[100px]"
              >
                {AVAILABLE_VERSIONS.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 화살표 */}
            <span className="text-slate-400 text-lg">→</span>

            {/* Target 버전 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">To:</label>
              <select
                value={localTargetVersion}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[100px]"
              >
                {AVAILABLE_VERSIONS.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 적용 버튼 */}
            <button
              onClick={handleApplyVersions}
              disabled={!isVersionValid}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isVersionValid
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              비교하기
            </button>

            {/* 유효성 경고 */}
            {!isVersionValid && (
              <span className="text-xs text-red-500">
                Source가 Target보다 이전 버전이어야 합니다
              </span>
            )}
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 flex overflow-hidden p-4 gap-0">
          {/* 왼쪽: 마인드맵 */}
          <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
            <MindmapViewer
              sourceVersion={sourceVersion}
              targetVersion={targetVersion}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* 리사이저블 분할선 */}
          <div className="px-1 h-full flex items-center">
            <ResizableDivider onResize={handleResize} />
          </div>

          {/* 오른쪽: 챗봇 (동적 너비) */}
          <div style={{ width: chatWidth }} className="flex-shrink-0">
            <ChatContainer />
          </div>
        </main>

        {/* 푸터 */}
        <footer className="bg-white border-t px-6 py-3 text-center text-sm text-slate-500">
          마인드맵의 노드를 클릭하면 해당 기능에 대한 질문이 자동으로 전송됩니다.
        </footer>
      </div>
    </div>
  )
}

/**
 * 채팅 페이지
 * 마인드맵과 챗봇을 통합한 NotebookLM 스타일 인터페이스
 */
export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  )
}
