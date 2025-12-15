import type { CppVersionId } from '@shuguridan/shared'

/**
 * 테스트 케이스 생성을 위한 시스템 프롬프트
 */
export function getTestGenerationSystemPrompt(language: 'ko' | 'en'): string {
  if (language === 'ko') {
    return `당신은 C++ 코드 테스트 전문가입니다. 주어진 C++ 코드를 분석하여 동작을 검증할 수 있는 테스트 케이스를 생성합니다.

## 역할
- 코드의 입출력 동작을 분석합니다
- 경계값, 일반 케이스, 예외 상황을 고려한 테스트를 생성합니다
- 원본 코드와 변환된 코드가 동일하게 동작하는지 검증할 수 있는 테스트를 만듭니다

## 테스트 유형
1. **I/O 테스트**: stdin 입력과 stdout 출력을 비교하는 테스트
2. **단위 테스트**: 특정 함수의 반환값이나 동작을 검증하는 테스트

## 응답 형식
반드시 다음 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "tests": [
    {
      "name": "test_name",
      "description": "테스트 설명",
      "type": "io",
      "input": "stdin 입력값",
      "expectedOutput": "예상 stdout 출력",
      "assertions": ["검증 항목 1", "검증 항목 2"]
    }
  ]
}
\`\`\`

## 주의사항
- 테스트 이름은 영문 snake_case로 작성
- description과 assertions는 한국어로 작성
- input과 expectedOutput은 정확한 문자열로 작성
- 빈 입력이 필요한 경우 input을 빈 문자열("")로 설정
- 출력에 개행이 포함되면 \\n으로 표시`
  }

  return `You are a C++ code testing expert. Analyze the given C++ code and generate test cases to verify its behavior.

## Role
- Analyze the input/output behavior of the code
- Generate tests considering boundary values, normal cases, and edge cases
- Create tests that can verify if the original and modernized code behave identically

## Test Types
1. **I/O Tests**: Tests that compare stdin input and stdout output
2. **Unit Tests**: Tests that verify return values or behavior of specific functions

## Response Format
Respond ONLY in the following JSON format:
\`\`\`json
{
  "tests": [
    {
      "name": "test_name",
      "description": "Test description",
      "type": "io",
      "input": "stdin input value",
      "expectedOutput": "expected stdout output",
      "assertions": ["Verification item 1", "Verification item 2"]
    }
  ]
}
\`\`\`

## Notes
- Test names should be in English snake_case
- Use \\n for newlines in output
- For empty input, set input to empty string ("")`
}

/**
 * 테스트 생성 사용자 프롬프트
 */
export function getTestGenerationUserPrompt(
  originalCode: string,
  modernizedCode: string,
  sourceVersion: CppVersionId,
  targetVersion: CppVersionId,
  testType: 'unit' | 'io' | 'both',
  maxTestCases: number,
  language: 'ko' | 'en'
): string {
  const testTypeDesc = {
    unit: language === 'ko' ? '단위 테스트만' : 'unit tests only',
    io: language === 'ko' ? 'I/O 테스트만' : 'I/O tests only',
    both: language === 'ko' ? '단위 테스트와 I/O 테스트 모두' : 'both unit and I/O tests',
  }

  if (language === 'ko') {
    return `다음 C++ 코드에 대한 테스트 케이스를 생성해주세요.

## 원본 코드 (${sourceVersion.toUpperCase()})
\`\`\`cpp
${originalCode}
\`\`\`

## 변환된 코드 (${targetVersion.toUpperCase()})
\`\`\`cpp
${modernizedCode}
\`\`\`

## 요구사항
- 테스트 유형: ${testTypeDesc[testType]}
- 최대 테스트 케이스 수: ${maxTestCases}개
- 원본과 변환 코드가 동일한 출력을 내는지 검증할 수 있는 테스트 생성

## 테스트 케이스 고려사항
1. 정상적인 입력 케이스
2. 경계값 (빈 입력, 최대값, 최소값 등)
3. 예외적인 입력 케이스

JSON 형식으로만 응답해주세요.`
  }

  return `Generate test cases for the following C++ code.

## Original Code (${sourceVersion.toUpperCase()})
\`\`\`cpp
${originalCode}
\`\`\`

## Modernized Code (${targetVersion.toUpperCase()})
\`\`\`cpp
${modernizedCode}
\`\`\`

## Requirements
- Test type: ${testTypeDesc[testType]}
- Maximum test cases: ${maxTestCases}
- Generate tests to verify that original and modernized code produce identical output

## Test Case Considerations
1. Normal input cases
2. Boundary values (empty input, max, min, etc.)
3. Edge cases

Respond ONLY in JSON format.`
}

/**
 * 출력 예측 프롬프트 (코드 실행 없이 예상 출력 생성)
 */
export function getOutputPredictionPrompt(
  code: string,
  input: string,
  language: 'ko' | 'en'
): string {
  if (language === 'ko') {
    return `다음 C++ 코드를 분석하고, 주어진 입력에 대한 예상 출력을 생성해주세요.

## 코드
\`\`\`cpp
${code}
\`\`\`

## 입력 (stdin)
\`\`\`
${input}
\`\`\`

## 응답 형식
\`\`\`json
{
  "expectedOutput": "예상되는 stdout 출력",
  "explanation": "출력 예측 근거"
}
\`\`\`

JSON 형식으로만 응답해주세요.`
  }

  return `Analyze the following C++ code and predict the expected output for the given input.

## Code
\`\`\`cpp
${code}
\`\`\`

## Input (stdin)
\`\`\`
${input}
\`\`\`

## Response Format
\`\`\`json
{
  "expectedOutput": "expected stdout output",
  "explanation": "reasoning for the prediction"
}
\`\`\`

Respond ONLY in JSON format.`
}
