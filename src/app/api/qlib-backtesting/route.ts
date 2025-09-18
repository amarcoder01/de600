import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy_name, symbols, start_date, end_date, parameters } = body;

    // Validate required parameters
    if (!strategy_name || !symbols || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategy_name, symbols, start_date, end_date' },
        { status: 400 }
      );
    }

    // Prepare command line arguments for Polygon.io backtesting
    const scriptPath = path.join(process.cwd(), 'scripts', 'polygon_backtesting_cli.py');
    const args = [
      'backtest',
      '--strategy', strategy_name,
      '--symbols', Array.isArray(symbols) ? symbols.join(',') : symbols,
      '--start-date', start_date,
      '--end-date', end_date,
      '--parameters', JSON.stringify(parameters || {})
    ];

    console.log('Running Polygon.io backtesting with:', { strategy_name, symbols, start_date, end_date, parameters });
    console.log('Script path:', scriptPath);
    console.log('Command args:', args);

    // Execute the backtesting script
    const result = await new Promise((resolve, reject) => {
      // Use 'py' on Windows, 'python3' on Unix-like systems
      const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
      const child = spawn(pythonCommand, [scriptPath, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: process.cwd() + (process.platform === 'win32' ? ';' : ':') + (process.env.PYTHONPATH || '')
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Clean the stdout to handle NaN and Infinity values
            let cleanedStdout = stdout.trim();
            cleanedStdout = cleanedStdout.replace(/:\s*NaN/g, ': null');
            cleanedStdout = cleanedStdout.replace(/:\s*Infinity/g, ': null');
            cleanedStdout = cleanedStdout.replace(/:\s*-Infinity/g, ': null');
            
            const cliResult = JSON.parse(cleanedStdout);
            
            // Transform CLI result to match frontend expectations
            if (cliResult.success) {
              const transformedResult = {
                success: true,
                data: {
                  success: true,
                  experiment_id: cliResult.experiment_id || `polygon_backtest_${Date.now()}`,
                  strategy_name: cliResult.strategy_name,
                  symbols: cliResult.symbols,
                  start_date: start_date,
                  end_date: end_date,
                  data_source: cliResult.data_source || 'Polygon.io (5+ years historical data)',
                  parameters: cliResult.parameters || {
                    initial_capital: 100000,
                    commission: 0.001,
                    slippage: 0.0005,
                    position_size: 0.1,
                    max_positions: 10,
                    stop_loss: 0.05,
                    take_profit: 0.15,
                    rebalance_frequency: 'daily'
                  },
                  performance: {
                    total_trades: cliResult.performance?.total_trades || 0,
                    winning_trades: cliResult.performance?.winning_trades || 0,
                    losing_trades: cliResult.performance?.losing_trades || 0,
                    win_rate: cliResult.performance?.win_rate || 0,
                    total_pnl: cliResult.performance?.total_pnl || 0,
                    total_return: cliResult.performance?.total_return || 0,
                    avg_win: cliResult.performance?.avg_win || 0,
                    avg_loss: cliResult.performance?.avg_loss || 0,
                    profit_factor: cliResult.performance?.profit_factor || 0,
                    volatility: cliResult.performance?.volatility || 0,
                    sharpe_ratio: cliResult.performance?.sharpe_ratio || 0,
                    max_drawdown: cliResult.performance?.max_drawdown || 0,
                    avg_trade_duration: cliResult.performance?.avg_trade_duration || 0,
                    final_portfolio_value: cliResult.performance?.final_portfolio_value || 0,
                    initial_capital: cliResult.parameters?.initial_capital || 100000
                  },
                  reports: {
                    summary: cliResult.performance || {},
                    charts: cliResult.reports?.charts || {},
                    trades_analysis: cliResult.reports?.trades_analysis || {}
                  }
                }
              };
              resolve(transformedResult);
            } else {
              resolve({
                success: false,
                error: cliResult.error || 'Backtest failed'
              });
            }
          } catch (error) {
            console.error('JSON parse error:', error);
            console.error('stdout length:', stdout.length);
            console.error('stdout last 100 chars:', stdout.slice(-100));
            reject(new Error(`Failed to parse output: ${stdout}`));
          }
        } else {
          reject(new Error(`Script failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start script: ${error.message}`));
      });
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('QLib backtesting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'test') {
      // Test the Polygon.io data fetching
      const scriptPath = path.join(process.cwd(), 'scripts', 'polygon_backtesting_cli.py');
      
      const result = await new Promise((resolve, reject) => {
        // Use 'py' on Windows, 'python3' on Unix-like systems
        const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
        const child = spawn(pythonCommand, [scriptPath, 'test-data', '--symbols', 'AAPL,MSFT,GOOGL', '--start-date', '2023-01-01', '--end-date', '2023-12-31'], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            try {
              const testResult = JSON.parse(stdout);
              resolve(testResult);
            } catch (error) {
              resolve({ success: true, output: stdout });
            }
          } else {
            reject(new Error(`Test failed with code ${code}: ${stderr}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start test: ${error.message}`));
        });
      });

      return NextResponse.json(result);
    }

    if (action === 'summary') {
      // Get Polygon.io data summary
      const scriptPath = path.join(process.cwd(), 'scripts', 'polygon_backtesting_cli.py');
      
      const result = await new Promise((resolve, reject) => {
        // Use 'py' on Windows, 'python3' on Unix-like systems
        const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
        const child = spawn(pythonCommand, [scriptPath], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output: stdout });
          } else {
            reject(new Error(`Test failed with code ${code}: ${stderr}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start test: ${error.message}`));
        });
      });

      return NextResponse.json(result);
    }

    // Default: return available strategies and data info
    return NextResponse.json({
      available_strategies: ['momentum', 'mean_reversion'],
      data_source: 'Polygon.io (5+ years historical data)',
      supported_symbols: 'All US stocks, ETFs, and more available on Polygon.io',
      date_range: '2020-08-01 to current date (4+ years)',
      min_date: '2020-08-01',
      max_date: new Date().toISOString().split('T')[0],
      rate_limits: '5 requests per minute (Starter Plan)',
      data_quality: 'Split and dividend adjusted prices',
      features: [
        'Historical daily data',
        'Split and dividend adjusted prices',
        'Professional-grade market data',
        'Comprehensive technical indicators',
        'Real-time data (with subscription)'
      ]
    });

  } catch (error) {
    console.error('QLib backtesting GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
