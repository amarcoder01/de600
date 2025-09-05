import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Function to execute Python script
function executePythonScript(command: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'yfinance_api.py')
    
    console.log(`🐍 Executing Python script: ${scriptPath} ${command} ${args.join(' ')}`)
    
    const pythonProcess = spawn('python', [scriptPath, command, ...args])
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      console.log(`🐍 Python stderr: ${data.toString()}`)
    })
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout)
          resolve(result)
        } catch (error) {
          console.error('❌ Error parsing Python output:', error)
          reject(new Error('Failed to parse Python script output'))
        }
      } else {
        console.error(`❌ Python script failed with code ${code}`)
        console.error('Python stderr:', stderr)
        reject(new Error(`Python script failed with code ${code}`))
      }
    })
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Error executing Python script:', error)
      reject(error)
    })
  })
}

export async function GET(request: NextRequest) {
  try {
    // Skip Python script execution during build time
    if (process.env.NODE_ENV === 'production' && !process.env.POLYGON_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Python dependencies not available in production build',
        error: 'yfinance module not installed'
      }, { status: 503 })
    }
    
    console.log('🧪 Testing yfinance integration via Python...')
    
    // Execute Python script to test yfinance
    const result = await executePythonScript('test', [])
    
    if (result.success) {
      console.log('✅ yfinance test successful:', result.data)
      
      return NextResponse.json({
        success: true,
        message: 'yfinance integration is working via Python',
        data: result.data,
        timestamp: new Date().toISOString()
      })
    } else {
      console.error('❌ yfinance test failed:', result)
      
      return NextResponse.json({
        success: false,
        message: 'yfinance integration test failed',
        error: result.message || 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ yfinance test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'yfinance integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
