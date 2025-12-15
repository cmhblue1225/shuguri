'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { CATEGORY_COLORS, CATEGORY_BG_COLORS } from './mindmapUtils'

interface DiffNodeData {
  label: string
  description?: string
  category?: string
  impact?: string
}

/**
 * 개별 기능 노드 컴포넌트
 * 마인드맵의 리프 노드로, 클릭 시 챗봇에 질문 전송
 */
function DiffNode({ data, selected }: NodeProps<DiffNodeData>) {
  const category = data.category || 'newFeatures'
  const borderColor = CATEGORY_COLORS[category] || '#94a3b8'
  const bgColor = CATEGORY_BG_COLORS[category] || 'rgba(148, 163, 184, 0.1)'

  return (
    <div
      className={`
        px-4 py-2 rounded-lg border-2 cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${selected ? 'ring-2 ring-offset-2 ring-primary' : ''}
      `}
      style={{
        borderColor,
        backgroundColor: bgColor,
        minWidth: '140px',
        maxWidth: '200px',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !w-2 !h-2"
      />

      <div className="text-sm font-medium text-slate-800 truncate">
        {data.label}
      </div>

      {data.impact && (
        <div className="mt-1">
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: borderColor,
              color: 'white',
            }}
          >
            {data.impact}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !w-2 !h-2"
      />
    </div>
  )
}

export default memo(DiffNode)
