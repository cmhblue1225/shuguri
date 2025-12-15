export interface EmbeddingProvider {
  name: string
  dimensions: number
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export interface EmbeddingConfig {
  provider: 'openai'
  apiKey: string
  model?: string
}

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}
