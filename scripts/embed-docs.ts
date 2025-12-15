/**
 * Document Embedder for cppreference.com pages
 * Creates embeddings and stores them in Supabase via the Ingestion API
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { parseHtmlDocument, type ParsedDocument } from './parse-html-docs.js'
import type { ClassificationResult, CppVersion } from './classify-docs.js'

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3001'
const BATCH_SIZE = 10 // Documents per batch
const DELAY_MS = 1000 // Delay between batches to avoid rate limits

// All C++ versions supported
const ALL_VERSIONS: CppVersion[] = ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'cpp26']

interface IngestDocumentInput {
  title: string
  content: string
  versionId: string
  metadata: {
    category: string
    url: string
    section?: string
    feature?: string
  }
}

interface IngestResult {
  success: boolean
  documentId?: string
  chunksCreated?: number
  totalTokens?: number
  error?: string
}

interface BatchIngestResult {
  totalProcessed: number
  successful: number
  failed: number
  results: {
    successful: IngestResult[]
    failed: Array<{ error: string }>
  }
}

/**
 * Ingest a batch of documents via the API
 */
async function ingestBatch(documents: IngestDocumentInput[]): Promise<BatchIngestResult> {
  const response = await fetch(`${API_BASE}/api/ingest/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documents }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.data as BatchIngestResult
}

/**
 * Map document category to API-allowed values
 */
function mapCategory(category: string): 'language' | 'library' | 'compiler' {
  switch (category) {
    case 'language':
      return 'language'
    case 'library':
      return 'library'
    case 'header':
      return 'library' // Headers are part of library
    case 'compiler':
      return 'compiler'
    default:
      // Map 'general' to 'language' as default
      return 'language'
  }
}

/**
 * Prepare a document for ingestion
 */
function prepareDocument(
  doc: ParsedDocument,
  versionId: string
): IngestDocumentInput {
  // Combine title and content for embedding
  const content = [
    `# ${doc.title}`,
    '',
    doc.summary,
    '',
    ...doc.sections.map(s => `## ${s.heading}\n${s.content}`),
  ].join('\n')

  return {
    title: doc.title,
    content: content.substring(0, 20000), // Limit content size
    versionId,
    metadata: {
      category: mapCategory(doc.metadata.category),
      url: doc.metadata.url,
      feature: extractFeatureName(doc.metadata.url),
    },
  }
}

/**
 * Extract feature name from URL
 */
function extractFeatureName(url: string): string | undefined {
  const match = url.match(/\/([^/]+)\.html/)
  return match ? match[1] : undefined
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get existing URLs from the database
 */
async function getExistingUrls(): Promise<Set<string>> {
  try {
    const response = await fetch(`${API_BASE}/api/ingest/urls`)
    if (!response.ok) {
      console.warn('Could not fetch existing URLs, proceeding without skip check')
      return new Set()
    }
    const result = await response.json()
    return new Set(result.data?.urls || [])
  } catch (err) {
    console.warn('Could not fetch existing URLs, proceeding without skip check')
    return new Set()
  }
}

/**
 * Main embedding function
 */
async function embedDocuments(options: {
  dryRun?: boolean
  limit?: number
  versionFilter?: CppVersion
  source?: string
  skipExisting?: boolean
} = {}) {
  const { dryRun = false, limit, versionFilter, source = 'scrapped', skipExisting = false } = options

  // Load classification results (use appropriate filename for source)
  const classificationFilename = source === 'scrapped'
    ? 'classification-result.json'
    : `classification-result-${source}.json`
  const classificationPath = join(process.cwd(), 'scripts', classificationFilename)
  const classificationContent = await readFile(classificationPath, 'utf-8')
  const classifications: ClassificationResult[] = JSON.parse(classificationContent)

  // Get existing URLs if skipExisting is enabled
  let existingUrls = new Set<string>()
  if (skipExisting) {
    console.log('Fetching existing URLs from database...')
    existingUrls = await getExistingUrls()
    console.log(`Found ${existingUrls.size} existing URLs`)
  }

  // Filter classifications if needed
  let filtered = classifications
  if (versionFilter) {
    filtered = classifications.filter(c => c.versions.includes(versionFilter))
  }
  // Skip existing URLs
  if (skipExisting && existingUrls.size > 0) {
    const beforeCount = filtered.length
    filtered = filtered.filter(c => !existingUrls.has(c.url))
    console.log(`Skipping ${beforeCount - filtered.length} already embedded documents`)
  }
  if (limit) {
    filtered = filtered.slice(0, limit)
  }

  console.log(`\nEmbedding ${filtered.length} documents from ${source}...`)
  if (dryRun) {
    console.log('DRY RUN - No actual API calls will be made')
  }

  const scrappedDir = join(process.cwd(), source)

  // Track statistics
  let totalProcessed = 0
  let totalSuccess = 0
  let totalFailed = 0
  let totalChunks = 0

  // Process in batches
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batchClassifications = filtered.slice(i, i + BATCH_SIZE)
    const documentsToIngest: { doc: IngestDocumentInput; version: string }[] = []

    // Parse and prepare documents
    for (const classification of batchClassifications) {
      try {
        const filePath = join(scrappedDir, classification.filename)
        const doc = await parseHtmlDocument(filePath, classification.url)

        // Create ingestion entries for each version
        for (const version of classification.versions) {
          const ingestDoc = prepareDocument(doc, version)
          documentsToIngest.push({ doc: ingestDoc, version })
        }
      } catch (err) {
        console.error(`Failed to parse ${classification.filename}:`, err)
        totalFailed++
      }
    }

    if (documentsToIngest.length === 0) continue

    // Group by version for batch processing
    const byVersion = new Map<string, IngestDocumentInput[]>()
    for (const { doc, version } of documentsToIngest) {
      if (!byVersion.has(version)) {
        byVersion.set(version, [])
      }
      byVersion.get(version)!.push(doc)
    }

    // Ingest each version batch
    for (const [version, docs] of byVersion) {
      if (dryRun) {
        console.log(`[DRY RUN] Would ingest ${docs.length} documents for ${version}`)
        totalProcessed += docs.length
        totalSuccess += docs.length
        continue
      }

      try {
        const result = await ingestBatch(docs)
        totalProcessed += result.totalProcessed
        totalSuccess += result.successful
        totalFailed += result.failed

        // Calculate chunks from successful results
        const batchChunks = result.results.successful?.reduce(
          (sum, r) => sum + (r.chunksCreated || 0), 0
        ) || 0
        totalChunks += batchChunks

        console.log(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
          `${result.successful}/${result.totalProcessed} successful ` +
          `(${version}, ${batchChunks} chunks)`
        )
      } catch (err) {
        console.error(`Failed to ingest batch for ${version}:`, err)
        totalFailed += docs.length
      }
    }

    // Delay between batches
    if (!dryRun && i + BATCH_SIZE < filtered.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Embedding complete!`)
  console.log(`  Total processed: ${totalProcessed}`)
  console.log(`  Successful: ${totalSuccess}`)
  console.log(`  Failed: ${totalFailed}`)
  console.log(`  Total chunks created: ${totalChunks}`)
}

/**
 * Get current stats from the API
 */
async function getStats() {
  const response = await fetch(`${API_BASE}/api/ingest/stats`)
  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.status}`)
  }
  const result = await response.json()
  return result.data
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipExisting = args.includes('--skip-existing')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
  const versionArg = args.find(a => a.startsWith('--version='))
  const versionFilter = versionArg ? versionArg.split('=')[1] as CppVersion : undefined
  const sourceArg = args.find(a => a.startsWith('--source='))
  const source = sourceArg ? sourceArg.split('=')[1] : 'scrapped'

  // Validate version filter
  if (versionFilter && !ALL_VERSIONS.includes(versionFilter)) {
    console.error(`Invalid version: ${versionFilter}`)
    console.error(`Valid versions: ${ALL_VERSIONS.join(', ')}`)
    process.exit(1)
  }

  console.log(`\nSource folder: ${source}`)
  if (skipExisting) {
    console.log('Skip existing: enabled')
  }

  // Show current stats
  console.log('\nCurrent database stats:')
  try {
    const stats = await getStats()
    console.log(`  Total documents: ${stats?.documentCount || 0}`)
  } catch (err) {
    console.log('  (Unable to fetch stats - API may not be running)')
  }

  // Check if classification exists
  const classificationFilename = source === 'scrapped'
    ? 'classification-result.json'
    : `classification-result-${source}.json`
  try {
    const classificationPath = join(process.cwd(), 'scripts', classificationFilename)
    await readFile(classificationPath, 'utf-8')
  } catch {
    console.error(`\nClassification file not found: ${classificationFilename}`)
    console.error(`Please run: npx tsx scripts/classify-docs.ts --source=${source} first`)
    process.exit(1)
  }

  // Run embedding
  await embedDocuments({
    dryRun,
    limit,
    versionFilter,
    source,
    skipExisting,
  })

  // Show updated stats
  if (!dryRun) {
    console.log('\nUpdated database stats:')
    try {
      const stats = await getStats()
      console.log(`  Total documents: ${stats?.documentCount || 0}`)
    } catch (err) {
      console.log('  (Unable to fetch stats)')
    }
  }
}

// Usage help
if (process.argv.includes('--help')) {
  console.log(`
Usage: npx tsx scripts/embed-docs.ts [options]

Options:
  --dry-run              Don't actually call the API
  --limit=N              Only process first N documents
  --version=VERSION      Only process documents for specific version
                         Valid versions: ${ALL_VERSIONS.join(', ')}
  --source=FOLDER        Source folder (default: scrapped)
                         Use --source=scrapped1 for the new dataset
  --skip-existing        Skip documents that already exist in the database
  --help                 Show this help

Examples:
  npx tsx scripts/embed-docs.ts --dry-run
  npx tsx scripts/embed-docs.ts --limit=10
  npx tsx scripts/embed-docs.ts --version=cpp11
  npx tsx scripts/embed-docs.ts --source=scrapped1 --skip-existing
  npx tsx scripts/embed-docs.ts --source=scrapped1 --version=cpp20
`)
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

export { embedDocuments, getStats }
