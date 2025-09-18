const fetch = require('node-fetch');

async function testBacktestingAPI() {
    const url = 'http://localhost:3000/api/qlib-backtesting';
    const payload = {
        strategy_name: 'momentum',
        symbols: ['AAPL', 'MSFT'],
        start_date: '2023-01-01',
        end_date: '2023-02-28',
        parameters: {
            initial_capital: 100000,
            position_size: 0.1,
            commission: 0.001
        }
    };

    try {
        console.log('Testing backtesting API...');
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const result = await response.json();
        console.log('Response body:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n✅ Backtesting API test PASSED!');
            console.log(`Strategy: ${result.data.strategy_name}`);
            console.log(`Total Trades: ${result.data.performance.total_trades}`);
            console.log(`Win Rate: ${(result.data.performance.win_rate * 100).toFixed(2)}%`);
            console.log(`Total Return: ${(result.data.performance.total_return * 100).toFixed(2)}%`);
            console.log(`Sharpe Ratio: ${result.data.performance.sharpe_ratio.toFixed(2)}`);
        } else {
            console.log('\n❌ Backtesting API test FAILED!');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

// Run the test
testBacktestingAPI();
