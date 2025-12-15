import type { CppVersionId } from '@shuguridan/shared'
import {
  type CompilerProvider,
  type CompileRequest,
  type CompileResult,
  type ExecuteRequest,
  type ExecuteResult,
  type CompilerMessage,
  CPP_STANDARD_FLAGS,
  CompilerError,
  CompilerErrorCode,
} from './types.js'

// Judge0 API response types
interface Judge0Submission {
  source_code: string
  language_id: number
  stdin?: string
  expected_output?: string
  cpu_time_limit?: number
  memory_limit?: number
  compiler_options?: string
}

interface Judge0Result {
  token: string
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  status: {
    id: number
    description: string
  }
  time: string | null
  memory: number | null
}

// Judge0 status IDs
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const

export class Judge0Provider implements CompilerProvider {
  name = 'judge0'
  supportedStandards: CppVersionId[] = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23']

  private apiKey: string
  private baseUrl: string
  private timeout: number

  // Judge0 C++ language ID (GCC 9.2.0 with custom compiler options)
  private readonly LANGUAGE_ID = 54 // C++ (GCC 9.2.0)

  constructor(apiKey: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || 'https://judge0-ce.p.rapidapi.com'
    this.timeout = timeout || 30000
  }

  async compile(request: CompileRequest): Promise<CompileResult> {
    const startTime = Date.now()

    try {
      // Create a compile-only submission (no execution)
      const compilerFlag = CPP_STANDARD_FLAGS[request.cppStandard] || '-std=c++17'
      const additionalFlags = request.compilerFlags?.join(' ') || ''
      const compilerOptions = `${compilerFlag} ${additionalFlags} -fsyntax-only -Wall -Wextra`.trim()

      // For compile-only, we add a simple main if not present
      let code = request.code
      if (!code.includes('int main')) {
        code = `${code}\nint main() { return 0; }`
      }

      const submission: Judge0Submission = {
        source_code: Buffer.from(code).toString('base64'),
        language_id: this.LANGUAGE_ID,
        compiler_options: compilerOptions,
        cpu_time_limit: (request.timeout || this.timeout) / 1000,
        memory_limit: 256000, // 256MB
      }

      const result = await this.submitAndWait(submission)
      const compileTimeMs = Date.now() - startTime

      return this.parseCompileResult(result, compileTimeMs)
    } catch (error) {
      if (error instanceof CompilerError) throw error
      throw new CompilerError(
        `Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CompilerErrorCode.API_ERROR,
        error
      )
    }
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const startTime = Date.now()

    try {
      const compilerFlag = CPP_STANDARD_FLAGS[request.cppStandard] || '-std=c++17'
      const additionalFlags = request.compilerFlags?.join(' ') || ''
      const compilerOptions = `${compilerFlag} ${additionalFlags} -Wall -Wextra`.trim()

      const submission: Judge0Submission = {
        source_code: Buffer.from(request.code).toString('base64'),
        language_id: this.LANGUAGE_ID,
        compiler_options: compilerOptions,
        stdin: request.stdin ? Buffer.from(request.stdin).toString('base64') : undefined,
        cpu_time_limit: (request.runTimeout || 10000) / 1000,
        memory_limit: 256000, // 256MB
      }

      const result = await this.submitAndWait(submission)
      const totalTimeMs = Date.now() - startTime

      const compileResult = this.parseCompileResult(result, totalTimeMs)

      // If compilation succeeded, add run result
      if (result.status.id !== STATUS.COMPILATION_ERROR) {
        const runResult = this.parseRunResult(result)
        return {
          ...compileResult,
          runResult,
        }
      }

      return compileResult
    } catch (error) {
      if (error instanceof CompilerError) throw error
      throw new CompilerError(
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CompilerErrorCode.API_ERROR,
        error
      )
    }
  }

  private async submitAndWait(submission: Judge0Submission): Promise<Judge0Result> {
    // Submit the code
    const submitResponse = await fetch(`${this.baseUrl}/submissions?base64_encoded=true&wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify(submission),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      if (submitResponse.status === 429) {
        throw new CompilerError('Rate limit exceeded', CompilerErrorCode.RATE_LIMITED)
      }
      throw new CompilerError(`Judge0 API error: ${errorText}`, CompilerErrorCode.API_ERROR)
    }

    const submitResult = await submitResponse.json() as { token: string }
    const { token } = submitResult

    // Poll for result
    const maxAttempts = 30
    const pollInterval = 1000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval)

      const resultResponse = await fetch(
        `${this.baseUrl}/submissions/${token}?base64_encoded=true&fields=*`,
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      )

      if (!resultResponse.ok) {
        throw new CompilerError('Failed to get submission result', CompilerErrorCode.API_ERROR)
      }

      const result = await resultResponse.json() as Judge0Result

      // Check if processing is complete
      if (result.status.id !== STATUS.IN_QUEUE && result.status.id !== STATUS.PROCESSING) {
        // Decode base64 fields
        return {
          ...result,
          stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : null,
          stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null,
          compile_output: result.compile_output
            ? Buffer.from(result.compile_output, 'base64').toString('utf-8')
            : null,
        }
      }
    }

    throw new CompilerError('Compilation timed out', CompilerErrorCode.COMPILE_TIMEOUT)
  }

  private parseCompileResult(result: Judge0Result, compileTimeMs: number): CompileResult {
    const isCompileError = result.status.id === STATUS.COMPILATION_ERROR
    const compileOutput = result.compile_output || ''

    // Parse warnings and errors from compile output
    const { warnings, errors } = this.parseCompilerOutput(compileOutput)

    return {
      status: isCompileError ? 'error' : 'success',
      exitCode: isCompileError ? 1 : 0,
      stdout: result.stdout || '',
      stderr: compileOutput,
      compileTimeMs,
      warnings,
      errors,
    }
  }

  private parseRunResult(result: Judge0Result): ExecuteResult['runResult'] {
    const statusId = result.status.id

    let status: 'success' | 'error' | 'timeout' | 'runtime_error' = 'success'

    if (statusId === STATUS.TIME_LIMIT_EXCEEDED) {
      status = 'timeout'
    } else if (
      statusId >= STATUS.RUNTIME_ERROR_SIGSEGV &&
      statusId <= STATUS.RUNTIME_ERROR_OTHER
    ) {
      status = 'runtime_error'
    } else if (statusId !== STATUS.ACCEPTED && statusId !== STATUS.WRONG_ANSWER) {
      status = 'error'
    }

    return {
      status,
      stdout: result.stdout || '',
      stderr: result.stderr || result.message || '',
      exitCode: status === 'success' ? 0 : 1,
      runTimeMs: result.time ? parseFloat(result.time) * 1000 : 0,
      memoryUsedKb: result.memory || undefined,
    }
  }

  private parseCompilerOutput(output: string): { warnings: CompilerMessage[]; errors: CompilerMessage[] } {
    const warnings: CompilerMessage[] = []
    const errors: CompilerMessage[] = []

    // GCC output format: filename:line:column: type: message
    const regex = /(?:[\w./]+):(\d+):(\d+):\s*(warning|error):\s*(.+?)(?=\n|$)/gi

    let match
    while ((match = regex.exec(output)) !== null) {
      const [, lineStr, colStr, type, message] = match
      const line = parseInt(lineStr, 10)
      const column = parseInt(colStr, 10)

      const compilerMessage: CompilerMessage = {
        type: type.toLowerCase() as 'warning' | 'error',
        line: isNaN(line) ? undefined : line,
        column: isNaN(column) ? undefined : column,
        message: message.trim(),
      }

      if (type.toLowerCase() === 'warning') {
        warnings.push(compilerMessage)
      } else {
        errors.push(compilerMessage)
      }
    }

    // If no structured messages found but there's output, add it as a general error
    if (errors.length === 0 && warnings.length === 0 && output.trim()) {
      // Check if it looks like an error
      if (output.toLowerCase().includes('error')) {
        errors.push({
          type: 'error',
          message: output.trim().split('\n')[0],
        })
      }
    }

    return { warnings, errors }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
