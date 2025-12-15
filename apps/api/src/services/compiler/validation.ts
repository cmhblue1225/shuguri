import { CompilerError, CompilerErrorCode } from './types.js'

// Maximum code length in characters
const MAX_CODE_LENGTH = 100_000 // 100KB

// Forbidden patterns for security
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /#include\s*<\s*fstream\s*>/i,
    reason: 'File stream operations are not allowed for security',
  },
  {
    pattern: /#include\s*<\s*filesystem\s*>/i,
    reason: 'Filesystem operations are not allowed for security',
  },
  {
    pattern: /#include\s*<\s*sys\//i,
    reason: 'System headers are not allowed for security',
  },
  {
    pattern: /#include\s*<\s*unistd\.h\s*>/i,
    reason: 'Unix system calls are not allowed for security',
  },
  {
    pattern: /#include\s*<\s*windows\.h\s*>/i,
    reason: 'Windows system calls are not allowed for security',
  },
  {
    pattern: /\bsystem\s*\(/,
    reason: 'system() calls are not allowed for security',
  },
  {
    pattern: /\bexecl?\s*\(/,
    reason: 'exec() calls are not allowed for security',
  },
  {
    pattern: /\bexeclp\s*\(/,
    reason: 'execlp() calls are not allowed for security',
  },
  {
    pattern: /\bexecv\s*\(/,
    reason: 'execv() calls are not allowed for security',
  },
  {
    pattern: /\bexecvp\s*\(/,
    reason: 'execvp() calls are not allowed for security',
  },
  {
    pattern: /\bfork\s*\(/,
    reason: 'fork() calls are not allowed for security',
  },
  {
    pattern: /\bpopen\s*\(/,
    reason: 'popen() calls are not allowed for security',
  },
  {
    pattern: /__asm\b/,
    reason: 'Inline assembly is not allowed for security',
  },
  {
    pattern: /\basm\s*\(/,
    reason: 'Assembly blocks are not allowed for security',
  },
  {
    pattern: /#pragma\s+comment\s*\(\s*lib/i,
    reason: 'Library pragma directives are not allowed',
  },
  {
    pattern: /\bsocket\s*\(/,
    reason: 'Network socket operations are not allowed',
  },
  {
    pattern: /\bconnect\s*\(/,
    reason: 'Network connect operations are not allowed',
  },
  {
    pattern: /\bbind\s*\(/,
    reason: 'Network bind operations are not allowed',
  },
  {
    pattern: /\blisten\s*\(/,
    reason: 'Network listen operations are not allowed',
  },
]

// Warning patterns (not blocked but flagged)
const WARNING_PATTERNS: Array<{ pattern: RegExp; warning: string }> = [
  {
    pattern: /\bgoto\b/,
    warning: 'Using goto statement - consider using structured control flow',
  },
  {
    pattern: /\bvoid\s*\*\s*\w+\s*=/,
    warning: 'Using void pointer - consider using typed pointers or templates',
  },
  {
    pattern: /\bmalloc\s*\(/,
    warning: 'Using malloc - consider using new or smart pointers in modern C++',
  },
  {
    pattern: /\bfree\s*\(/,
    warning: 'Using free - consider using delete or smart pointers in modern C++',
  },
  {
    pattern: /\bNULL\b/,
    warning: 'Using NULL - consider using nullptr in modern C++',
  },
]

export interface ValidationResult {
  valid: boolean
  error?: string
  errorCode?: CompilerErrorCode
  warnings: string[]
}

/**
 * Validate C++ code for security and basic syntax
 */
export function validateCode(code: string): ValidationResult {
  const warnings: string[] = []

  // Check code length
  if (!code || code.trim().length === 0) {
    return {
      valid: false,
      error: 'Code cannot be empty',
      errorCode: CompilerErrorCode.VALIDATION_FAILED,
      warnings: [],
    }
  }

  if (code.length > MAX_CODE_LENGTH) {
    return {
      valid: false,
      error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
      errorCode: CompilerErrorCode.VALIDATION_FAILED,
      warnings: [],
    }
  }

  // Check for forbidden patterns
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: reason,
        errorCode: CompilerErrorCode.FORBIDDEN_CODE,
        warnings: [],
      }
    }
  }

  // Check for warning patterns
  for (const { pattern, warning } of WARNING_PATTERNS) {
    if (pattern.test(code)) {
      warnings.push(warning)
    }
  }

  return {
    valid: true,
    warnings,
  }
}

/**
 * Sanitize code by removing potentially dangerous comments
 * (keeps the code functional but removes suspicious content)
 */
export function sanitizeCode(code: string): string {
  // Remove shell-style comments that might be injected
  let sanitized = code.replace(/^#!.*$/gm, '// [removed shebang]')

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  return sanitized
}

/**
 * Validate and prepare code for compilation
 * Throws CompilerError if validation fails
 */
export function prepareCode(code: string): { code: string; warnings: string[] } {
  const sanitized = sanitizeCode(code)
  const validation = validateCode(sanitized)

  if (!validation.valid) {
    throw new CompilerError(
      validation.error || 'Validation failed',
      validation.errorCode || CompilerErrorCode.VALIDATION_FAILED
    )
  }

  return {
    code: sanitized,
    warnings: validation.warnings,
  }
}

/**
 * Validate stdin input
 */
export function validateStdin(stdin: string): ValidationResult {
  const MAX_STDIN_LENGTH = 10_000 // 10KB

  if (stdin.length > MAX_STDIN_LENGTH) {
    return {
      valid: false,
      error: `Input exceeds maximum length of ${MAX_STDIN_LENGTH} characters`,
      errorCode: CompilerErrorCode.VALIDATION_FAILED,
      warnings: [],
    }
  }

  return { valid: true, warnings: [] }
}
