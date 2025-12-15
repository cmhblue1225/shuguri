import { Hono } from 'hono'
import { z } from 'zod'
import { analyzeDiff, getAvailableDiffPairs } from '../services/diff/index.js'
import type { CppVersionId } from '@shuguridan/shared'

const diffRouter = new Hono()

// Validation schema
const diffRequestSchema = z.object({
  sourceVersion: z.enum(['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']),
  targetVersion: z.enum(['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']),
  categories: z
    .array(z.enum(['newFeatures', 'behaviorChanges', 'deprecated', 'libraryChanges']))
    .optional(),
})

// GET /api/diff/pairs - Get available diff pairs
diffRouter.get('/pairs', (c) => {
  const pairs = getAvailableDiffPairs()
  return c.json({
    success: true,
    data: pairs,
  })
})

// POST /api/diff - Analyze diff between versions
diffRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = diffRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { sourceVersion, targetVersion, categories } = parsed.data

    // Validate version order
    const versionOrder = ['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']
    const sourceIndex = versionOrder.indexOf(sourceVersion)
    const targetIndex = versionOrder.indexOf(targetVersion)

    if (sourceIndex >= targetIndex) {
      return c.json(
        { error: 'Target version must be newer than source version' },
        400
      )
    }

    const startTime = Date.now()

    const result = await analyzeDiff({
      sourceVersion: sourceVersion as CppVersionId,
      targetVersion: targetVersion as CppVersionId,
      categories: categories as Array<'newFeatures' | 'behaviorChanges' | 'deprecated' | 'libraryChanges'>,
    })

    const duration = Date.now() - startTime

    return c.json({
      success: true,
      data: result,
      meta: {
        durationMs: duration,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// GET /api/diff/:source/:target - Quick diff lookup
diffRouter.get('/:source/:target', async (c) => {
  try {
    const source = c.req.param('source') as CppVersionId
    const target = c.req.param('target') as CppVersionId

    const validVersions = ['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']

    if (!validVersions.includes(source) || !validVersions.includes(target)) {
      return c.json({ error: 'Invalid version' }, 400)
    }

    const result = await analyzeDiff({
      sourceVersion: source,
      targetVersion: target,
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

export { diffRouter }
