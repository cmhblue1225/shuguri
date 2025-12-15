'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'

import RootNode from './RootNode'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
import CategoryNode from './CategoryNode'
import DiffNode from './DiffNode'
import {
  applyDagreLayout,
  type MindmapData,
} from './mindmapUtils'

// 커스텀 노드 타입 등록
const nodeTypes = {
  root: RootNode,
  category: CategoryNode,
  item: DiffNode,
}

interface MindmapViewerProps {
  sourceVersion: string
  targetVersion: string
  onNodeClick?: (nodeData: { label: string; description?: string; category?: string }) => void
}

// 부모-자식 관계 맵 생성
function buildParentChildMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  edges.forEach((edge) => {
    const children = map.get(edge.source) || []
    children.push(edge.target)
    map.set(edge.source, children)
  })
  return map
}

// 자식 노드 ID 가져오기
function getChildNodeIds(parentId: string, parentChildMap: Map<string, string[]>): string[] {
  return parentChildMap.get(parentId) || []
}

// 모든 자손 노드 ID 가져오기 (재귀)
function getAllDescendantIds(nodeId: string, parentChildMap: Map<string, string[]>): string[] {
  const children = parentChildMap.get(nodeId) || []
  let descendants = [...children]
  children.forEach((childId) => {
    descendants = descendants.concat(getAllDescendantIds(childId, parentChildMap))
  })
  return descendants
}

/**
 * 마인드맵 뷰어 내부 컴포넌트 (ReactFlowProvider 내부에서 사용)
 */
function MindmapViewerInner({
  sourceVersion,
  targetVersion,
  onNodeClick,
}: MindmapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [allEdges, setAllEdges] = useState<Edge[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { fitView, setCenter } = useReactFlow()
  const lastExpandedRef = useRef<string | null>(null)

  // 부모-자식 관계 맵
  const parentChildMap = useMemo(() => buildParentChildMap(allEdges), [allEdges])

  // 노드가 자식을 가지는지 확인
  const hasChildren = useCallback(
    (nodeId: string) => {
      const children = parentChildMap.get(nodeId)
      return children && children.length > 0
    },
    [parentChildMap]
  )

  // 노드 펼침/접기 토글
  const toggleNodeExpand = useCallback(
    (nodeId: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev)
        if (next.has(nodeId)) {
          // 접기: 해당 노드의 모든 자손 제거
          const descendants = getAllDescendantIds(nodeId, parentChildMap)
          descendants.forEach((id) => next.delete(id))
          next.delete(nodeId)
        } else {
          // 펼치기: 해당 노드만 추가
          next.add(nodeId)
          lastExpandedRef.current = nodeId
        }
        return next
      })
    },
    [parentChildMap]
  )

  // 마인드맵 데이터 로드
  useEffect(() => {
    async function fetchMindmapData() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/api/mindmap/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceVersion, targetVersion }),
        })

        if (!response.ok) {
          throw new Error('마인드맵 데이터를 불러오는데 실패했습니다.')
        }

        const result = await response.json()

        if (!result.success || !result.data) {
          throw new Error(result.error || '마인드맵 데이터가 없습니다.')
        }

        const data: MindmapData = result.data

        // API 응답을 React Flow 형식으로 변환
        const flowNodes: Node[] = data.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          data: node.data,
          position: node.position,
        }))

        const flowEdges: Edge[] = data.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }))

        setAllNodes(flowNodes)
        setAllEdges(flowEdges)
        // 초기 상태: root만 펼침
        setExpandedNodes(new Set(['root']))
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMindmapData()
  }, [sourceVersion, targetVersion])

  // 펼침 상태 변경 시 노드/엣지 필터링 및 레이아웃
  useEffect(() => {
    if (allNodes.length === 0) return

    // 표시할 노드 결정: root + 펼쳐진 노드의 직접 자식
    const visibleNodeIds = new Set<string>()

    // root는 항상 표시
    visibleNodeIds.add('root')

    // 펼쳐진 노드의 자식들 추가
    expandedNodes.forEach((expandedId) => {
      const children = getChildNodeIds(expandedId, parentChildMap)
      children.forEach((childId) => visibleNodeIds.add(childId))
    })

    // 필터링된 노드 생성 (hasChildren, isExpanded 정보 추가)
    const filteredNodes = allNodes
      .filter((node) => visibleNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        data: {
          ...node.data,
          hasChildren: hasChildren(node.id),
          isExpanded: expandedNodes.has(node.id),
          onToggleExpand: () => toggleNodeExpand(node.id),
        },
      }))

    // 필터링된 엣지
    const filteredEdges = allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )

    // Dagre 레이아웃 적용 (LR: 좌에서 우로)
    const layoutedNodes = applyDagreLayout(filteredNodes, filteredEdges, 'LR')

    setNodes(layoutedNodes)
    setEdges(filteredEdges)
  }, [allNodes, allEdges, expandedNodes, parentChildMap, hasChildren, toggleNodeExpand, setNodes, setEdges])

  // 펼침 후 뷰포트 조정 (애니메이션)
  useEffect(() => {
    if (lastExpandedRef.current && nodes.length > 0) {
      const expandedNodeId = lastExpandedRef.current
      const expandedNode = nodes.find((n) => n.id === expandedNodeId)

      if (expandedNode) {
        // 약간의 딜레이 후 뷰포트 조정
        setTimeout(() => {
          setCenter(
            expandedNode.position.x + 150,
            expandedNode.position.y,
            { zoom: 1, duration: 400 }
          )
        }, 100)
      }
      lastExpandedRef.current = null
    }
  }, [nodes, setCenter])

  // 노드 클릭 핸들러
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      // 루트 노드는 클릭 이벤트 무시
      if (node.type === 'root') return

      if (onNodeClick && node.data) {
        onNodeClick({
          label: node.data.label,
          description: node.data.description,
          category: node.data.category,
        })
      }
    },
    [onNodeClick]
  )

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600">마인드맵 로딩 중...</span>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center p-6">
          <div className="text-red-500 text-lg mb-2">오류 발생</div>
          <div className="text-slate-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* React Flow 캔버스 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 400 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'root') return '#0a9999'
            if (node.type === 'category') return '#64748b'
            return '#94a3b8'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
          style={{ marginBottom: '10px' }}
        />
      </ReactFlow>

      {/* 안내 메시지 */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-slate-200">
        <span className="text-xs text-slate-600">
          노드의 <span className="font-semibold text-primary">+/-</span> 버튼을 클릭하여 펼치기/접기
        </span>
      </div>
    </div>
  )
}

/**
 * 마인드맵 뷰어 컴포넌트
 * React Flow 기반의 인터랙티브 마인드맵
 */
export default function MindmapViewer(props: MindmapViewerProps) {
  return (
    <ReactFlowProvider>
      <MindmapViewerInner {...props} />
    </ReactFlowProvider>
  )
}
