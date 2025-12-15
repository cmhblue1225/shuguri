'use client'

import { useState, useEffect, useCallback } from 'react'

interface ResizableDividerProps {
  onResize: (delta: number) => void
}

/**
 * 리사이저블 분할선 컴포넌트
 * 마우스 드래그로 좌우 패널 크기 조절
 */
export function ResizableDivider({ onResize }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      onResize(e.movementX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        w-2 cursor-col-resize flex-shrink-0
        flex items-center justify-center
        transition-colors duration-150
        hover:bg-primary/20
        ${isDragging ? 'bg-primary/30' : 'bg-transparent'}
      `}
      title="드래그하여 크기 조절"
    >
      {/* 드래그 핸들 표시 */}
      <div
        className={`
          w-1 h-16 rounded-full transition-colors duration-150
          ${isDragging ? 'bg-primary-600' : 'bg-slate-300 hover:bg-slate-400'}
        `}
      />
    </div>
  )
}
