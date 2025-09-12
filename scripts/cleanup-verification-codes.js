/**
 * Cleanup Expired Verification Codes Script
 * Removes expired email verification codes from the database
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupExpiredCodes() {
  try {
    console.log('🧹 Starting cleanup of expired verification codes...')
    
    // Delete expired verification codes
    const result = await prisma.emailVerificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log(`✅ Cleaned up ${result.count} expired verification codes`)
    
    // Also clean up used codes older than 24 hours
    const usedResult = await prisma.emailVerificationCode.deleteMany({
      where: {
        isUsed: true,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    })
    
    console.log(`✅ Cleaned up ${usedResult.count} old used verification codes`)
    
  } catch (error) {
    console.error('❌ Error cleaning up verification codes:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupExpiredCodes()
}

module.exports = { cleanupExpiredCodes }
