import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { CppVersionId } from '@shuguridan/shared'
import { getTestGenerator } from '../services/test-generator/index.js'

// CppVersionId 값 배열 (zod 스키마용)
const CPP_VERSION_IDS = ['cpp98', 'cpp03', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26'] as const

export const testRouter = new Hono()

// 요청 스키마
const generateTestsSchema = z.object({
  originalCode: z.string().min(1, 'Original code is required'),
  modernizedCode: z.string().min(1, 'Modernized code is required'),
  sourceVersion: z.enum(CPP_VERSION_IDS),
  targetVersion: z.enum(CPP_VERSION_IDS),
  testType: z.enum(['unit', 'io', 'both']).default('io'),
  outputLanguage: z.enum(['ko', 'en']).default('ko'),
  maxTestCases: z.number().min(1).max(10).default(5),
})

const runTestsSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  tests: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      type: z.enum(['unit', 'io']),
      input: z.string().optional(),
      expectedOutput: z.string().optional(),
      assertions: z.array(z.string()),
    })
  ),
  cppStandard: z.enum(CPP_VERSION_IDS),
  timeout: z.number().min(1000).max(60000).default(10000),
})

const compareTestsSchema = z.object({
  originalCode: z.string().min(1, 'Original code is required'),
  modernizedCode: z.string().min(1, 'Modernized code is required'),
  tests: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      type: z.enum(['unit', 'io']),
      input: z.string().optional(),
      expectedOutput: z.string().optional(),
      assertions: z.array(z.string()),
    })
  ),
  sourceVersion: z.enum(CPP_VERSION_IDS),
  targetVersion: z.enum(CPP_VERSION_IDS),
  timeout: z.number().min(1000).max(60000).default(10000),
})

/**
 * POST /api/test/generate
 * LLM을 사용하여 테스트 케이스 생성
 */
testRouter.post('/generate', zValidator('json', generateTestsSchema), async (c) => {
  const generator = getTestGenerator()

  if (!generator) {
    return c.json(
      { error: 'Test generator not available. Check ANTHROPIC_API_KEY.' },
      503
    )
  }

  const body = c.req.valid('json')

  try {
    const result = await generator.generateTests({
      originalCode: body.originalCode,
      modernizedCode: body.modernizedCode,
      sourceVersion: body.sourceVersion,
      targetVersion: body.targetVersion,
      testType: body.testType,
      outputLanguage: body.outputLanguage,
      maxTestCases: body.maxTestCases,
    })

    if (!result.success) {
      return c.json(
        {
          error: result.error || 'Failed to generate tests',
          generationTimeMs: result.generationTimeMs,
        },
        500
      )
    }

    return c.json({
      success: true,
      tests: result.tests,
      generationTimeMs: result.generationTimeMs,
    })
  } catch (error) {
    console.error('Test generation error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

/**
 * POST /api/test/run
 * 단일 코드에 대해 테스트 실행
 */
testRouter.post('/run', zValidator('json', runTestsSchema), async (c) => {
  const generator = getTestGenerator()

  if (!generator) {
    return c.json(
      { error: 'Test runner not available. Check ANTHROPIC_API_KEY and JUDGE0_API_KEY.' },
      503
    )
  }

  const body = c.req.valid('json')

  try {
    const result = await generator.runTests({
      code: body.code,
      tests: body.tests,
      cppStandard: body.cppStandard,
      timeout: body.timeout,
    })

    return c.json({
      success: result.success,
      results: result.results,
      summary: result.summary,
      totalTimeMs: result.totalTimeMs,
    })
  } catch (error) {
    console.error('Test run error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

/**
 * POST /api/test/compare
 * 원본과 변환 코드 비교 테스트
 */
testRouter.post('/compare', zValidator('json', compareTestsSchema), async (c) => {
  const generator = getTestGenerator()

  if (!generator) {
    return c.json(
      { error: 'Test runner not available. Check ANTHROPIC_API_KEY and JUDGE0_API_KEY.' },
      503
    )
  }

  const body = c.req.valid('json')

  try {
    const result = await generator.compareTests({
      originalCode: body.originalCode,
      modernizedCode: body.modernizedCode,
      tests: body.tests,
      sourceVersion: body.sourceVersion,
      targetVersion: body.targetVersion,
      timeout: body.timeout,
    })

    return c.json({
      success: result.success,
      originalResults: result.originalResults,
      modernizedResults: result.modernizedResults,
      comparison: result.comparison,
      totalTimeMs: result.totalTimeMs,
    })
  } catch (error) {
    console.error('Test compare error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

/**
 * GET /api/test/status
 * 테스트 서비스 상태 확인
 */
testRouter.get('/status', (c) => {
  const generator = getTestGenerator()
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const compilerProvider = process.env.COMPILER_PROVIDER || 'wandbox'

  return c.json({
    available: !!generator,
    services: {
      testGenerator: hasAnthropicKey,
      compiler: true, // Wandbox is always available (no API key required)
      compilerProvider,
    },
  })
})
