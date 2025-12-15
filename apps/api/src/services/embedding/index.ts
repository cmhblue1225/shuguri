import { OpenAIEmbeddingProvider } from './openai.js'
import type { EmbeddingConfig, EmbeddingProvider } from './types.js'

export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI API key required')
      return new OpenAIEmbeddingProvider(config.apiKey, config.model)

    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`)
  }
}

export * from './types.js'
export { OpenAIEmbeddingProvider } from './openai.js'
