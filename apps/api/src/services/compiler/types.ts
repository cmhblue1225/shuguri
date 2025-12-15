import type { CppVersionId } from '@shuguridan/shared'

// C++ Standard to compiler flag mapping
export const CPP_STANDARD_FLAGS: Record<CppVersionId, string> = {
  cpp98: '-std=c++98',
  cpp03: '-std=c++03',
  cpp11: '-std=c++11',
  cpp14: '-std=c++14',
  cpp17: '-std=c++17',
  cpp20: '-std=c++20',
  cpp23: '-std=c++23',
  cpp26: '-std=c++2c', // c++26 uses c++2c in older compilers
}

// Judge0 Language IDs for C++
export const JUDGE0_LANGUAGE_IDS = {
  cpp: 54,      // C++ (GCC 9.2.0)
  cpp17: 76,    // C++17 (GCC 9.2.0)
  cpp20: 77,    // C++20 (GCC 11.1.0) - may not be available on all instances
} as const

// Compiler Provider Interface
export interface CompilerProvider {
  name: string
  supportedStandards: CppVersionId[]
  compile(request: CompileRequest): Promise<CompileResult>
  execute(request: ExecuteRequest): Promise<ExecuteResult>
}

// Compiler Configuration
export interface CompilerConfig {
  provider: 'wandbox' | 'judge0' | 'godbolt' | 'docker'
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

// Compile Request
export interface CompileRequest {
  code: string
  cppStandard: CppVersionId
  filename?: string
  compilerFlags?: string[]
  timeout?: number // ms
}

// Execute Request (extends Compile)
export interface ExecuteRequest extends CompileRequest {
  stdin?: string
  runTimeout?: number // ms
}

// Compiler Message (warning/error)
export interface CompilerMessage {
  type: 'warning' | 'error'
  line?: number
  column?: number
  message: string
  code?: string // e.g., '-Wunused-variable'
}

// Compile Result
export interface CompileResult {
  status: 'success' | 'error' | 'timeout'
  exitCode: number
  stdout: string
  stderr: string
  compileTimeMs: number
  warnings: CompilerMessage[]
  errors: CompilerMessage[]
}

// Execute Result (extends Compile)
export interface ExecuteResult extends CompileResult {
  runResult?: {
    status: 'success' | 'error' | 'timeout' | 'runtime_error'
    stdout: string
    stderr: string
    exitCode: number
    runTimeMs: number
    memoryUsedKb?: number
  }
}

// API Response Types
export interface CompileResponse {
  success: boolean
  compileResult: CompileResult
  metadata: {
    compiler: string
    standardUsed: string
    timestamp: string
  }
}

export interface ExecuteResponse extends CompileResponse {
  runResult?: ExecuteResult['runResult']
}

// Compiler Error Codes
export enum CompilerErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  COMPILE_TIMEOUT = 'COMPILE_TIMEOUT',
  EXECUTE_TIMEOUT = 'EXECUTE_TIMEOUT',
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  UNSUPPORTED_STANDARD = 'UNSUPPORTED_STANDARD',
  FORBIDDEN_CODE = 'FORBIDDEN_CODE',
}

// Custom Compiler Error
export class CompilerError extends Error {
  constructor(
    message: string,
    public code: CompilerErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CompilerError'
  }
}
