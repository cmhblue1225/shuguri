import Anthropic from '@anthropic-ai/sdk'
import type {
  TestGeneratorService,
  TestGenerateRequest,
  TestGenerateResponse,
  TestRunRequest,
  TestRunResponse,
  TestCompareRequest,
  TestCompareResponse,
  GeneratedTest,
  TestResult,
} from './types.js'
import {
  getTestGenerationSystemPrompt,
  getTestGenerationUserPrompt,
} from './prompts.js'
import {
  parseLLMTestOutput,
  convertToGeneratedTests,
  compareOutputs,
} from './parser.js'
import { getDefaultCompilerProvider } from '../compiler/index.js'

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_MAX_TOKENS = 4096

/**
 * LLM 기반 테스트 생성 서비스
 */
export class LLMTestGenerator implements TestGeneratorService {
  private client: Anthropic
  private model: string
  private maxTokens: number

  constructor(apiKey: string, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS) {
    this.client = new Anthropic({ apiKey })
    this.model = model
    this.maxTokens = maxTokens
  }

  /**
   * LLM을 사용하여 테스트 케이스 생성
   */
  async generateTests(request: TestGenerateRequest): Promise<TestGenerateResponse> {
    const startTime = Date.now()

    try {
      const systemPrompt = getTestGenerationSystemPrompt(request.outputLanguage)
      const userPrompt = getTestGenerationUserPrompt(
        request.originalCode,
        request.modernizedCode,
        request.sourceVersion,
        request.targetVersion,
        request.testType,
        request.maxTestCases || 5,
        request.outputLanguage
      )

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      const responseText = textBlock?.type === 'text' ? textBlock.text : ''

      const llmOutput = parseLLMTestOutput(responseText)

      if (!llmOutput) {
        return {
          success: false,
          tests: [],
          generationTimeMs: Date.now() - startTime,
          error: 'Failed to parse LLM response',
        }
      }

      const tests = convertToGeneratedTests(llmOutput)

      return {
        success: true,
        tests,
        generationTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        tests: [],
        generationTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 컴파일러를 사용하여 테스트 실행
   */
  async runTests(request: TestRunRequest): Promise<TestRunResponse> {
    const startTime = Date.now()
    const results: TestResult[] = []
    const compiler = getDefaultCompilerProvider()

    if (!compiler) {
      return {
        success: false,
        results: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0 },
        totalTimeMs: Date.now() - startTime,
      }
    }

    for (const test of request.tests) {
      const testStartTime = Date.now()

      try {
        // I/O 테스트만 실행 (stdin/stdout 비교)
        if (test.type !== 'io') {
          results.push({
            testId: test.id,
            testName: test.name,
            status: 'error',
            errorMessage: 'Only I/O tests are supported',
            runTimeMs: Date.now() - testStartTime,
          })
          continue
        }

        const execResult = await compiler.execute({
          code: request.code,
          cppStandard: request.cppStandard,
          stdin: test.input,
          timeout: request.timeout || 10000,
          runTimeout: 5000,
        })

        if (execResult.status === 'error') {
          results.push({
            testId: test.id,
            testName: test.name,
            status: 'error',
            errorMessage: execResult.errors.map((e) => e.message).join('\n'),
            runTimeMs: Date.now() - testStartTime,
          })
          continue
        }

        if (!execResult.runResult) {
          results.push({
            testId: test.id,
            testName: test.name,
            status: 'error',
            errorMessage: 'No run result',
            runTimeMs: Date.now() - testStartTime,
          })
          continue
        }

        const { runResult } = execResult

        if (runResult.status === 'timeout') {
          results.push({
            testId: test.id,
            testName: test.name,
            status: 'timeout',
            runTimeMs: runResult.runTimeMs,
          })
          continue
        }

        if (runResult.status === 'runtime_error' || runResult.status === 'error') {
          results.push({
            testId: test.id,
            testName: test.name,
            status: 'error',
            actualOutput: runResult.stdout,
            errorMessage: runResult.stderr,
            runTimeMs: runResult.runTimeMs,
          })
          continue
        }

        // 출력 비교
        const passed = compareOutputs(test.expectedOutput || '', runResult.stdout)

        results.push({
          testId: test.id,
          testName: test.name,
          status: passed ? 'passed' : 'failed',
          actualOutput: runResult.stdout,
          expectedOutput: test.expectedOutput,
          runTimeMs: runResult.runTimeMs,
        })
      } catch (error) {
        results.push({
          testId: test.id,
          testName: test.name,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          runTimeMs: Date.now() - testStartTime,
        })
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      errors: results.filter((r) => r.status === 'error' || r.status === 'timeout').length,
    }

    return {
      success: summary.errors === 0,
      results,
      summary,
      totalTimeMs: Date.now() - startTime,
    }
  }

  /**
   * 원본과 변환 코드 비교 테스트
   */
  async compareTests(request: TestCompareRequest): Promise<TestCompareResponse> {
    const startTime = Date.now()

    // 원본 코드 테스트 실행
    const originalResults = await this.runTests({
      code: request.originalCode,
      tests: request.tests,
      cppStandard: request.sourceVersion,
      timeout: request.timeout,
    })

    // 변환 코드 테스트 실행
    const modernizedResults = await this.runTests({
      code: request.modernizedCode,
      tests: request.tests,
      cppStandard: request.targetVersion,
      timeout: request.timeout,
    })

    // 비교 통계 계산
    let matching = 0
    let different = 0
    let errors = 0

    for (let i = 0; i < request.tests.length; i++) {
      const origResult = originalResults.results[i]
      const modResult = modernizedResults.results[i]

      if (!origResult || !modResult) {
        errors++
        continue
      }

      if (origResult.status === 'error' || modResult.status === 'error') {
        errors++
      } else if (
        compareOutputs(origResult.actualOutput || '', modResult.actualOutput || '')
      ) {
        matching++
      } else {
        different++
      }
    }

    return {
      success: errors === 0 && different === 0,
      originalResults: originalResults.results,
      modernizedResults: modernizedResults.results,
      comparison: {
        matching,
        different,
        errors,
      },
      totalTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * 기본 테스트 생성기 인스턴스 가져오기
 */
export function getTestGenerator(): LLMTestGenerator | null {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set, test generator unavailable')
    return null
  }

  return new LLMTestGenerator(apiKey)
}

// 타입 re-export
export type {
  TestGeneratorService,
  TestGenerateRequest,
  TestGenerateResponse,
  TestRunRequest,
  TestRunResponse,
  TestCompareRequest,
  TestCompareResponse,
  GeneratedTest,
  TestResult,
} from './types.js'
