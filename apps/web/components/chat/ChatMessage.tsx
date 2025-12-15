'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage as ChatMessageType } from './ChatContext'

interface ChatMessageProps {
  message: ChatMessageType
}

/**
 * 채팅 메시지 버블 컴포넌트
 * 마크다운 렌더링 지원
 */
function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3
          ${
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          }
          ${message.isStreaming ? 'animate-pulse' : ''}
        `}
      >
        {/* 역할 라벨 */}
        <div
          className={`text-xs mb-1 ${isUser ? 'text-white/70' : 'text-slate-500'}`}
        >
          {isUser ? '나' : 'AI 어시스턴트'}
        </div>

        {/* 메시지 내용 */}
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-slate">
            {message.content ? (
              <ReactMarkdown
                components={{
                  // 코드 블록 스타일링
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !className
                    return isInline ? (
                      <code
                        className="bg-slate-200 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className={`${className} block bg-slate-800 text-slate-100 p-3 rounded-lg text-sm font-mono overflow-x-auto`}
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  // pre 태그 스타일링
                  pre({ children }) {
                    return <pre className="bg-transparent p-0 m-0">{children}</pre>
                  },
                  // 링크 스타일링
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    )
                  },
                  // 리스트 스타일링
                  ul({ children }) {
                    return <ul className="list-disc pl-4 my-2">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 my-2">{children}</ol>
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse" />
            )}
          </div>
        )}

        {/* 스트리밍 인디케이터 */}
        {message.isStreaming && message.content && (
          <span className="inline-block w-2 h-4 ml-1 bg-primary-500 animate-pulse" />
        )}

        {/* 타임스탬프 */}
        <div
          className={`text-xs mt-2 ${isUser ? 'text-white/50' : 'text-slate-400'}`}
        >
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(ChatMessage)
