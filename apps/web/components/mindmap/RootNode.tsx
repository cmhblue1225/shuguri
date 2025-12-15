'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

interface RootNodeData {
  label: string
  description?: string
  hasChildren?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

/**
 * 루트 노드 컴포넌트
 * 마인드맵의 중심 노드
 */
function RootNode({ data, selected }: NodeProps<RootNodeData>) {
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onToggleExpand) {
      data.onToggleExpand()
    }
  }

  return (
    <div
      className={`
        relative px-6 py-4 rounded-2xl bg-primary text-white cursor-pointer
        shadow-lg transition-all duration-300 hover:shadow-xl
        ${selected ? 'ring-4 ring-offset-2 ring-primary/50' : ''}
      `}
      style={{
        minWidth: '180px',
        background: 'linear-gradient(135deg, #0a9999 0%, #077a7a 100%)',
      }}
    >
      <div className="text-lg font-bold text-center">
        {data.label}
      </div>

      {data.description && (
        <div className="mt-1 text-xs text-white/80 text-center">
          {data.description}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-white !w-3 !h-3"
      />

      {/* 펼침/접기 버튼 */}
      {data.hasChildren && (
        <button
          onClick={handleExpandClick}
          className={`
            absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-6 rounded-full flex items-center justify-center
            bg-white text-primary border-2 border-primary
            shadow-md hover:shadow-lg transition-all duration-200
            hover:scale-110 font-bold text-sm z-10
          `}
        >
          {data.isExpanded ? '−' : '+'}
        </button>
      )}
    </div>
  )
}

export default memo(RootNode)
