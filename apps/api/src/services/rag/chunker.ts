import type { ChunkingOptions } from './types.js'

const DEFAULT_MAX_TOKENS = 500
const DEFAULT_OVERLAP_TOKENS = 50

// Rough estimate: 1 token ≈ 4 characters for English text
const CHARS_PER_TOKEN = 4

export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): string[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS

  const maxChars = maxTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN

  if (text.length <= maxChars) {
    return [text]
  }

  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChars

    // Try to find a natural break point (paragraph, sentence, or word)
    if (endIndex < text.length) {
      const searchStart = Math.max(startIndex + maxChars - 200, startIndex)
      const searchText = text.slice(searchStart, endIndex)

      // Look for paragraph break
      const paragraphBreak = searchText.lastIndexOf('\n\n')
      if (paragraphBreak !== -1) {
        endIndex = searchStart + paragraphBreak + 2
      } else {
        // Look for sentence break
        const sentenceBreak = Math.max(
          searchText.lastIndexOf('. '),
          searchText.lastIndexOf('.\n'),
          searchText.lastIndexOf('? '),
          searchText.lastIndexOf('! ')
        )
        if (sentenceBreak !== -1) {
          endIndex = searchStart + sentenceBreak + 2
        } else {
          // Look for word break
          const wordBreak = searchText.lastIndexOf(' ')
          if (wordBreak !== -1) {
            endIndex = searchStart + wordBreak + 1
          }
        }
      }
    }

    chunks.push(text.slice(startIndex, endIndex).trim())

    // Move start with overlap
    startIndex = endIndex - overlapChars
    if (startIndex >= text.length) break
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

export function chunkBySection(text: string): string[] {
  // Split by markdown headers (##, ###, etc.)
  const sections = text.split(/(?=^#{2,}\s)/m)
  return sections.map((s) => s.trim()).filter((s) => s.length > 0)
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
