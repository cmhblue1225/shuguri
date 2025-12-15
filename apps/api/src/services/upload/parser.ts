import pdf from 'pdf-parse'

export interface ParsedFile {
  filename: string
  content: string
  mimeType: string
  size: number
}

export type SupportedMimeType = 'text/plain' | 'text/markdown' | 'application/pdf'

const SUPPORTED_EXTENSIONS: Record<string, SupportedMimeType> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
}

export function getSupportedMimeType(filename: string): SupportedMimeType | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return SUPPORTED_EXTENSIONS[ext] || null
}

export function isSupportedFile(filename: string): boolean {
  return getSupportedMimeType(filename) !== null
}

export async function parseFile(
  file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<ParsedFile> {
  const filename = file.name
  const mimeType = getSupportedMimeType(filename)

  if (!mimeType) {
    throw new Error(`Unsupported file type: ${filename}. Supported types: .md, .txt, .pdf`)
  }

  const buffer = await file.arrayBuffer()
  const size = buffer.byteLength

  let content: string

  if (mimeType === 'application/pdf') {
    content = await parsePdf(Buffer.from(buffer))
  } else {
    content = new TextDecoder('utf-8').decode(buffer)
  }

  return {
    filename,
    content,
    mimeType,
    size,
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function parseFiles(
  files: Array<File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }>
): Promise<{ parsed: ParsedFile[]; errors: Array<{ filename: string; error: string }> }> {
  const parsed: ParsedFile[] = []
  const errors: Array<{ filename: string; error: string }> = []

  for (const file of files) {
    try {
      const result = await parseFile(file)
      parsed.push(result)
    } catch (error) {
      errors.push({
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { parsed, errors }
}
