import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

// Qlib API endpoints
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'status':
        return await getQlibStatus()
      case 'data-status':
        return await getDataStatus()
      case 'experiments':
        return await getExperiments()
      case 'config':
        return await getConfig()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Qlib API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const body = await request.json()

  try {
    switch (action) {
      case 'download-data':
        return await downloadData(body)
      case 'process-data':
        return await processData(body)
      case 'run-backtest':
        return await runBacktest(body)
      case 'compare-strategies':
        return await compareStrategies(body)
      case 'setup-dataset':
        return await setupDataset()
      case 'backup-data':
        return await backupData()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Qlib API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getQlibStatus() {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['qlib_config.py'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ 
          success: true, 
          status: 'Qlib initialized successfully',
          output: output.trim()
        }))
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Qlib initialization failed',
          output: output.trim()
        }))
      }
    })
  })
}

async function getDataStatus() {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['scripts/qlib_data_manager.py', '--status'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const status = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: status }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse status data',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to get data status',
          output: output.trim()
        }))
      }
    })
  })
}

async function downloadData(params: any) {
  const { symbols, start_date, end_date } = params

  return new Promise<Response>((resolve) => {
    const args = ['scripts/qlib_data_manager.py', '--download']
    if (symbols) args.push('--symbols', symbols.join(','))
    if (start_date) args.push('--start-date', start_date)
    if (end_date) args.push('--end-date', end_date)

    const pythonProcess = spawn('python', args)
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: result }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse download result',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to download data',
          output: output.trim()
        }))
      }
    })
  })
}

async function processData(params: any) {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['scripts/qlib_data_manager.py', '--process'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: result }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse process result',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to process data',
          output: output.trim()
        }))
      }
    })
  })
}

async function runBacktest(params: any) {
  const { strategy_name, symbols, start_date, end_date, parameters } = params

  return new Promise<Response>((resolve) => {
    const args = ['scripts/enhanced_backtesting_cli.py', 'backtest']
    args.push('--strategy', strategy_name)
    args.push('--symbols', symbols.join(','))
    args.push('--start-date', start_date)
    args.push('--end-date', end_date)
    
    if (parameters) {
      args.push('--parameters', JSON.stringify(parameters))
    }

    const pythonProcess = spawn('python', args)
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: result }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse enhanced backtest result',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to run enhanced backtest',
          output: output.trim()
        }))
      }
    })
  })
}

async function compareStrategies(params: any) {
  const { symbols, start_date, end_date } = params

  return new Promise<Response>((resolve) => {
    const args = ['scripts/enhanced_backtesting_cli.py', 'compare']
    args.push('--symbols', symbols.join(','))
    args.push('--start-date', start_date)
    args.push('--end-date', end_date)

    const pythonProcess = spawn('python', args)
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: result }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse enhanced comparison result',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to compare strategies with enhanced engine',
          output: output.trim()
        }))
      }
    })
  })
}

async function setupDataset() {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['scripts/qlib_data_manager.py', '--setup-dataset'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ 
          success: true, 
          message: 'Dataset setup completed successfully',
          output: output.trim()
        }))
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to setup dataset',
          output: output.trim()
        }))
      }
    })
  })
}

async function backupData() {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['scripts/qlib_data_manager.py', '--backup'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: result }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse backup result',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to backup data',
          output: output.trim()
        }))
      }
    })
  })
}

async function getExperiments() {
  return new Promise<Response>((resolve) => {
    const pythonProcess = spawn('python', ['scripts/qlib_backtesting.py', '--experiments'])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const experiments = JSON.parse(output.trim())
          resolve(NextResponse.json({ success: true, data: experiments }))
        } catch (e) {
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to parse experiments data',
            output: output.trim()
          }))
        }
      } else {
        resolve(NextResponse.json({ 
          success: false, 
          error: error || 'Failed to get experiments',
          output: output.trim()
        }))
      }
    })
  })
}

async function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'qlib_config.yaml')
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8')
      return NextResponse.json({ success: true, data: config })
    } else {
      return NextResponse.json({ success: false, error: 'Config file not found' })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to read config' })
  }
}
