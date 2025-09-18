import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getStockData } from '@/lib/multi-source-api'

interface MLPredictionRequest {
  symbol: string
  command: 'train' | 'predict'
  period?: string
  use_ensemble?: boolean
}

interface MLPredictionResult {
  success: boolean
  prediction?: {
    current_price: number
    predicted_price: number
    change_percent: number
    individual_predictions: Record<string, number>
    model_weights: Record<string, number>
    confidence: number
  }
  training_info?: {
    models_trained: string[]
    data_points: number
    training_time: number
  }
  error?: string
  message?: string
}

// Cache for trained models (in production, use Redis or database)
const modelCache = new Map<string, { timestamp: number, trained: boolean }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const body: MLPredictionRequest = await request.json()
    const { symbol, command = 'predict', period = '2y', use_ensemble = true } = body

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: symbol'
      }, { status: 400 })
    }

    console.log(`🤖 ML Predictions API: ${command} for ${symbol}`)

    // Check if we have basic stock data first
    const stockData = await getStockData(symbol)
    if (!stockData) {
      return NextResponse.json({
        success: false,
        error: `No data found for symbol: ${symbol}`
      }, { status: 404 })
    }

    // For prediction, check if model is already trained and recent
    const cacheKey = `${symbol}_${period}`
    const cached = modelCache.get(cacheKey)
    const needsTraining = !cached || 
                         !cached.trained || 
                         (Date.now() - cached.timestamp) > CACHE_DURATION

    let finalCommand = command
    if (command === 'predict' && needsTraining) {
      console.log(`🔄 Model for ${symbol} needs training...`)
      finalCommand = 'train'
    }

    // Execute Python ML engine
    const result = await executePythonMLEngine(symbol, finalCommand, period)

    if (result.success) {
      // Update cache
      modelCache.set(cacheKey, {
        timestamp: Date.now(),
        trained: true
      })

      // If we trained but user wanted prediction, now make prediction
      if (finalCommand === 'train' && command === 'predict') {
        console.log(`🎯 Making prediction after training...`)
        const predictionResult = await executePythonMLEngine(symbol, 'predict', period)
        
        if (predictionResult.success) {
          return NextResponse.json({
            success: true,
            prediction: predictionResult.prediction,
            training_completed: true,
            message: 'Model trained and prediction generated successfully'
          })
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ ML Predictions API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing symbol parameter'
      }, { status: 400 })
    }

    // Get model status
    const cacheKey = `${symbol}_2y`
    const cached = modelCache.get(cacheKey)
    const isModelTrained = cached && cached.trained && (Date.now() - cached.timestamp) < CACHE_DURATION

    // Check Python dependencies
    const pythonStatus = await checkPythonDependencies()

    return NextResponse.json({
      success: true,
      status: {
        symbol,
        model_trained: isModelTrained,
        model_age_hours: cached ? Math.round((Date.now() - cached.timestamp) / (1000 * 60 * 60)) : null,
        python_available: pythonStatus.available,
        tensorflow_available: pythonStatus.tensorflow,
        dependencies: pythonStatus.dependencies,
        supported_models: [
          'Random Forest',
          'Gradient Boosting',
          'XGBoost',
          'LightGBM',
          ...(pythonStatus.tensorflow ? ['LSTM Neural Network'] : [])
        ]
      }
    })

  } catch (error) {
    console.error('❌ ML Status API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

async function executePythonMLEngine(symbol: string, command: string, period: string): Promise<MLPredictionResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'ml_prediction_engine.py')
    
    // Create temp file for output
    const tempFile = path.join(process.cwd(), 'temp', `ml_result_${Date.now()}.json`)
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFile)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const args = [
      scriptPath,
      command,
      '--symbol', symbol,
      '--period', period,
      '--output', tempFile
    ]

    console.log(`🐍 Executing: python ${args.join(' ')}`)
    const startTime = Date.now()

    const pythonProcess = spawn('python', args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log(`🐍 STDOUT: ${data.toString().trim()}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      console.log(`🐍 STDERR: ${data.toString().trim()}`)
    })

    pythonProcess.on('close', (code) => {
      const executionTime = Date.now() - startTime
      console.log(`🐍 Python process finished with code ${code} in ${executionTime}ms`)

      try {
        if (code === 0 && fs.existsSync(tempFile)) {
          const result = JSON.parse(fs.readFileSync(tempFile, 'utf8'))
          
          // Clean up temp file
          fs.unlinkSync(tempFile)
          
          // Add execution info
          result.execution_time = executionTime
          result.timestamp = new Date().toISOString()
          
          resolve(result)
        } else {
          resolve({
            success: false,
            error: `Python execution failed (code: ${code}): ${stderr.trim()}`
          })
        }
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to parse Python output: ${error}`
        })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('🐍 Python process error:', error)
      resolve({
        success: false,
        error: `Failed to start Python process: ${error.message}`
      })
    })

    // Set timeout
    setTimeout(() => {
      if (!pythonProcess.killed) {
        pythonProcess.kill()
        resolve({
          success: false,
          error: 'Python execution timeout (5 minutes)'
        })
      }
    }, 5 * 60 * 1000) // 5 minutes timeout
  })
}

async function checkPythonDependencies(): Promise<{
  available: boolean
  tensorflow: boolean
  dependencies: Record<string, boolean>
}> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', ['-c', `
import sys
import json
deps = {}
try:
    import numpy
    deps['numpy'] = True
except:
    deps['numpy'] = False

try:
    import pandas
    deps['pandas'] = True
except:
    deps['pandas'] = False

try:
    import sklearn
    deps['sklearn'] = True
except:
    deps['sklearn'] = False

try:
    import xgboost
    deps['xgboost'] = True
except:
    deps['xgboost'] = False

try:
    import lightgbm
    deps['lightgbm'] = True
except:
    deps['lightgbm'] = False

try:
    import tensorflow
    deps['tensorflow'] = True
except:
    deps['tensorflow'] = False

try:
    import yfinance
    deps['yfinance'] = True
except:
    deps['yfinance'] = False

print(json.dumps(deps))
`], { stdio: ['pipe', 'pipe', 'pipe'] })

    let output = ''
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.on('close', (code) => {
      try {
        if (code === 0 && output.trim()) {
          const deps = JSON.parse(output.trim())
          resolve({
            available: true,
            tensorflow: deps.tensorflow || false,
            dependencies: deps
          })
        } else {
          resolve({
            available: false,
            tensorflow: false,
            dependencies: {}
          })
        }
      } catch {
        resolve({
          available: false,
          tensorflow: false,
          dependencies: {}
        })
      }
    })

    pythonProcess.on('error', () => {
      resolve({
        available: false,
        tensorflow: false,
        dependencies: {}
      })
    })
  })
}
