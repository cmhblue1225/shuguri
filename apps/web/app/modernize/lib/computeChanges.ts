import type { Change } from '../components/DiffViewer'

// C++ modernization pattern definitions
interface ModernizationPattern {
  pattern: RegExp
  category: string
  explanation: (original: string, modernized: string, lang: 'ko' | 'en') => string
}

const MODERNIZATION_PATTERNS: ModernizationPattern[] = [
  // nullptr
  {
    pattern: /nullptr/i,
    category: 'nullptr',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'NULL 대신 nullptr을 사용하여 타입 안전성을 높였습니다. nullptr은 C++11에서 도입된 타입 안전한 null 포인터 상수입니다.'
      : 'NULL is replaced with nullptr for type safety. nullptr is a type-safe null pointer constant introduced in C++11.',
  },
  // Smart pointers
  {
    pattern: /\b(unique_ptr|shared_ptr|weak_ptr|make_unique|make_shared)\b/,
    category: 'smartpointer',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? '원시 포인터와 수동 메모리 관리를 스마트 포인터로 대체하여 자동 메모리 관리와 예외 안전성을 확보했습니다.'
      : 'Raw pointer memory management replaced with smart pointers for automatic memory management and exception safety.',
  },
  // Range-based for
  {
    pattern: /for\s*\(\s*(const\s+)?auto\s*&?/,
    category: 'rangefor',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? '반복자 기반 루프를 범위 기반 for 루프로 변경하여 코드를 더 간결하고 읽기 쉽게 만들었습니다.'
      : 'Iterator-based loops are replaced with range-based for loops for cleaner and more readable code.',
  },
  // auto keyword (general)
  {
    pattern: /\bauto\s+\w+\s*=/,
    category: 'auto',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'auto 키워드를 사용하여 컴파일러가 타입을 자동으로 추론하도록 했습니다. 이는 코드를 더 간결하게 만들고 리팩토링을 용이하게 합니다.'
      : 'Using auto keyword for type inference, making the code more concise and easier to refactor.',
  },
  // using instead of typedef
  {
    pattern: /\busing\s+\w+\s*=/,
    category: 'auto',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'typedef 대신 using을 사용하여 더 명확하고 읽기 쉬운 타입 별칭을 정의했습니다. 이것은 현대 C++ 스타일입니다.'
      : 'typedef is replaced with using for clearer and more readable type aliases. This is the modern C++ style.',
  },
  // Lambda expressions
  {
    pattern: /\[\s*[&=]?\s*\]\s*\(/,
    category: 'lambda',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? '람다 표현식을 사용하여 인라인 함수를 정의했습니다. 람다는 코드를 더 간결하게 만들고 클로저를 지원합니다.'
      : 'Lambda expressions are used for inline function definitions, making code more concise and supporting closures.',
  },
  // constexpr
  {
    pattern: /\bconstexpr\b/,
    category: 'constexpr',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'constexpr를 사용하여 컴파일 시간에 값을 계산합니다. 이는 런타임 성능을 향상시키고 컴파일 시간 상수를 보장합니다.'
      : 'Using constexpr for compile-time evaluation, improving runtime performance and ensuring compile-time constants.',
  },
  // Initializer lists
  {
    pattern: /\{\s*\w+.*\}/,
    category: 'initializer',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? '유니폼 초기화 구문 (중괄호 초기화)을 사용하여 일관된 초기화 방식을 적용했습니다.'
      : 'Uniform initialization syntax (brace initialization) for consistent initialization style.',
  },
  // noexcept
  {
    pattern: /\bnoexcept\b/,
    category: 'default',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'noexcept 지정자를 추가하여 예외를 던지지 않음을 명시합니다. 이는 컴파일러 최적화에 도움이 됩니다.'
      : 'Adding noexcept specifier to indicate no exceptions are thrown, helping compiler optimizations.',
  },
  // override
  {
    pattern: /\boverride\b/,
    category: 'default',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'override 키워드를 추가하여 가상 함수 오버라이드를 명시적으로 표시합니다. 이는 실수를 방지하는 데 도움이 됩니다.'
      : 'Adding override keyword to explicitly mark virtual function overrides, helping prevent mistakes.',
  },
  // = default / = delete
  {
    pattern: /=\s*(default|delete)\b/,
    category: 'default',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? '특수 멤버 함수에 = default 또는 = delete를 사용하여 의도를 명확히 했습니다.'
      : 'Using = default or = delete for special member functions to clarify intent.',
  },
  // emplace_back
  {
    pattern: /emplace_back|emplace/,
    category: 'default',
    explanation: (orig, mod, lang) => lang === 'ko'
      ? 'push_back 대신 emplace_back을 사용하여 불필요한 복사를 피하고 성능을 개선했습니다.'
      : 'Using emplace_back instead of push_back to avoid unnecessary copies and improve performance.',
  },
]

// Detect the category of a modernization based on the modernized line
function detectCategory(originalLine: string, modernizedLine: string): { category: string; explanation: (lang: 'ko' | 'en') => string } {
  for (const pattern of MODERNIZATION_PATTERNS) {
    if (pattern.pattern.test(modernizedLine)) {
      return {
        category: pattern.category,
        explanation: (lang) => pattern.explanation(originalLine, modernizedLine, lang),
      }
    }
  }

  // Default category
  return {
    category: 'default',
    explanation: (lang) => lang === 'ko'
      ? '코드가 현대적인 C++ 스타일로 업데이트되었습니다.'
      : 'Code has been updated to modern C++ style.',
  }
}

// Compute changes between original and modernized code
export function computeChanges(
  originalCode: string,
  modernizedCode: string,
  outputLanguage: 'ko' | 'en' = 'ko'
): Change[] {
  const originalLines = originalCode.split('\n')
  const modernizedLines = modernizedCode.split('\n')
  const changes: Change[] = []

  let changeId = 1
  let i = 0
  let j = 0

  while (i < originalLines.length || j < modernizedLines.length) {
    const origLine = originalLines[i]?.trim() || ''
    const modLine = modernizedLines[j]?.trim() || ''

    // Skip empty lines (both sides)
    if (!origLine && !modLine) {
      i++
      j++
      continue
    }

    // Lines are identical
    if (origLine === modLine) {
      i++
      j++
      continue
    }

    // Lines are different - this is a change
    const { category, explanation } = detectCategory(origLine, modLine)

    // Try to find a matching block of changes
    let origEnd = i
    let modEnd = j

    // Look for the end of this change block (consecutive different lines)
    while (
      origEnd < originalLines.length &&
      modEnd < modernizedLines.length &&
      originalLines[origEnd]?.trim() !== modernizedLines[modEnd]?.trim() &&
      originalLines[origEnd]?.trim() !== '' &&
      modernizedLines[modEnd]?.trim() !== ''
    ) {
      origEnd++
      modEnd++
    }

    // Collect the snippets
    const originalSnippet = originalLines.slice(i, Math.max(i + 1, origEnd)).join('\n').trim()
    const modernizedSnippet = modernizedLines.slice(j, Math.max(j + 1, modEnd)).join('\n').trim()

    if (originalSnippet || modernizedSnippet) {
      changes.push({
        id: String(changeId++),
        lineStart: i + 1,
        lineEnd: origEnd > i ? origEnd : i + 1,
        type: !originalSnippet ? 'add' : !modernizedSnippet ? 'delete' : 'modify',
        originalSnippet,
        modernizedSnippet,
        explanation: explanation(outputLanguage),
        category,
      })
    }

    i = origEnd > i ? origEnd : i + 1
    j = modEnd > j ? modEnd : j + 1
  }

  return changes
}

// Group consecutive similar changes for better readability
export function groupSimilarChanges(changes: Change[]): Change[] {
  if (changes.length <= 1) return changes

  const grouped: Change[] = []
  let current = changes[0]

  for (let i = 1; i < changes.length; i++) {
    const next = changes[i]

    // Group if same category and consecutive lines
    if (
      current.category === next.category &&
      next.lineStart <= current.lineEnd + 2
    ) {
      current = {
        ...current,
        lineEnd: next.lineEnd,
        originalSnippet: [current.originalSnippet, next.originalSnippet]
          .filter(Boolean)
          .join('\n'),
        modernizedSnippet: [current.modernizedSnippet, next.modernizedSnippet]
          .filter(Boolean)
          .join('\n'),
      }
    } else {
      grouped.push(current)
      current = next
    }
  }

  grouped.push(current)
  return grouped
}
