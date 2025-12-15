import dagre from '@dagrejs/dagre'
import type { Node, Edge } from 'reactflow'

// API 응답 타입
export interface MindmapNode {
  id: string
  type: 'root' | 'category' | 'item'
  data: {
    label: string
    description?: string
    category?: string
    impact?: string
    itemCount?: number
  }
  position: { x: number; y: number }
}

export interface MindmapEdge {
  id: string
  source: string
  target: string
  type?: string
}

export interface MindmapData {
  sourceVersion: string
  targetVersion: string
  nodes: MindmapNode[]
  edges: MindmapEdge[]
  categoryColors: Record<string, string>
  categoryLabels: Record<string, string>
}

// 카테고리별 색상
export const CATEGORY_COLORS: Record<string, string> = {
  newFeatures: '#22c55e',
  behaviorChanges: '#eab308',
  deprecated: '#f97316',
  removed: '#ef4444',
  libraryChanges: '#3b82f6',
}

// 카테고리별 배경색 (투명도 포함)
export const CATEGORY_BG_COLORS: Record<string, string> = {
  newFeatures: 'rgba(34, 197, 94, 0.1)',
  behaviorChanges: 'rgba(234, 179, 8, 0.1)',
  deprecated: 'rgba(249, 115, 22, 0.1)',
  removed: 'rgba(239, 68, 68, 0.1)',
  libraryChanges: 'rgba(59, 130, 246, 0.1)',
}

/**
 * Dagre 레이아웃을 적용하여 노드 위치 계산
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): Node[] {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  })

  // 노드 추가
  nodes.forEach((node) => {
    const width = node.type === 'root' ? 200 : node.type === 'category' ? 180 : 160
    const height = node.type === 'root' ? 60 : node.type === 'category' ? 50 : 40
    dagreGraph.setNode(node.id, { width, height })
  })

  // 엣지 추가
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // 레이아웃 계산
  dagre.layout(dagreGraph)

  // 노드 위치 업데이트
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    const width = node.type === 'root' ? 200 : node.type === 'category' ? 180 : 160
    const height = node.type === 'root' ? 60 : node.type === 'category' ? 50 : 40

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    }
  })
}

/**
 * API 노드를 React Flow 노드로 변환
 */
export function convertToReactFlowNodes(nodes: MindmapNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    data: node.data,
    position: node.position,
  }))
}

/**
 * API 엣지를 React Flow 엣지로 변환
 */
export function convertToReactFlowEdges(edges: MindmapEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  }))
}

// filterByLevel 함수는 개별 노드 펼침/접기로 대체되어 제거됨
