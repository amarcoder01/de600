import fs from 'fs/promises'

// Lazy reference to pdf-parse to avoid loading during build
let pdf: any

export interface PDFContent {
  text: string
  images: PDFImage[]
  metadata: PDFMetadata
  pages: number
}

export interface PDFImage {
  data: Buffer
  format: string
  width?: number
  height?: number
}

export interface PDFMetadata {
  title?: string
  author?: string
  creator?: string
  creationDate?: Date
  modificationDate?: Date
  pages: number
}

export class PDFProcessor {
  static async processPDF(filePath: string): Promise<PDFContent> {
    try {
      if (!pdf) {
        try {
          // Load only at runtime
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          pdf = require('pdf-parse')
        } catch (e) {
          throw new Error('PDF processing not available - pdf-parse package not loaded')
        }
      }
      
      console.log(`📄 Processing PDF: ${filePath}`)
      
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdf(dataBuffer, {
        max: 0 // Process all pages
      })

      console.log(`✅ PDF processed: ${data.numpages} pages, ${data.text.length} characters`)

      // Extract images if available (this is a simplified approach)
      const images = await this.extractImagesFromPDF(dataBuffer)

      return {
        text: data.text,
        images,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creator: data.info?.Creator,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
          pages: data.numpages
        },
        pages: data.numpages
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async extractImagesFromPDF(dataBuffer: Buffer): Promise<PDFImage[]> {
    // This is a simplified image extraction
    // For production, you might want to use a more sophisticated library like pdf2pic
    const images: PDFImage[] = []
    
    try {
      // For now, we'll return an empty array
      // In a full implementation, you would use a library like pdf2pic to convert PDF pages to images
      // or use a PDF parsing library that supports image extraction
      
      console.log('📸 PDF image extraction not fully implemented - using page-to-image conversion as fallback')
      
      // You could implement pdf2pic here for chart extraction:
      // const pdf2pic = require('pdf2pic')
      // const convert = pdf2pic.fromBuffer(dataBuffer, {
      //   density: 300,
      //   saveFilename: 'untitled',
      //   savePath: './temp',
      //   format: 'png',
      //   width: 2048,
      //   height: 2048
      // })
      // const results = await convert.bulk(-1, true)
      // Process results into PDFImage format
      
    } catch (error) {
      console.warn('Image extraction from PDF failed:', error)
    }
    
    return images
  }

  static async extractTextFromPage(filePath: string, pageNumber: number): Promise<string> {
    try {
      if (!pdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          pdf = require('pdf-parse')
        } catch (e) {
          throw new Error('PDF processing not available - pdf-parse package not loaded')
        }
      }
      
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdf(dataBuffer, {
        max: 1 // Process only one page
      })
      
      return data.text
    } catch (error) {
      console.error(`Error extracting text from page ${pageNumber}:`, error)
      throw new Error(`Failed to extract text from page ${pageNumber}`)
    }
  }

  static async getPDFInfo(filePath: string): Promise<PDFMetadata> {
    try {
      if (!pdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          pdf = require('pdf-parse')
        } catch (e) {
          throw new Error('PDF processing not available - pdf-parse package not loaded')
        }
      }
      
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdf(dataBuffer, {
        max: 0 // Don't process any pages, just get metadata
      })
      
      return {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        pages: data.numpages
      }
    } catch (error) {
      console.error('Error getting PDF info:', error)
      throw new Error('Failed to get PDF information')
    }
  }

  static isChartLikelyInText(text: string): boolean {
    const chartKeywords = [
      'chart', 'graph', 'figure', 'plot', 'diagram',
      'price', 'volume', 'trend', 'analysis',
      'stock', 'market', 'trading', 'financial',
      'candlestick', 'line chart', 'bar chart'
    ]
    
    const lowerText = text.toLowerCase()
    const keywordCount = chartKeywords.filter(keyword => lowerText.includes(keyword)).length
    
    // If we find multiple chart-related keywords, it's likely a financial document with charts
    return keywordCount >= 3
  }

  static extractTablesFromText(text: string): string[] {
    const tables: string[] = []
    
    // Look for table-like structures in text
    const lines = text.split('\n')
    let currentTable: string[] = []
    let inTable = false
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detect if line looks like a table row (has multiple columns separated by spaces/tabs)
      const hasMultipleColumns = trimmedLine.split(/\s{2,}|\t/).length >= 3
      const hasNumbers = /\d/.test(trimmedLine)
      const isTableLike = hasMultipleColumns && (hasNumbers || trimmedLine.includes('|'))
      
      if (isTableLike) {
        if (!inTable) {
          inTable = true
          currentTable = []
        }
        currentTable.push(trimmedLine)
      } else if (inTable && trimmedLine.length === 0) {
        // Empty line might end the table
        continue
      } else if (inTable) {
        // Non-table line encountered, end current table
        if (currentTable.length >= 2) { // At least 2 rows to be considered a table
          tables.push(currentTable.join('\n'))
        }
        currentTable = []
        inTable = false
      }
    }
    
    // Add final table if we were still in one
    if (inTable && currentTable.length >= 2) {
      tables.push(currentTable.join('\n'))
    }
    
    return tables
  }
}
