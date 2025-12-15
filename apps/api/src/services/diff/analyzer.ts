import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { CppVersionId, DiffCategory, DiffItem } from '@shuguridan/shared'
import type { DiffAnalysisRequest, DiffAnalysisResult, StoredDiffData } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cache for loaded diff data
const diffDataCache = new Map<string, StoredDiffData>()

function getDiffKey(source: CppVersionId, target: CppVersionId): string {
  return `${source}-${target}`
}

async function loadDiffData(source: CppVersionId, target: CppVersionId): Promise<StoredDiffData | null> {
  const key = getDiffKey(source, target)

  if (diffDataCache.has(key)) {
    return diffDataCache.get(key)!
  }

  const filePath = join(__dirname, '..', '..', '..', '..', '..', 'data', 'diffs', `${key}.json`)

  try {
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as StoredDiffData
    diffDataCache.set(key, data)
    return data
  } catch {
    return null
  }
}

// Get all supported version pairs
function getVersionPairs(): Array<[CppVersionId, CppVersionId]> {
  return [
    ['cpp11', 'cpp14'],
    ['cpp14', 'cpp17'],
    // Future: ['cpp17', 'cpp20'], ['cpp20', 'cpp23']
  ]
}

// Build a path of upgrades between versions
function getUpgradePath(source: CppVersionId, target: CppVersionId): Array<[CppVersionId, CppVersionId]> {
  const versionOrder: CppVersionId[] = ['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']

  const sourceIndex = versionOrder.indexOf(source)
  const targetIndex = versionOrder.indexOf(target)

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex >= targetIndex) {
    return []
  }

  const pairs = getVersionPairs()
  const path: Array<[CppVersionId, CppVersionId]> = []

  let current = source
  while (current !== target) {
    const nextPair = pairs.find(([s]) => s === current)
    if (!nextPair) break

    path.push(nextPair)
    current = nextPair[1]

    if (current === target) break
  }

  return path
}

function mergeDiffCategories(categories: DiffCategory[]): DiffCategory {
  const merged: DiffCategory = {
    newFeatures: [],
    behaviorChanges: [],
    deprecated: [],
    removed: [],
    libraryChanges: [],
  }

  for (const cat of categories) {
    merged.newFeatures.push(...cat.newFeatures)
    merged.behaviorChanges.push(...cat.behaviorChanges)
    merged.deprecated.push(...cat.deprecated)
    merged.removed.push(...(cat.removed || []))
    merged.libraryChanges.push(...cat.libraryChanges)
  }

  return merged
}

function filterCategories(
  diff: DiffCategory,
  filter?: Array<keyof DiffCategory>
): DiffCategory {
  if (!filter || filter.length === 0) {
    return diff
  }

  return {
    newFeatures: filter.includes('newFeatures') ? diff.newFeatures : [],
    behaviorChanges: filter.includes('behaviorChanges') ? diff.behaviorChanges : [],
    deprecated: filter.includes('deprecated') ? diff.deprecated : [],
    removed: filter.includes('removed') ? diff.removed : [],
    libraryChanges: filter.includes('libraryChanges') ? diff.libraryChanges : [],
  }
}

function generateSummary(source: CppVersionId, target: CppVersionId, diff: DiffCategory): string {
  const total =
    diff.newFeatures.length +
    diff.behaviorChanges.length +
    diff.deprecated.length +
    (diff.removed?.length || 0) +
    diff.libraryChanges.length

  const parts: string[] = []

  if (diff.newFeatures.length > 0) {
    parts.push(`${diff.newFeatures.length} new features`)
  }
  if (diff.behaviorChanges.length > 0) {
    parts.push(`${diff.behaviorChanges.length} behavior changes`)
  }
  if (diff.deprecated.length > 0) {
    parts.push(`${diff.deprecated.length} deprecated items`)
  }
  if (diff.removed?.length > 0) {
    parts.push(`${diff.removed.length} removed items`)
  }
  if (diff.libraryChanges.length > 0) {
    parts.push(`${diff.libraryChanges.length} library changes`)
  }

  const sourceLabel = source.replace('cpp', 'C++')
  const targetLabel = target.replace('cpp', 'C++')

  return `Upgrading from ${sourceLabel} to ${targetLabel}: ${total} total changes including ${parts.join(', ')}.`
}

export async function analyzeDiff(request: DiffAnalysisRequest): Promise<DiffAnalysisResult> {
  const { sourceVersion, targetVersion, categories: filterCats } = request

  // Get the upgrade path
  const path = getUpgradePath(sourceVersion, targetVersion)

  if (path.length === 0) {
    throw new Error(`No upgrade path found from ${sourceVersion} to ${targetVersion}`)
  }

  // Load and merge all diff data along the path
  const allCategories: DiffCategory[] = []

  for (const [src, tgt] of path) {
    const data = await loadDiffData(src, tgt)
    if (data) {
      allCategories.push({
        newFeatures: data.newFeatures || [],
        behaviorChanges: data.behaviorChanges || [],
        deprecated: data.deprecated || [],
        removed: data.removed || [],
        libraryChanges: data.libraryChanges || [],
      })
    }
  }

  // Merge all categories
  let mergedDiff = mergeDiffCategories(allCategories)

  // Filter if requested
  mergedDiff = filterCategories(mergedDiff, filterCats)

  const totalChanges =
    mergedDiff.newFeatures.length +
    mergedDiff.behaviorChanges.length +
    mergedDiff.deprecated.length +
    (mergedDiff.removed?.length || 0) +
    mergedDiff.libraryChanges.length

  return {
    source: sourceVersion,
    target: targetVersion,
    diff: mergedDiff,
    summary: generateSummary(sourceVersion, targetVersion, mergedDiff),
    totalChanges,
  }
}

export function getAvailableDiffPairs(): Array<{ source: CppVersionId; target: CppVersionId }> {
  return getVersionPairs().map(([source, target]) => ({ source, target }))
}
