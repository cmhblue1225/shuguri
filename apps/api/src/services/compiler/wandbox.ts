import type { CppVersionId } from '@shuguridan/shared'
import type {
  CompilerProvider,
  CompileRequest,
  CompileResult,
  ExecuteRequest,
  ExecuteResult,
  CompilerMessage,
} from './types.js'
import { CompilerError, CompilerErrorCode, CPP_STANDARD_FLAGS } from './types.js'

// Wandbox API types
interface WandboxRequest {
  compiler: string
  code: string
  options: string
  stdin: string
  'compiler-option-raw': string
  'runtime-option-raw': string
}

interface WandboxResponse {
  status: string
  signal?: string
  compiler_output?: string
  compiler_error?: string
  compiler_message?: string
  program_output?: string
  program_error?: string
  program_message?: string
}

// Wandbox compiler mapping for C++ versions
const WANDBOX_COMPILERS: Record<CppVersionId, string> = {
  cpp98: 'gcc-13.2.0',
  cpp03: 'gcc-13.2.0',
  cpp11: 'gcc-13.2.0',
  cpp14: 'gcc-13.2.0',
  cpp17: 'gcc-13.2.0',
  cpp20: 'gcc-13.2.0',
  cpp23: 'gcc-head',
  cpp26: 'gcc-head',
}

// C++ standard flags for Wandbox
const WANDBOX_STD_FLAGS: Record<CppVersionId, string> = {
  cpp98: '-std=c++98',
  cpp03: '-std=c++03',
  cpp11: '-std=c++11',
  cpp14: '-std=c++14',
  cpp17: '-std=c++17',
  cpp20: '-std=c++20',
  cpp23: '-std=c++2b',
  cpp26: '-std=c++2c',
}

const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json'

/**
 * Wandbox API Provider
 * Free online compiler service with no authentication required
 * Supports C++98 through C++26
 */
export class WandboxProvider implements CompilerProvider {
  name = 'wandbox'
  supportedStandards: CppVersionId[] = [
    'cpp98',
    'cpp03',
    'cpp11',
    'cpp14',
    'cpp17',
    'cpp20',
    'cpp23',
    'cpp26',
  ]

  private timeout: number

  constructor(timeout: number = 30000) {
    this.timeout = timeout
  }

  /**
   * Compile C++ code using Wandbox
   */
  async compile(request: CompileRequest): Promise<CompileResult> {
    const startTime = Date.now()

    try {
      const response = await this.callWandboxApi(request.code, request.cppStandard, '')

      return this.parseCompileResult(response, Date.now() - startTime)
    } catch (error) {
      if (error instanceof CompilerError) {
        throw error
      }

      throw new CompilerError(
        `Wandbox API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CompilerErrorCode.API_ERROR,
        error
      )
    }
  }

  /**
   * Compile and execute C++ code using Wandbox
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const startTime = Date.now()

    try {
      const response = await this.callWandboxApi(
        request.code,
        request.cppStandard,
        request.stdin || ''
      )

      const compileResult = this.parseCompileResult(response, Date.now() - startTime)

      // If compilation failed, return without run result
      if (compileResult.status === 'error') {
        return compileResult
      }

      // Parse run result
      return {
        ...compileResult,
        runResult: this.parseRunResult(response),
      }
    } catch (error) {
      if (error instanceof CompilerError) {
        throw error
      }

      throw new CompilerError(
        `Wandbox API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CompilerErrorCode.API_ERROR,
        error
      )
    }
  }

  /**
   * Call Wandbox API
   */
  private async callWandboxApi(
    code: string,
    cppStandard: CppVersionId,
    stdin: string
  ): Promise<WandboxResponse> {
    const compiler = WANDBOX_COMPILERS[cppStandard]
    const stdFlag = WANDBOX_STD_FLAGS[cppStandard]

    const requestBody: WandboxRequest = {
      compiler,
      code,
      options: `${stdFlag},-Wall,-Wextra`,
      stdin,
      'compiler-option-raw': '',
      'runtime-option-raw': '',
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(WANDBOX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new CompilerError(
          `Wandbox API returned status ${response.status}`,
          CompilerErrorCode.API_ERROR,
          { status: response.status }
        )
      }

      return (await response.json()) as WandboxResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CompilerError(
          'Compilation timed out',
          CompilerErrorCode.COMPILE_TIMEOUT
        )
      }

      throw error
    }
  }

  /**
   * Parse Wandbox response into CompileResult
   */
  private parseCompileResult(response: WandboxResponse, compileTimeMs: number): CompileResult {
    const compilerOutput = response.compiler_output || response.compiler_message || ''
    const compilerError = response.compiler_error || ''

    // Parse warnings and errors from compiler output
    const { warnings, errors } = this.parseCompilerOutput(compilerOutput + compilerError)

    // Determine status
    // If there are errors in compiler output or no successful compilation indicator
    const hasCompileError = errors.length > 0 || compilerError.includes('error:')

    return {
      status: hasCompileError ? 'error' : 'success',
      exitCode: hasCompileError ? 1 : 0,
      stdout: compilerOutput,
      stderr: compilerError,
      compileTimeMs,
      warnings,
      errors,
    }
  }

  /**
   * Parse run result from Wandbox response
   */
  private parseRunResult(response: WandboxResponse): ExecuteResult['runResult'] {
    const stdout = response.program_output || ''
    const stderr = response.program_error || ''

    // Wandbox status: "0" = success, non-zero = error, empty/undefined = success
    const rawStatus = response.status || '0'
    const exitCode = parseInt(rawStatus, 10)
    const normalizedExitCode = isNaN(exitCode) ? 0 : exitCode

    // Check for runtime error
    // - Non-zero exit code indicates error
    // - Non-empty signal indicates abnormal termination (e.g., SIGSEGV)
    const hasSignal = response.signal && response.signal.length > 0
    const hasRuntimeError = normalizedExitCode !== 0 || hasSignal

    return {
      status: hasRuntimeError ? 'runtime_error' : 'success',
      stdout,
      stderr,
      exitCode: normalizedExitCode,
      runTimeMs: 0, // Wandbox doesn't provide execution time
    }
  }

  /**
   * Parse compiler output to extract warnings and errors
   */
  private parseCompilerOutput(output: string): {
    warnings: CompilerMessage[]
    errors: CompilerMessage[]
  } {
    const warnings: CompilerMessage[] = []
    const errors: CompilerMessage[] = []

    if (!output) {
      return { warnings, errors }
    }

    // GCC/Clang output format: file:line:column: warning/error: message
    const lineRegex = /^(?:.*?):(\d+):(\d+):\s*(warning|error):\s*(.+)$/gm

    let match
    while ((match = lineRegex.exec(output)) !== null) {
      const [, line, column, type, message] = match

      const compilerMessage: CompilerMessage = {
        type: type as 'warning' | 'error',
        line: parseInt(line, 10),
        column: parseInt(column, 10),
        message: message.trim(),
      }

      if (type === 'warning') {
        warnings.push(compilerMessage)
      } else {
        errors.push(compilerMessage)
      }
    }

    // If no structured errors found but output contains "error", add generic error
    if (errors.length === 0 && output.toLowerCase().includes('error')) {
      errors.push({
        type: 'error',
        message: output.trim().slice(0, 500), // Limit message length
      })
    }

    return { warnings, errors }
  }
}
