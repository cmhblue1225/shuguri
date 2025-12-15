'use client'

import { useState, useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

/**
 * 채팅 입력 컴포넌트
 */
export default function ChatInput({
  onSend,
  isLoading,
  placeholder = '질문을 입력하세요...',
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 메시지 전송
  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      if (!input.trim() || isLoading) return

      onSend(input.trim())
      setInput('')

      // textarea 높이 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    },
    [input, isLoading, onSend]
  )

  // Enter 키 처리 (Shift+Enter는 줄바꿈)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  // textarea 자동 높이 조절
  const handleInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [])

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="
            w-full px-4 py-3 rounded-xl border border-slate-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            resize-none overflow-hidden
            disabled:bg-slate-50 disabled:text-slate-400
            text-sm
          "
          style={{ maxHeight: '150px' }}
        />
      </div>

      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="
          px-4 py-3 rounded-xl bg-primary text-white font-medium
          hover:bg-primary/90 transition-colors
          disabled:bg-slate-300 disabled:cursor-not-allowed
          flex items-center gap-2
        "
      >
        {isLoading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>응답 중</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <span>전송</span>
          </>
        )}
      </button>
    </form>
  )
}
