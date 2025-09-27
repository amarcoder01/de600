import 'dotenv/config'
import { EmailService } from '../src/lib/email-service'

async function main() {
  const toArg = process.argv[2]
  const to = toArg || process.env.TEST_EMAIL_TO

  console.log('🔧 SendGrid env check:')
  console.log(`  SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✅ Present' : '❌ Missing'}`)
  console.log(`  SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL ? '✅ Present' : '❌ Missing'}`)

  if (!to) {
    console.error('❌ No recipient provided. Usage: ts-node scripts/send-test-email.ts <email>')
    process.exit(1)
  }

  console.log(`📧 Attempting to send test email to: ${to}`)

  const ok = await EmailService.sendEmail({
    to,
    subject: 'Test Email from Vidality (SendGrid)',
    text: 'This is a plain text test email sent via SendGrid from the Vidality platform.',
    html: '<p>This is a <strong>test email</strong> sent via SendGrid from the Vidality platform.</p>'
  })

  if (!ok) {
    console.error('❌ Test email failed. Please verify SENDGRID_API_KEY and SENDGRID_FROM_EMAIL and sender/domain verification in SendGrid.')
    process.exit(2)
  }

  console.log('✅ Test email sent successfully!')
}

main().catch((err) => {
  console.error('❌ Unexpected error running send-test-email:', err)
  process.exit(3)
})
