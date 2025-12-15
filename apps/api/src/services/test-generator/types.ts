import type { CppVersionId } from '@shuguridan/shared'

/**
 * 테스트 생성 요청
 */
export interface TestGenerateRequest {
  originalCode: string
  modernizedCode: string
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  testType: 'unit' | 'io' | 'both'
  outputLanguage: 'ko' | 'en'
  maxTestCases?: number // default: 5
}

/**
 * 생성된 테스트 케이스
 */
export interface GeneratedTest {
  id: string
  name: string
  description: string
  type: 'unit' | 'io'
  input?: string // stdin for I/O tests
  expectedOutput?: string // expected stdout
  assertions: string[] // 사람이 읽을 수 있는 검증 항목
}

/**
 * 테스트 생성 응답
 */
export interface TestGenerateResponse {
  success: boolean
  tests: GeneratedTest[]
  generationTimeMs: number
  error?: string
}

/**
 * 테스트 실행 요청
 */
export interface TestRunRequest {
  code: string
  tests: GeneratedTest[]
  cppStandard: CppVersionId
  timeout?: number // ms, default: 10000
}

/**
 * 개별 테스트 결과
 */
export interface TestResult {
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'error' | 'timeout'
  actualOutput?: string
  expectedOutput?: string
  errorMessage?: string
  runTimeMs: number
}

/**
 * 테스트 실행 응답
 */
export interface TestRunResponse {
  success: boolean
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    errors: number
  }
  totalTimeMs: number
}

/**
 * 테스트 비교 요청 (원본 vs 변환 코드)
 */
export interface TestCompareRequest {
  originalCode: string
  modernizedCode: string
  tests: GeneratedTest[]
  sourceVersion: CppVersionId
  targetVersion: CppVersionId
  timeout?: number
}

/**
 * 테스트 비교 결과
 */
export interface TestCompareResponse {
  success: boolean
  originalResults: TestResult[]
  modernizedResults: TestResult[]
  comparison: {
    matching: number // 동일한 출력
    different: number // 다른 출력
    errors: number // 에러 발생
  }
  totalTimeMs: number
}

/**
 * LLM 테스트 생성 원시 출력
 */
export interface LLMTestOutput {
  tests: Array<{
    name: string
    description: string
    type: 'unit' | 'io'
    input?: string
    expectedOutput?: string
    assertions: string[]
  }>
}

/**
 * 테스트 생성 서비스 인터페이스
 */
export interface TestGeneratorService {
  /**
   * 테스트 케이스 생성
   */
  generateTests(request: TestGenerateRequest): Promise<TestGenerateResponse>

  /**
   * 단일 코드에 대해 테스트 실행
   */
  runTests(request: TestRunRequest): Promise<TestRunResponse>

  /**
   * 원본/변환 코드 비교 테스트
   */
  compareTests(request: TestCompareRequest): Promise<TestCompareResponse>
}
