'use client'

import { useRef, useEffect } from 'react'
import { useChat } from './ChatContext'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

/**
 * 채팅 컨테이너 컴포넌트
 * 메시지 목록 및 입력 필드 포함
 */
export default function ChatContainer() {
  const { messages, isLoading, sendMessage, clearMessages, responseMode, setResponseMode } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">C++ 버전 가이드</h2>
            <p className="text-xs text-slate-500">RAG 기반 질의응답</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 응답 길이 토글 */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${responseMode === 'short' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              짧게
            </span>
            <button
              onClick={() => setResponseMode(responseMode === 'short' ? 'detailed' : 'short')}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                responseMode === 'detailed' ? 'bg-primary-600' : 'bg-slate-300'
              }`}
              title={responseMode === 'detailed' ? '자세한 답변 모드' : '짧은 답변 모드'}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  responseMode === 'detailed' ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
            <span className={`text-xs ${responseMode === 'detailed' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              자세히
            </span>
          </div>

          {/* 대화 초기화 버튼 */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded hover:bg-slate-100"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              C++ 버전에 대해 물어보세요
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              C++11, C++14, C++17의 새로운 기능, 변경사항, 사용 방법에 대해 질문해보세요.
              마인드맵의 노드를 클릭하면 자동으로 질문이 전송됩니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'std::optional이 뭔가요?',
                '람다 표현식 사용법',
                'auto 키워드 설명',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  )
}
