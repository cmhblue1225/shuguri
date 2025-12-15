/**
 * Embed C++26 documents only from scrapped1
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { parseHtmlDocument } from './parse-html-docs.js'
import type { ClassificationResult } from './classify-docs.js'

const API_BASE = process.env.API_URL || 'http://localhost:3001'
const BATCH_SIZE = 10
const DELAY_MS = 1000

interface IngestDocumentInput {
  title: string
  content: string
  versionId: string
  metadata: {
    category: string
    url: string
    section?: string
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mapCategory(category: string): 'language' | 'library' | 'compiler' {
  switch (category) {
    case 'language': return 'language'
    case 'library': return 'library'
    case 'header': return 'library'
    case 'compiler': return 'compiler'
    default: return 'language'
  }
}

async function ingestBatch(documents: IngestDocumentInput[]) {
  const response = await fetch(`${API_BASE}/api/ingest/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  return (await response.json()).data
}

async function main() {
  console.log('Loading classification result...')

  const classificationPath = join(process.cwd(), 'scripts', 'classification-result-scrapped1.json')
  const classifications: ClassificationResult[] = JSON.parse(await readFile(classificationPath, 'utf-8'))

  // Filter only documents that have cpp26
  const cpp26Docs = classifications.filter(c => c.versions.includes('cpp26'))
  console.log(`Found ${cpp26Docs.length} documents with cpp26`)

  const scrappedDir = join(process.cwd(), 'scrapped1')

  let totalProcessed = 0
  let totalSuccess = 0
  let totalFailed = 0
  let totalChunks = 0

  // Process in batches
  for (let i = 0; i < cpp26Docs.length; i += BATCH_SIZE) {
    const batch = cpp26Docs.slice(i, i + BATCH_SIZE)
    const documentsToIngest: IngestDocumentInput[] = []

    for (const classification of batch) {
      try {
        const filePath = join(scrappedDir, classification.filename)
        const doc = await parseHtmlDocument(filePath, classification.url)

        // Only create cpp26 embedding
        const content = [
          `# ${doc.title}`,
          '',
          doc.summary,
          '',
          '## Content',
          doc.content,
          doc.codeExamples.length > 0 ? '\n## Code Examples\n' + doc.codeExamples.join('\n\n') : '',
        ].filter(Boolean).join('\n')

        documentsToIngest.push({
          title: doc.title,
          content,
          versionId: 'cpp26',
          metadata: {
            category: mapCategory(classification.category),
            url: classification.url,
            section: classification.section,
          }
        })
      } catch (err) {
        console.error(`Failed to parse ${classification.filename}:`, err)
        totalFailed++
      }
    }

    if (documentsToIngest.length === 0) continue

    try {
      const result = await ingestBatch(documentsToIngest)
      totalProcessed += result.totalProcessed
      totalSuccess += result.successful
      totalFailed += result.failed

      const batchChunks = result.results?.successful?.reduce(
        (sum: number, r: any) => sum + (r.chunksCreated || 0), 0
      ) || 0
      totalChunks += batchChunks

      console.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cpp26Docs.length / BATCH_SIZE)}: ` +
        `${result.successful}/${result.totalProcessed} successful (${batchChunks} chunks)`
      )
    } catch (err) {
      console.error(`Failed to ingest batch:`, err)
      totalFailed += documentsToIngest.length
    }

    if (i + BATCH_SIZE < cpp26Docs.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`C++26 Embedding complete!`)
  console.log(`  Total processed: ${totalProcessed}`)
  console.log(`  Successful: ${totalSuccess}`)
  console.log(`  Failed: ${totalFailed}`)
  console.log(`  Total chunks created: ${totalChunks}`)
}

main().catch(console.error)
