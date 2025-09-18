import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export interface FileInfo {
  id: string
  originalName: string
  path: string
  mimeType: string
  size: number
  extension: string
}

export class FileStorageService {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp')
  private static readonly MAX_AGE_HOURS = 24 // Files older than 24 hours will be cleaned up

  static async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.TEMP_DIR)
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true })
    }
  }

  static async storeTemporaryFile(file: File): Promise<FileInfo> {
    await this.ensureTempDirectory()

    const fileId = randomUUID()
    const extension = this.getFileExtension(file.name)
    const fileName = `${fileId}${extension}`
    const filePath = path.join(this.TEMP_DIR, fileName)

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Write file to disk
    await fs.writeFile(filePath, buffer)

    return {
      id: fileId,
      originalName: file.name,
      path: filePath,
      mimeType: file.type,
      size: file.size,
      extension
    }
  }

  static async readFile(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath)
  }

  static async cleanupTemporaryFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`Failed to cleanup temporary file: ${filePath}`, error)
    }
  }

  static async cleanupOldFiles(): Promise<void> {
    try {
      await this.ensureTempDirectory()
      const files = await fs.readdir(this.TEMP_DIR)
      const cutoffTime = Date.now() - (this.MAX_AGE_HOURS * 60 * 60 * 1000)

      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file)
        const stats = await fs.stat(filePath)
        
        if (stats.mtime.getTime() < cutoffTime) {
          await this.cleanupTemporaryFile(filePath)
          console.log(`Cleaned up old temporary file: ${file}`)
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error)
    }
  }

  static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    return lastDot === -1 ? '' : fileName.slice(lastDot)
  }

  static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  static isPDFFile(mimeType: string): boolean {
    return mimeType === 'application/pdf'
  }

  static isDocumentFile(mimeType: string): boolean {
    const documentTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    return documentTypes.includes(mimeType)
  }

  static getSupportedFileTypes(): string[] {
    return [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }
}

// Schedule periodic cleanup
if (typeof window === 'undefined') {
  // Only run on server side
  setInterval(() => {
    FileStorageService.cleanupOldFiles()
  }, 60 * 60 * 1000) // Run every hour
}
