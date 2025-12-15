import type { DocType, TargetLevel, OutputLanguage } from '@shuguridan/shared'
import type { PromptContext, CodeModernizationContext } from './types.js'

const LANGUAGE_INSTRUCTIONS = {
  ko: '응답은 반드시 한국어로 작성하세요.',
  en: 'Respond in English.',
}

const LEVEL_DESCRIPTIONS = {
  beginner: '초급 개발자 (C++ 경험 1년 미만)',
  intermediate: '중급 개발자 (C++ 경험 1-3년)',
  senior: '시니어 개발자 (C++ 경험 5년 이상)',
  'compiler-engineer': '컴파일러/언어 엔지니어 (표준 명세 수준 이해)',
}

// System prompts for different document types
export const SYSTEM_PROMPTS = {
  base: `You are a C++ language expert specializing in C++ standard transitions and modernization.
Your responses must be:
1. Based ONLY on official C++ standard documentation and well-established references
2. Technically accurate with proper citations
3. Clear about uncertainty - if you're not sure about something, say "확인 필요" (needs verification)

Never hallucinate or make up information. If the provided context doesn't contain enough information to answer, explicitly state that.`,

  migration_guide: `You are a C++ migration specialist helping teams upgrade their codebase.
Focus on:
- Practical migration steps
- Common pitfalls and how to avoid them
- Compiler compatibility considerations
- Testing strategies after migration`,

  release_notes: `You are a technical writer creating release notes for C++ version upgrades.
Focus on:
- Clear categorization of changes
- Impact assessment for each change
- Code examples showing before/after
- Deprecation warnings and timelines`,

  test_points: `You are a QA engineer identifying test points for C++ version transitions.
Focus on:
- Critical areas requiring testing
- Edge cases introduced by language changes
- Regression test recommendations
- Behavior change verification strategies`,
}

export function buildMigrationGuidePrompt(context: PromptContext): string {
  const { sourceVersion, targetVersion, diffSummary, ragContext, outputLanguage, targetLevel } = context

  return `# C++ 마이그레이션 가이드 작성 요청

## 대상 버전
- 소스 버전: ${sourceVersion}
- 타겟 버전: ${targetVersion}

## 대상 독자
${LEVEL_DESCRIPTIONS[targetLevel]}

## 변경 사항 요약
${diffSummary}

## 참조 문서 (RAG Context)
${ragContext}

## 작성 지침
${LANGUAGE_INSTRUCTIONS[outputLanguage]}

다음 구조로 마이그레이션 가이드를 작성하세요:

1. **개요**: 이 마이그레이션의 주요 목적과 이점
2. **사전 준비사항**: 마이그레이션 전 확인해야 할 사항
3. **주요 변경사항**: 카테고리별 상세 설명
   - 새로운 기능 (활용 권장 사항 포함)
   - 동작 변경 (주의사항 포함)
   - Deprecated/Removed (대체 방안 포함)
   - 라이브러리 변경
4. **마이그레이션 단계**: 단계별 가이드
5. **테스트 전략**: 마이그레이션 후 검증 방법
6. **참고 문서**: ISO 표준 섹션 및 cppreference 링크

중요: 모든 권장사항은 반드시 제공된 참조 문서에 근거해야 합니다.`
}

export function buildReleaseNotesPrompt(context: PromptContext): string {
  const { sourceVersion, targetVersion, diffSummary, ragContext, outputLanguage, targetLevel } = context

  return `# C++ 릴리즈 노트 작성 요청

## 대상 버전
- 이전 버전: ${sourceVersion}
- 새 버전: ${targetVersion}

## 대상 독자
${LEVEL_DESCRIPTIONS[targetLevel]}

## 변경 사항 데이터
${diffSummary}

## 참조 문서 (RAG Context)
${ragContext}

## 작성 지침
${LANGUAGE_INSTRUCTIONS[outputLanguage]}

다음 구조로 릴리즈 노트를 작성하세요:

1. **하이라이트**: 가장 중요한 3-5개 변경사항
2. **새로운 기능**
   - 기능명, 설명, 코드 예제
   - 영향도 (compile-time/runtime)
3. **동작 변경**
   - 변경 내용과 이유
   - 이전 버전과의 차이점
   - 필요한 코드 수정 사항
4. **Deprecated 기능**
   - 대상 기능과 대체 방안
   - 제거 예정 시기 (알려진 경우)
5. **라이브러리 업데이트**
   - 새로운 헤더/클래스/함수
   - 성능 개선 사항
6. **알려진 이슈 및 제한사항**

각 항목에 ISO 표준 참조 (예: §5.1.2)를 포함하세요.`
}

export function buildTestPointsPrompt(context: PromptContext): string {
  const { sourceVersion, targetVersion, diffSummary, ragContext, outputLanguage, targetLevel } = context

  return `# C++ 버전 전환 테스트 포인트 작성 요청

## 대상 버전
- 소스 버전: ${sourceVersion}
- 타겟 버전: ${targetVersion}

## 대상 독자
${LEVEL_DESCRIPTIONS[targetLevel]}

## 변경 사항 데이터
${diffSummary}

## 참조 문서 (RAG Context)
${ragContext}

## 작성 지침
${LANGUAGE_INSTRUCTIONS[outputLanguage]}

다음 구조로 테스트 포인트를 작성하세요:

1. **테스트 범위 개요**
   - 총 테스트 영역 수
   - 우선순위별 분류

2. **Critical 테스트 포인트** (반드시 테스트)
   - 동작 변경으로 인한 regression 가능 영역
   - 제거된 기능 사용 코드 확인
   - UB(Undefined Behavior) 관련 변경

3. **High 테스트 포인트** (권장)
   - 새 기능 호환성
   - 컴파일러별 차이 확인

4. **Medium 테스트 포인트** (선택)
   - 라이브러리 마이그레이션
   - 성능 검증

5. **테스트 케이스 예시**
   각 카테고리별 구체적 테스트 코드 예시

6. **테스트 환경 권장사항**
   - 지원 컴파일러 버전
   - 플래그 설정`
}

export function buildCodeModernizationPrompt(context: CodeModernizationContext): string {
  const { sourceVersion, targetVersion, ragContext, outputLanguage, oldCode, filename } = context

  return `# 코드 현대화 요청

## 코드 정보
${filename ? `파일: ${filename}` : ''}
소스 버전: ${sourceVersion}
타겟 버전: ${targetVersion}

## 원본 코드
\`\`\`cpp
${oldCode}
\`\`\`

## 참조 문서 (RAG Context)
${ragContext}

## 작성 지침
${LANGUAGE_INSTRUCTIONS[outputLanguage]}

다음 형식으로 응답하세요:

### 1. 변경 이유 (Why?)
- deprecation 근거
- 안전성/성능 이점

### 2. 현대화된 코드
\`\`\`cpp
// 변환된 코드
\`\`\`

### 3. 변경 상세 설명
- 각 변경 부분에 대한 설명

### 4. 참조 문서
- ISO 표준 섹션
- cppreference 링크

중요: 근거 문서에 없는 내용은 "확인 필요"로 표시하세요.`
}

export function getPromptBuilder(docType: DocType) {
  switch (docType) {
    case 'migration_guide':
      return buildMigrationGuidePrompt
    case 'release_notes':
      return buildReleaseNotesPrompt
    case 'test_points':
      return buildTestPointsPrompt
    default:
      return buildMigrationGuidePrompt
  }
}

export function getSystemPrompt(docType: DocType): string {
  return `${SYSTEM_PROMPTS.base}\n\n${SYSTEM_PROMPTS[docType]}`
}
