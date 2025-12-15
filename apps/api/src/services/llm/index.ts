import { ClaudeProvider } from './claude.js'
import { OpenAIProvider } from './openai.js'
import type { LLMConfig, LLMProvider } from './types.js'

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'anthropic':
      if (!config.apiKey) throw new Error('Anthropic API key required')
      return new ClaudeProvider(config.apiKey, config.model)

    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI API key required')
      return new OpenAIProvider(config.apiKey, config.model)

    case 'local':
      throw new Error('Local LLM not yet implemented')

    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

export * from './types.js'
export { ClaudeProvider } from './claude.js'
export { OpenAIProvider } from './openai.js'
