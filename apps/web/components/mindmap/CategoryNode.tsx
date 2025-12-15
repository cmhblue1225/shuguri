'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { CATEGORY_COLORS } from './mindmapUtils'

interface CategoryNodeData {
  label: string
  category?: string
  itemCount?: number
  hasChildren?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

/**
 * 카테고리 노드 컴포넌트
 * 마인드맵의 중간 레벨 노드
 */
function CategoryNode({ data, selected }: NodeProps<CategoryNodeData>) {
  const category = data.category || 'newFeatures'
  const color = CATEGORY_COLORS[category] || '#94a3b8'

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onToggleExpand) {
      data.onToggleExpand()
    }
  }

  return (
    <div
      className={`
        relative px-5 py-3 rounded-xl border-2 cursor-pointer
        transition-all duration-300 hover:shadow-lg
        ${selected ? 'ring-2 ring-offset-2 ring-primary' : ''}
      `}
      style={{
        borderColor: color,
        backgroundColor: 'white',
        minWidth: '150px',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !w-2 !h-2"
      />

      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-base font-semibold text-slate-700">
          {data.label}
        </span>
      </div>

      {data.itemCount !== undefined && (
        <div className="mt-1 text-xs text-slate-500">
          {data.itemCount}개 항목
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !w-2 !h-2"
      />

      {/* 펼침/접기 버튼 */}
      {data.hasChildren && (
        <button
          onClick={handleExpandClick}
          className={`
            absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-6 rounded-full flex items-center justify-center
            bg-white border-2 shadow-md hover:shadow-lg
            transition-all duration-200 hover:scale-110 font-bold text-sm z-10
          `}
          style={{
            borderColor: color,
            color: color,
          }}
        >
          {data.isExpanded ? '−' : '+'}
        </button>
      )}
    </div>
  )
}

export default memo(CategoryNode)
