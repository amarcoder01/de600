import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { FileAnalysisService } from '@/lib/file-analysis-service'
import { FileStorageService } from '@/lib/file-storage-service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const analysisMode = formData.get('analysisMode') as string || 'financial'
    const userPrompt = formData.get('prompt') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload images (PNG, JPG, JPEG, GIF, WebP), PDFs, or documents (DOC, DOCX, TXT, CSV, XLS, XLSX).' 
      }, { status: 400 })
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }

    console.log(`📄 Analyzing file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Store file temporarily
    const fileInfo = await FileStorageService.storeTemporaryFile(file)

    try {
      // Analyze the file based on type
      const analysisResult = await FileAnalysisService.analyzeFile(
        fileInfo,
        analysisMode as 'financial' | 'general',
        userPrompt,
        openai
      )

      // Clean up temporary file
      await FileStorageService.cleanupTemporaryFile(fileInfo.path)

      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          analysisMode,
          timestamp: new Date().toISOString()
        }
      })

    } catch (analysisError) {
      // Clean up temporary file on error
      await FileStorageService.cleanupTemporaryFile(fileInfo.path)
      throw analysisError
    }

  } catch (error) {
    console.error('File analysis error:', error)
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze file'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'File Analysis API',
    supportedTypes: [
      'Images: PNG, JPG, JPEG, GIF, WebP',
      'Documents: PDF, DOC, DOCX, TXT, CSV',
      'Spreadsheets: XLS, XLSX'
    ],
    maxFileSize: '10MB',
    analysisModes: ['financial', 'general']
  })
}
