import type { LLMTestOutput, GeneratedTest } from './types.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * LLM 출력에서 JSON 블록 추출
 */
export function extractJsonFromResponse(response: string): string | null {
  // Try to find JSON in code blocks first
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return null
}

/**
 * LLM 출력 파싱
 */
export function parseLLMTestOutput(response: string): LLMTestOutput | null {
  const jsonStr = extractJsonFromResponse(response)
  if (!jsonStr) {
    console.error('Failed to extract JSON from response')
    return null
  }

  try {
    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (!parsed.tests || !Array.isArray(parsed.tests)) {
      console.error('Invalid response structure: missing tests array')
      return null
    }

    // Validate each test
    const validatedTests = parsed.tests.filter((test: unknown) => {
      if (typeof test !== 'object' || test === null) return false
      const t = test as Record<string, unknown>
      return (
        typeof t.name === 'string' &&
        typeof t.description === 'string' &&
        (t.type === 'unit' || t.type === 'io') &&
        Array.isArray(t.assertions)
      )
    })

    return { tests: validatedTests }
  } catch (error) {
    console.error('Failed to parse JSON:', error)
    return null
  }
}

/**
 * LLM 출력을 GeneratedTest 배열로 변환
 */
export function convertToGeneratedTests(llmOutput: LLMTestOutput): GeneratedTest[] {
  return llmOutput.tests.map((test) => ({
    id: uuidv4(),
    name: test.name,
    description: test.description,
    type: test.type,
    input: test.input || '',
    expectedOutput: test.expectedOutput || '',
    assertions: test.assertions || [],
  }))
}

/**
 * 출력 예측 응답 파싱
 */
export interface OutputPrediction {
  expectedOutput: string
  explanation: string
}

export function parseOutputPrediction(response: string): OutputPrediction | null {
  const jsonStr = extractJsonFromResponse(response)
  if (!jsonStr) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonStr)

    if (typeof parsed.expectedOutput !== 'string') {
      return null
    }

    return {
      expectedOutput: parsed.expectedOutput,
      explanation: parsed.explanation || '',
    }
  } catch {
    return null
  }
}

/**
 * 테스트 결과 출력 정규화 (비교를 위해)
 */
export function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n') // Windows 개행 문자 정규화
    .replace(/\r/g, '\n')
    .trim()
}

/**
 * 두 출력 비교
 */
export function compareOutputs(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual)
}
