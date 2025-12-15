import { Judge0Provider } from './judge0.js'
import { WandboxProvider } from './wandbox.js'
import type { CompilerConfig, CompilerProvider } from './types.js'

/**
 * Create a compiler provider based on configuration
 */
export function createCompilerProvider(config: CompilerConfig): CompilerProvider {
  switch (config.provider) {
    case 'wandbox':
      return new WandboxProvider(config.timeout)

    case 'judge0':
      if (!config.apiKey) {
        throw new Error('Judge0 API key is required')
      }
      return new Judge0Provider(config.apiKey, config.baseUrl, config.timeout)

    case 'godbolt':
      throw new Error('Godbolt provider not yet implemented')

    case 'docker':
      throw new Error('Docker provider not yet implemented')

    default:
      throw new Error(`Unknown compiler provider: ${config.provider}`)
  }
}

/**
 * Get default compiler provider from environment
 * Default: Wandbox (free, no API key required)
 */
export function getDefaultCompilerProvider(): CompilerProvider | null {
  const provider = process.env.COMPILER_PROVIDER || 'wandbox'

  // Wandbox is the default - no API key needed
  if (provider === 'wandbox') {
    return new WandboxProvider()
  }

  // Judge0 requires API key
  if (provider === 'judge0') {
    const apiKey = process.env.JUDGE0_API_KEY
    const baseUrl = process.env.JUDGE0_BASE_URL

    if (!apiKey) {
      console.warn('Judge0 provider selected but JUDGE0_API_KEY not set, falling back to Wandbox')
      return new WandboxProvider()
    }

    return new Judge0Provider(apiKey, baseUrl)
  }

  // Fallback to Wandbox
  return new WandboxProvider()
}

// Re-export types and utilities
export * from './types.js'
export * from './validation.js'
export { Judge0Provider } from './judge0.js'
export { WandboxProvider } from './wandbox.js'
