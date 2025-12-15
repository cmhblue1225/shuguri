export interface LLMProvider {
  name: string
  generate(prompt: string, context?: string[]): Promise<string>
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local'
  apiKey?: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface GenerationOptions {
  targetLevel: 'beginner' | 'intermediate' | 'senior' | 'compiler-engineer'
  outputLanguage: 'ko' | 'en'
  outputFormat: 'bullet' | 'table' | 'prose' | 'mixed'
}
