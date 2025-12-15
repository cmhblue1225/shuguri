import OpenAI from 'openai'
import type { EmbeddingProvider } from './types.js'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai'
  dimensions = 1536
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    })
    return response.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    // OpenAI supports batch embedding
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    })

    // Sort by index to maintain order
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding)
  }
}
