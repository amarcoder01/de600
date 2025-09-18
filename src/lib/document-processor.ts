import fs from 'fs/promises'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import csv from 'csv-parser'
import { createReadStream } from 'fs'

export class DocumentProcessor {
  static async processDocument(filePath: string, mimeType: string): Promise<string> {
    try {
      console.log(`📝 Processing document: ${filePath} (${mimeType})`)

      switch (mimeType) {
        case 'text/plain':
          return await this.processTextFile(filePath)
        
        case 'text/csv':
          return await this.processCSVFile(filePath)
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.processWordDocument(filePath)
        
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.processExcelFile(filePath)
        
        default:
          throw new Error(`Unsupported document type: ${mimeType}`)
      }
    } catch (error) {
      console.error('Document processing error:', error)
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async processTextFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      console.log(`✅ Text file processed: ${content.length} characters`)
      return content
    } catch (error) {
      throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async processCSVFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const results: any[] = []
      let headers: string[] = []
      let rowCount = 0

      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList
        })
        .on('data', (data) => {
          results.push(data)
          rowCount++
          // Limit to first 1000 rows to avoid memory issues
          if (rowCount >= 1000) {
            return
          }
        })
        .on('end', () => {
          try {
            // Convert CSV data to readable text format
            let textContent = `CSV File Analysis:\n`
            textContent += `Total Rows: ${rowCount}\n`
            textContent += `Columns: ${headers.join(', ')}\n\n`

            // Add sample data (first 10 rows)
            textContent += `Sample Data:\n`
            const sampleRows = results.slice(0, Math.min(10, results.length))
            
            // Create a formatted table
            textContent += headers.join(' | ') + '\n'
            textContent += headers.map(() => '---').join(' | ') + '\n'
            
            for (const row of sampleRows) {
              const values = headers.map(header => row[header] || '').join(' | ')
              textContent += values + '\n'
            }

            // Add summary statistics for numeric columns
            textContent += `\nColumn Analysis:\n`
            for (const header of headers) {
              const values = results.map(row => row[header]).filter(val => val !== undefined && val !== '')
              const numericValues = values.filter(val => !isNaN(parseFloat(val))).map(val => parseFloat(val))
              
              if (numericValues.length > 0) {
                const sum = numericValues.reduce((a, b) => a + b, 0)
                const avg = sum / numericValues.length
                const min = Math.min(...numericValues)
                const max = Math.max(...numericValues)
                
                textContent += `${header}: Numeric column - Min: ${min}, Max: ${max}, Average: ${avg.toFixed(2)}\n`
              } else {
                const uniqueValues = Array.from(new Set(values)).length
                textContent += `${header}: Text column - ${uniqueValues} unique values\n`
              }
            }

            console.log(`✅ CSV file processed: ${rowCount} rows, ${headers.length} columns`)
            resolve(textContent)
          } catch (error) {
            reject(new Error(`Failed to process CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        })
        .on('error', (error) => {
          reject(new Error(`Failed to read CSV file: ${error.message}`))
        })
    })
  }

  private static async processWordDocument(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      
      if (result.messages.length > 0) {
        console.warn('Word document processing warnings:', result.messages)
      }
      
      console.log(`✅ Word document processed: ${result.value.length} characters`)
      return result.value
    } catch (error) {
      throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async processExcelFile(filePath: string): Promise<string> {
    try {
      // Guard: enforce a maximum file size to mitigate ReDoS vectors in parsers
      const stat = await fs.stat(filePath)
      const MAX_BYTES = 10 * 1024 * 1024 // 10MB
      if (stat.size > MAX_BYTES) {
        throw new Error(`Excel file too large (${stat.size} bytes). Max allowed is ${MAX_BYTES} bytes`)
      }

      const workbook = XLSX.readFile(filePath, {
        cellNF: false,
        cellStyles: false,
        cellDates: false,
        WTF: false
      })
      let textContent = 'Excel File Analysis:\n\n'
      
      // Process each worksheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        // Use array mode with raw values to avoid object prototype pollution
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: '',
          blankrows: false
        }) as any[][]
        
        // Cap rows/columns to reduce processing on untrusted input
        const MAX_ROWS = 1000
        const MAX_COLS = 100
        const limitedData = jsonData.slice(0, Math.min(jsonData.length, MAX_ROWS)).map(row => (row as any[]).slice(0, MAX_COLS))
        
        textContent += `Sheet: ${sheetName}\n`
        textContent += `Rows: ${jsonData.length}\n`
        
        if (limitedData.length > 0) {
          const headers = (limitedData[0] || []) as any[]
          const safeHeaders = headers.filter(h => h !== undefined)
          textContent += `Columns: ${safeHeaders.length}\n`
          textContent += `Headers: ${safeHeaders.join(', ')}\n\n`
          
          // Add sample data (first 10 rows)
          textContent += `Sample Data:\n`
          const sampleRows = limitedData.slice(0, Math.min(11, limitedData.length)) // Include header + 10 rows
          
          for (const row of sampleRows) {
            const rowData = row as any[]
            textContent += rowData.map(cell => cell || '').join(' | ') + '\n'
          }
          
          // Analyze numeric columns
          if (limitedData.length > 1) {
            textContent += `\nColumn Analysis:\n`
            const dataRows = limitedData.slice(1) as any[][]
            
            for (let colIndex = 0; colIndex < safeHeaders.length; colIndex++) {
              const header = safeHeaders[colIndex]
              if (!header) continue
              
              const values = dataRows.map(row => row[colIndex]).filter(val => val !== undefined && val !== '')
              const numericValues = values.filter(val => !isNaN(parseFloat(val))).map(val => parseFloat(val))
              
              if (numericValues.length > 0) {
                const sum = numericValues.reduce((a, b) => a + b, 0)
                const avg = sum / numericValues.length
                const min = Math.min(...numericValues)
                const max = Math.max(...numericValues)
                
                textContent += `${header}: Numeric - Min: ${min}, Max: ${max}, Average: ${avg.toFixed(2)}\n`
              } else {
                const uniqueValues = Array.from(new Set(values)).length
                textContent += `${header}: Text - ${uniqueValues} unique values\n`
              }
            }
          }
        }
        
        textContent += '\n' + '='.repeat(50) + '\n\n'
      }
      
      console.log(`✅ Excel file processed: ${workbook.SheetNames.length} sheets`)
      return textContent
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static extractTableStructures(text: string): Array<{ title?: string; headers: string[]; rows: string[][] }> {
    const tables: Array<{ title?: string; headers: string[]; rows: string[][] }> = []
    
    // Split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    let currentTable: { title?: string; headers: string[]; rows: string[][] } | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if line looks like table headers (contains pipe separators)
      if (line.includes('|') && line.split('|').length >= 3) {
        // This might be a table header
        const columns = line.split('|').map(col => col.trim()).filter(col => col.length > 0)
        
        // Check if next line is separator (contains dashes)
        const nextLine = lines[i + 1]
        if (nextLine && nextLine.includes('-') && nextLine.includes('|')) {
          // This is likely a markdown-style table
          currentTable = {
            title: i > 0 ? lines[i - 1] : undefined,
            headers: columns,
            rows: []
          }
          i++ // Skip the separator line
          continue
        } else {
          // This might be a regular table header
          currentTable = {
            headers: columns,
            rows: []
          }
          continue
        }
      }
      
      // If we're in a table and this line has pipe separators, it's a data row
      if (currentTable && line.includes('|')) {
        const columns = line.split('|').map(col => col.trim()).filter(col => col.length > 0)
        if (columns.length === currentTable.headers.length) {
          currentTable.rows.push(columns)
        }
      } else if (currentTable && currentTable.rows.length > 0) {
        // End of table
        tables.push(currentTable)
        currentTable = null
      }
    }
    
    // Add final table if we ended while in one
    if (currentTable && currentTable.rows.length > 0) {
      tables.push(currentTable)
    }
    
    return tables
  }

  static isFinancialDocument(text: string): boolean {
    const financialKeywords = [
      'revenue', 'profit', 'earnings', 'financial', 'income statement',
      'balance sheet', 'cash flow', 'assets', 'liabilities', 'equity',
      'quarterly', 'annual report', 'sec filing', 'stock', 'investment',
      'portfolio', 'market', 'trading', 'analysis', 'valuation'
    ]
    
    const lowerText = text.toLowerCase()
    const keywordCount = financialKeywords.filter(keyword => lowerText.includes(keyword)).length
    
    return keywordCount >= 3
  }

  static extractFinancialMetrics(text: string): Array<{ metric: string; value: string; context: string }> {
    const metrics: Array<{ metric: string; value: string; context: string }> = []
    
    // Common financial metric patterns
    const patterns = [
      { name: 'Revenue', regex: /revenue[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion|k)?/gi },
      { name: 'Profit', regex: /(?:net\s+)?profit[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion|k)?/gi },
      { name: 'Earnings', regex: /earnings[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion|k)?/gi },
      { name: 'Market Cap', regex: /market\s+cap[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion|k)?/gi },
      { name: 'P/E Ratio', regex: /p\/e\s+ratio[:\s]*([\d,]+(?:\.\d+)?)/gi },
      { name: 'EPS', regex: /eps[:\s]*\$?([\d,]+(?:\.\d+)?)/gi }
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.regex.exec(text)) !== null) {
        const value = match[1] + (match[2] ? ` ${match[2]}` : '')
        const startIndex = Math.max(0, match.index - 50)
        const endIndex = Math.min(text.length, match.index + match[0].length + 50)
        const context = text.slice(startIndex, endIndex).trim()
        
        metrics.push({
          metric: pattern.name,
          value,
          context
        })
      }
    }
    
    return metrics
  }
}
