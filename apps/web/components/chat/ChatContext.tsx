'use client'

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// 메시지 타입
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

// 응답 모드 타입
export type ResponseMode = 'short' | 'detailed'

// 채팅 상태
interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  sourceVersion: string
  targetVersion: string
  responseMode: ResponseMode
}

// 액션 타입
type ChatAction =
  | { type: 'SET_VERSIONS'; sourceVersion: string; targetVersion: string }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; content: string }
  | { type: 'FINISH_STREAMING'; id: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_RESPONSE_MODE'; mode: ResponseMode }

// 초기 상태
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  sourceVersion: 'cpp11',
  targetVersion: 'cpp14',
  responseMode: 'detailed',
}

// 리듀서
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_VERSIONS':
      return {
        ...state,
        sourceVersion: action.sourceVersion,
        targetVersion: action.targetVersion,
        messages: [], // 버전 변경 시 대화 초기화
      }
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
      }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id ? { ...msg, content: msg.content + action.content } : msg
        ),
      }
    case 'FINISH_STREAMING':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id ? { ...msg, isStreaming: false } : msg
        ),
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      }
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      }
    case 'SET_RESPONSE_MODE':
      return {
        ...state,
        responseMode: action.mode,
      }
    default:
      return state
  }
}

// Context 타입
interface ChatContextType extends ChatState {
  setVersions: (sourceVersion: string, targetVersion: string) => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  setResponseMode: (mode: ResponseMode) => void
}

// Context 생성
const ChatContext = createContext<ChatContextType | null>(null)

// Provider 컴포넌트
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  // 버전 설정
  const setVersions = useCallback((sourceVersion: string, targetVersion: string) => {
    dispatch({ type: 'SET_VERSIONS', sourceVersion, targetVersion })
  }, [])

  // 메시지 전송 및 스트리밍 응답 처리
  const sendMessage = useCallback(
    async (content: string) => {
      if (state.isLoading || !content.trim()) return

      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }
      dispatch({ type: 'ADD_MESSAGE', message: userMessage })
      dispatch({ type: 'SET_LOADING', isLoading: true })

      // 어시스턴트 메시지 플레이스홀더 추가
      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }
      dispatch({ type: 'ADD_MESSAGE', message: assistantMessage })

      try {
        // API 요청 (메시지 히스토리 포함)
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...state.messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            sourceVersion: state.sourceVersion,
            targetVersion: state.targetVersion,
            responseMode: state.responseMode,
            useRag: true,
            ragLimit: 5,
          }),
        })

        if (!response.ok) {
          throw new Error('채팅 요청에 실패했습니다.')
        }

        // SSE 스트리밍 읽기
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('응답 스트림을 읽을 수 없습니다.')
        }

        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'content') {
                  dispatch({
                    type: 'UPDATE_MESSAGE',
                    id: assistantMessageId,
                    content: data.content,
                  })
                } else if (data.type === 'done') {
                  dispatch({ type: 'FINISH_STREAMING', id: assistantMessageId })
                }
              } catch {
                // JSON 파싱 에러 무시
              }
            }
          }
        }
      } catch (error) {
        // 에러 발생 시 에러 메시지로 업데이트
        dispatch({
          type: 'UPDATE_MESSAGE',
          id: assistantMessageId,
          content: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        })
        dispatch({ type: 'FINISH_STREAMING', id: assistantMessageId })
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false })
      }
    },
    [state.messages, state.sourceVersion, state.targetVersion, state.responseMode, state.isLoading]
  )

  // 대화 초기화
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }, [])

  // 응답 모드 설정
  const setResponseMode = useCallback((mode: ResponseMode) => {
    dispatch({ type: 'SET_RESPONSE_MODE', mode })
  }, [])

  return (
    <ChatContext.Provider
      value={{
        ...state,
        setVersions,
        sendMessage,
        clearMessages,
        setResponseMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

// Custom hook
export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
