#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up environment for Strategy Creator...\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
const envExists = fs.existsSync(envPath)

if (envExists) {
  console.log('✅ .env.local file already exists')
} else {
  console.log('📝 Creating .env.local file...')
  
  const envContent = `# Strategy Creator Environment Variables
# Replace with your actual API keys

# Polygon.io API Key (Required for real-time market data)
POLYGON_API_KEY=your_polygon_api_key_here
NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key_here

# OpenAI API Key (Required for GPT strategy generation)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Database URL (if using database features)
# DATABASE_URL=your_database_url_here

# Optional: NextAuth configuration
# NEXTAUTH_SECRET=your_nextauth_secret_here
# NEXTAUTH_URL=http://localhost:3000
`

  fs.writeFileSync(envPath, envContent)
  console.log('✅ Created .env.local file')
}

console.log('\n📋 Required API Keys:')
console.log('1. Polygon.io API Key: https://polygon.io/')
console.log('   - Sign up for free account')
console.log('   - Get API key from dashboard')
console.log('   - Replace "your_polygon_api_key_here" in .env.local')
console.log('')
console.log('2. OpenAI API Key: https://platform.openai.com/')
console.log('   - Sign up for OpenAI account')
console.log('   - Get API key from platform')
console.log('   - Replace "your_openai_api_key_here" in .env.local')
console.log('')
console.log('⚠️  IMPORTANT:')
console.log('- Never commit your .env.local file to version control')
console.log('- Keep your API keys secure')
console.log('- Update the keys in .env.local with your actual values')
console.log('')
console.log('🎯 Next Steps:')
console.log('1. Get your API keys from the services above')
console.log('2. Update .env.local with your actual keys')
console.log('3. Run: npm run dev')
console.log('4. Visit: http://localhost:3000/strategy-builder')
console.log('')
console.log('✨ Strategy Creator will be ready to use!')
