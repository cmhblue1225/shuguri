import { Hono } from 'hono'
import { z } from 'zod'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const mindmapRouter = new Hono()

// React Flow 노드/엣지 타입
interface MindmapNode {
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

interface MindmapEdge {
  id: string
  source: string
  target: string
  type?: string
}

interface DiffItem {
  id: string
  title: string
  description: string
  category: string
  impact?: string
}

interface DiffData {
  sourceVersion: string
  targetVersion: string
  newFeatures?: DiffItem[]
  behaviorChanges?: DiffItem[]
  deprecated?: DiffItem[]
  removed?: DiffItem[]
  libraryChanges?: DiffItem[]
}

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  newFeatures: '#22c55e', // green
  behaviorChanges: '#eab308', // yellow
  deprecated: '#f97316', // orange
  removed: '#ef4444', // red
  libraryChanges: '#3b82f6', // blue
}

// 카테고리 한글명
const CATEGORY_LABELS: Record<string, string> = {
  newFeatures: '신규 기능',
  behaviorChanges: '동작 변경',
  deprecated: '지원 중단 예정',
  removed: '제거됨',
  libraryChanges: '라이브러리 변경',
}

// 마인드맵 요청 스키마
const mindmapRequestSchema = z.object({
  sourceVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  targetVersion: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  expandLevel: z.number().min(1).max(3).optional().default(2),
})

/**
 * Diff 데이터를 React Flow 노드/엣지로 변환
 */
function convertDiffToMindmap(
  diff: DiffData,
  expandLevel: number
): { nodes: MindmapNode[]; edges: MindmapEdge[] } {
  const nodes: MindmapNode[] = []
  const edges: MindmapEdge[] = []

  // 루트 노드
  const rootId = 'root'
  nodes.push({
    id: rootId,
    type: 'root',
    data: {
      label: `${diff.sourceVersion.toUpperCase()} → ${diff.targetVersion.toUpperCase()}`,
      description: 'C++ 버전 변경사항',
    },
    position: { x: 0, y: 0 },
  })

  // 카테고리별 처리
  const categories: [string, DiffItem[] | undefined][] = [
    ['newFeatures', diff.newFeatures],
    ['behaviorChanges', diff.behaviorChanges],
    ['deprecated', diff.deprecated],
    ['removed', diff.removed],
    ['libraryChanges', diff.libraryChanges],
  ]

  let categoryIndex = 0
  for (const [categoryKey, items] of categories) {
    if (!items || items.length === 0) continue

    const categoryId = `category-${categoryKey}`

    // 카테고리 노드 (레벨 1)
    nodes.push({
      id: categoryId,
      type: 'category',
      data: {
        label: CATEGORY_LABELS[categoryKey] || categoryKey,
        category: categoryKey,
        itemCount: items.length,
      },
      position: { x: 0, y: 0 }, // 나중에 레이아웃에서 설정
    })

    edges.push({
      id: `edge-root-${categoryKey}`,
      source: rootId,
      target: categoryId,
    })

    // 아이템 노드 (레벨 2) - expandLevel >= 2일 때만
    if (expandLevel >= 2) {
      items.forEach((item, index) => {
        const itemId = `item-${categoryKey}-${index}`

        nodes.push({
          id: itemId,
          type: 'item',
          data: {
            label: item.title,
            description: item.description,
            category: categoryKey,
            impact: item.impact,
          },
          position: { x: 0, y: 0 },
        })

        edges.push({
          id: `edge-${categoryKey}-${index}`,
          source: categoryId,
          target: itemId,
        })
      })
    }

    categoryIndex++
  }

  return { nodes, edges }
}

/**
 * POST /api/mindmap/data - 마인드맵 데이터 생성
 */
mindmapRouter.post('/data', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = mindmapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { sourceVersion, targetVersion, expandLevel } = parsed.data

    // Diff 파일 로드
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const dataDir = join(__dirname, '..', '..', '..', '..', 'data', 'diffs')
    const diffFileName = `${sourceVersion}-${targetVersion}.json`
    const diffFilePath = join(dataDir, diffFileName)

    let diffData: DiffData

    try {
      const fileContent = await readFile(diffFilePath, 'utf-8')
      diffData = JSON.parse(fileContent)
    } catch (err) {
      // 역방향이나 다른 조합 시도
      const reverseDiffFileName = `${targetVersion}-${sourceVersion}.json`
      try {
        const reverseContent = await readFile(
          join(dataDir, reverseDiffFileName),
          'utf-8'
        )
        diffData = JSON.parse(reverseContent)
      } catch {
        // diff 파일이 없는 경우, 빈 데이터로 안내 메시지 표시
        diffData = {
          sourceVersion,
          targetVersion,
          newFeatures: [{
            id: 'no-data',
            title: '데이터 준비 중',
            description: `${sourceVersion.replace('cpp', 'C++')} → ${targetVersion.replace('cpp', 'C++')} 버전 비교 데이터가 아직 준비되지 않았습니다. 현재 cpp11→cpp14, cpp14→cpp17 데이터만 제공됩니다.`,
            category: 'newFeatures',
          }],
        }
      }
    }

    // 마인드맵 데이터 생성
    const { nodes, edges } = convertDiffToMindmap(diffData, expandLevel)

    return c.json({
      success: true,
      data: {
        sourceVersion,
        targetVersion,
        nodes,
        edges,
        categoryColors: CATEGORY_COLORS,
        categoryLabels: CATEGORY_LABELS,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

/**
 * GET /api/mindmap/pairs - 사용 가능한 버전 쌍 목록
 */
mindmapRouter.get('/pairs', async (c) => {
  // 사용 가능한 모든 버전
  const versions = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']

  // 현재 사용 가능한 diff 파일 기반 쌍
  const availablePairs = [
    { source: 'cpp11', target: 'cpp14', available: true },
    { source: 'cpp14', target: 'cpp17', available: true },
  ]

  return c.json({
    success: true,
    data: {
      versions,
      pairs: availablePairs,
    },
  })
})

export { mindmapRouter }
