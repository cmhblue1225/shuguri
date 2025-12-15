import OpenAI from 'openai'
import type { LLMProvider } from './types.js'

export class OpenAIProvider implements LLMProvider {
  name = 'openai'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'gpt-4-turbo-preview') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async generate(prompt: string, context?: string[]): Promise<string> {
    const contextStr = context?.length
      ? `\n\n[CONTEXT]\n${context.join('\n\n')}`
      : ''

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content:
            'You are a C++ expert specializing in language standard migrations. Only provide answers based on official C++ standard documentation. If uncertain, say so.',
        },
        {
          role: 'user',
          content: prompt + contextStr,
        },
      ],
    })

    return response.choices[0]?.message?.content || ''
  }
}
