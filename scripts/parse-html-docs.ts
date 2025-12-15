/**
 * HTML Document Parser for cppreference.com scraped pages
 * Extracts title, content, and metadata from HTML files
 */

import * as cheerio from 'cheerio'
import { readFile } from 'fs/promises'
import { join } from 'path'

export interface ParsedDocument {
  title: string
  content: string
  summary: string
  sections: Section[]
  codeExamples: string[]
  metadata: DocumentMetadata
}

export interface Section {
  heading: string
  level: number
  content: string
}

export interface DocumentMetadata {
  url: string
  filename: string
  category: 'language' | 'library' | 'header' | 'general'
  versionMarkers: VersionMarker[]
}

export interface VersionMarker {
  version: string
  type: 'since' | 'until' | 'deprecated'
}

// Version marker patterns found in cppreference HTML
const VERSION_PATTERNS = {
  since: /t-since-cxx(\d+)/,
  until: /t-until-cxx(\d+)/,
  deprecated: /t-deprecated-cxx(\d+)/,
  mark: /t-mark-rev/,
}

/**
 * Parse a cppreference HTML file and extract structured content
 */
export async function parseHtmlDocument(
  filePath: string,
  url: string
): Promise<ParsedDocument> {
  const html = await readFile(filePath, 'utf-8')
  const $ = cheerio.load(html)

  // Extract title
  const title = $('#firstHeading').text().trim() ||
                $('h1').first().text().trim() ||
                'Untitled'

  // Extract main content
  const contentArea = $('#mw-content-text')

  // Remove navigation, edit links, and other non-content elements
  contentArea.find('.t-navbar, .editsection, .noprint, .mbox-small-left, script, style, #toc').remove()

  // Extract version markers
  const versionMarkers = extractVersionMarkers($, contentArea)

  // Extract sections
  const sections = extractSections($, contentArea)

  // Extract code examples
  const codeExamples = extractCodeExamples($, contentArea)

  // Get clean text content
  const content = cleanText(contentArea.text())

  // Generate summary (first 500 chars of content)
  const summary = content.substring(0, 500).trim()

  // Determine category from URL
  const category = categorizeFromUrl(url)

  return {
    title,
    content,
    summary,
    sections,
    codeExamples,
    metadata: {
      url,
      filename: filePath.split(/[/\\]/).pop() || '',
      category,
      versionMarkers,
    },
  }
}

/**
 * Extract version markers from content
 */
function extractVersionMarkers(
  $: cheerio.CheerioAPI,
  contentArea: cheerio.Cheerio<cheerio.Element>
): VersionMarker[] {
  const markers: VersionMarker[] = []
  const seen = new Set<string>()

  contentArea.find('[class*="t-since-cxx"], [class*="t-until-cxx"], [class*="t-deprecated-cxx"]').each((_, el) => {
    const classes = $(el).attr('class') || ''

    const sinceMatch = classes.match(/t-since-cxx(\d+)/)
    if (sinceMatch) {
      const key = `since-${sinceMatch[1]}`
      if (!seen.has(key)) {
        markers.push({ version: `cpp${sinceMatch[1]}`, type: 'since' })
        seen.add(key)
      }
    }

    const untilMatch = classes.match(/t-until-cxx(\d+)/)
    if (untilMatch) {
      const key = `until-${untilMatch[1]}`
      if (!seen.has(key)) {
        markers.push({ version: `cpp${untilMatch[1]}`, type: 'until' })
        seen.add(key)
      }
    }

    const deprecatedMatch = classes.match(/t-deprecated-cxx(\d+)/)
    if (deprecatedMatch) {
      const key = `deprecated-${deprecatedMatch[1]}`
      if (!seen.has(key)) {
        markers.push({ version: `cpp${deprecatedMatch[1]}`, type: 'deprecated' })
        seen.add(key)
      }
    }
  })

  // Also check text content for version mentions
  const text = contentArea.text()
  const textVersions = text.match(/\((?:since|until|deprecated in) C\+\+(\d+)\)/gi) || []
  for (const match of textVersions) {
    const versionMatch = match.match(/C\+\+(\d+)/i)
    if (versionMatch) {
      const version = `cpp${versionMatch[1]}`
      const type = match.toLowerCase().includes('since') ? 'since' :
                   match.toLowerCase().includes('until') ? 'until' : 'deprecated'
      const key = `${type}-${versionMatch[1]}`
      if (!seen.has(key)) {
        markers.push({ version, type })
        seen.add(key)
      }
    }
  }

  return markers
}

/**
 * Extract sections from content
 */
function extractSections(
  $: cheerio.CheerioAPI,
  contentArea: cheerio.Cheerio<cheerio.Element>
): Section[] {
  const sections: Section[] = []

  contentArea.find('h2, h3, h4').each((_, el) => {
    const heading = $(el).text().replace(/\[edit\]/g, '').trim()
    const level = parseInt(el.tagName.replace('h', ''), 10)

    // Get content until next heading
    let content = ''
    let nextEl = $(el).next()
    while (nextEl.length && !nextEl.is('h2, h3, h4')) {
      content += nextEl.text() + '\n'
      nextEl = nextEl.next()
    }

    if (heading && content.trim()) {
      sections.push({
        heading,
        level,
        content: cleanText(content),
      })
    }
  })

  return sections
}

/**
 * Extract code examples from content
 */
function extractCodeExamples(
  $: cheerio.CheerioAPI,
  contentArea: cheerio.Cheerio<cheerio.Element>
): string[] {
  const examples: string[] = []

  contentArea.find('pre, .mw-geshi, .source-cpp, code').each((_, el) => {
    const code = $(el).text().trim()
    if (code.length > 20 && code.length < 5000) {
      examples.push(code)
    }
  })

  return examples.slice(0, 5) // Limit to 5 examples
}

/**
 * Categorize document based on URL
 */
function categorizeFromUrl(url: string): 'language' | 'library' | 'header' | 'general' {
  if (url.includes('/language/')) return 'language'
  if (url.includes('/header/')) return 'header'
  if (url.includes('/utility/') ||
      url.includes('/container/') ||
      url.includes('/algorithm/') ||
      url.includes('/memory/') ||
      url.includes('/thread/') ||
      url.includes('/atomic/') ||
      url.includes('/chrono/') ||
      url.includes('/string/') ||
      url.includes('/iterator/') ||
      url.includes('/numeric/') ||
      url.includes('/io/') ||
      url.includes('/filesystem/') ||
      url.includes('/regex/') ||
      url.includes('/types/') ||
      url.includes('/error/') ||
      url.includes('/functional/')) {
    return 'library'
  }
  return 'general'
}

/**
 * Clean text content
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[edit\]/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/**
 * Test the parser with sample files
 */
async function testParser() {
  const scrappedDir = join(process.cwd(), 'scrapped')
  const indexPath = join(scrappedDir, 'index.json')

  const indexContent = await readFile(indexPath, 'utf-8')
  const urlToFile = JSON.parse(indexContent) as Record<string, string>

  // Test with a few sample files
  const testUrls = [
    'https://en.cppreference.com/w/cpp/11.html',
    'https://en.cppreference.com/w/cpp/17.html',
    'https://en.cppreference.com/w/cpp/language/lambda.html',
  ]

  for (const url of testUrls) {
    const filename = urlToFile[url]
    if (filename) {
      const filePath = join(scrappedDir, filename)
      try {
        const doc = await parseHtmlDocument(filePath, url)
        console.log('\n' + '='.repeat(60))
        console.log(`File: ${filename}`)
        console.log(`Title: ${doc.title}`)
        console.log(`Category: ${doc.metadata.category}`)
        console.log(`Version Markers: ${JSON.stringify(doc.metadata.versionMarkers)}`)
        console.log(`Sections: ${doc.sections.length}`)
        console.log(`Code Examples: ${doc.codeExamples.length}`)
        console.log(`Content Length: ${doc.content.length} chars`)
        console.log(`Summary: ${doc.summary.substring(0, 200)}...`)
      } catch (err) {
        console.error(`Failed to parse ${filename}:`, err)
      }
    }
  }
}

// Run test if executed directly
if (process.argv[2] === '--test') {
  testParser().catch(console.error)
}

export { testParser }
