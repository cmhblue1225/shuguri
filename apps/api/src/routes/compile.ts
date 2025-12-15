import { Hono } from 'hono'
import { z } from 'zod'
import {
  getDefaultCompilerProvider,
  prepareCode,
  validateStdin,
  CompilerError,
  CompilerErrorCode,
  CPP_STANDARD_FLAGS,
} from '../services/compiler/index.js'

const compileRouter = new Hono()

// Request schemas
const compileRequestSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  cppStandard: z.enum(['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']),
  filename: z.string().optional(),
  compilerFlags: z.array(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).optional().default(30000),
})

const executeRequestSchema = compileRequestSchema.extend({
  stdin: z.string().optional().default(''),
  runTimeout: z.number().min(1000).max(30000).optional().default(10000),
})

// Rate limiting state (simple in-memory for now)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10 // requests per minute
const RATE_WINDOW = 60000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || record.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

/**
 * POST /api/compile - Compile C++ code (syntax check only)
 */
compileRouter.post('/', async (c) => {
  // Rate limiting
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return c.json(
      { error: 'Rate limit exceeded. Please try again later.', code: CompilerErrorCode.RATE_LIMITED },
      429
    )
  }

  try {
    const body = await c.req.json()
    const parsed = compileRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { code, cppStandard, filename, compilerFlags, timeout } = parsed.data

    // Get compiler provider
    const compiler = getDefaultCompilerProvider()
    if (!compiler) {
      return c.json(
        { error: 'Compiler service not configured. Please set JUDGE0_API_KEY.' },
        503
      )
    }

    // Validate and prepare code
    const { code: preparedCode, warnings: validationWarnings } = prepareCode(code)

    // Compile
    const result = await compiler.compile({
      code: preparedCode,
      cppStandard,
      filename,
      compilerFlags,
      timeout,
    })

    // Add validation warnings to result
    const allWarnings = [
      ...validationWarnings.map(w => ({ type: 'warning' as const, message: w })),
      ...result.warnings,
    ]

    return c.json({
      success: result.status === 'success',
      compileResult: {
        ...result,
        warnings: allWarnings,
      },
      metadata: {
        compiler: 'g++ (GCC)',
        standardUsed: CPP_STANDARD_FLAGS[cppStandard] || '-std=c++17',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof CompilerError) {
      const statusCode = error.code === CompilerErrorCode.RATE_LIMITED ? 429 :
                        error.code === CompilerErrorCode.FORBIDDEN_CODE ? 400 :
                        error.code === CompilerErrorCode.VALIDATION_FAILED ? 400 : 500

      return c.json(
        { error: error.message, code: error.code, details: error.details },
        statusCode
      )
    }

    console.error('Compile error:', error)
    return c.json(
      { error: 'Internal compiler error', code: CompilerErrorCode.API_ERROR },
      500
    )
  }
})

/**
 * POST /api/compile/execute - Compile and execute C++ code
 */
compileRouter.post('/execute', async (c) => {
  // Rate limiting
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return c.json(
      { error: 'Rate limit exceeded. Please try again later.', code: CompilerErrorCode.RATE_LIMITED },
      429
    )
  }

  try {
    const body = await c.req.json()
    const parsed = executeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.errors },
        400
      )
    }

    const { code, cppStandard, filename, compilerFlags, timeout, stdin, runTimeout } = parsed.data

    // Get compiler provider
    const compiler = getDefaultCompilerProvider()
    if (!compiler) {
      return c.json(
        { error: 'Compiler service not configured. Please set JUDGE0_API_KEY.' },
        503
      )
    }

    // Validate and prepare code
    const { code: preparedCode, warnings: validationWarnings } = prepareCode(code)

    // Validate stdin
    if (stdin) {
      const stdinValidation = validateStdin(stdin)
      if (!stdinValidation.valid) {
        return c.json(
          { error: stdinValidation.error, code: CompilerErrorCode.VALIDATION_FAILED },
          400
        )
      }
    }

    // Execute
    const result = await compiler.execute({
      code: preparedCode,
      cppStandard,
      filename,
      compilerFlags,
      timeout,
      stdin,
      runTimeout,
    })

    // Add validation warnings to result
    const allWarnings = [
      ...validationWarnings.map(w => ({ type: 'warning' as const, message: w })),
      ...result.warnings,
    ]

    return c.json({
      success: result.status === 'success' && (!result.runResult || result.runResult.status === 'success'),
      compileResult: {
        ...result,
        warnings: allWarnings,
      },
      runResult: result.runResult,
      metadata: {
        compiler: 'g++ (GCC)',
        standardUsed: CPP_STANDARD_FLAGS[cppStandard] || '-std=c++17',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof CompilerError) {
      const statusCode = error.code === CompilerErrorCode.RATE_LIMITED ? 429 :
                        error.code === CompilerErrorCode.FORBIDDEN_CODE ? 400 :
                        error.code === CompilerErrorCode.VALIDATION_FAILED ? 400 : 500

      return c.json(
        { error: error.message, code: error.code, details: error.details },
        statusCode
      )
    }

    console.error('Execute error:', error)
    return c.json(
      { error: 'Internal compiler error', code: CompilerErrorCode.API_ERROR },
      500
    )
  }
})

/**
 * GET /api/compile/status - Check if compiler service is available
 */
compileRouter.get('/status', async (c) => {
  const compiler = getDefaultCompilerProvider()

  return c.json({
    available: compiler !== null,
    provider: compiler?.name || null,
    supportedStandards: compiler?.supportedStandards || [],
  })
})

export { compileRouter }
