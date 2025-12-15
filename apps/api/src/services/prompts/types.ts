import type { DocType, TargetLevel, OutputLanguage } from '@shuguridan/shared'

export interface PromptContext {
  sourceVersion: string
  targetVersion: string
  diffSummary: string
  ragContext: string
  outputLanguage: OutputLanguage
  targetLevel: TargetLevel
}

export interface CodeModernizationContext extends PromptContext {
  filename?: string
  oldCode: string
}

export interface PromptTemplate {
  type: DocType
  systemPrompt: string
  buildUserPrompt: (context: PromptContext) => string
}
