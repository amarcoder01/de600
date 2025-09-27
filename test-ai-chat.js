const fetch = require('node-fetch');

async function testAIChat() {
    try {
        console.log('🔍 Testing enhanced AI chat with real-time data...');
        
        const response = await fetch('http://localhost:3000/api/chat/expert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: 'Should I buy DVLT stock for high profit? Give me one line answer with real current price data.'
                    }
                ],
                context: {
                    symbol: 'DVLT'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('\n✅ AI Response:');
        console.log(data.response);
        
        if (data.dataUsed) {
            console.log('\n📊 Real-Time Data Used:');
            console.log(`Symbol: ${data.dataUsed.symbol}`);
            console.log(`Price: $${data.dataUsed.price}`);
            console.log(`Change: $${data.dataUsed.change} (${data.dataUsed.changePercent?.toFixed(2)}%)`);
            console.log(`Volume: ${data.dataUsed.volume?.toLocaleString()}`);
            console.log(`Market Cap: $${(data.dataUsed.marketCap / 1e9).toFixed(1)}B`);
            console.log(`Timestamp: ${data.dataUsed.timestamp}`);
        } else {
            console.log('\n❌ No real-time data was used');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAIChat();
