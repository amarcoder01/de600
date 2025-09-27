'use strict';
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const sgMail = require('@sendgrid/mail');

// Load env from .env.local first (Next.js convention), fallback to .env
try {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('🔑 Loaded environment from .env.local');
  } else {
    dotenv.config();
    console.log('🔑 Loaded environment from .env');
  }
} catch (e) {
  console.warn('⚠️ Could not load environment file:', e?.message || e);
}

function checkEnv() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  console.log('🔧 SendGrid env check:');
  console.log(`  SENDGRID_API_KEY: ${apiKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`  SENDGRID_FROM_EMAIL: ${from ? '✅ Present' : '❌ Missing'}`);
  if (!apiKey) throw new Error('SENDGRID_API_KEY is missing');
  if (!from) throw new Error('SENDGRID_FROM_EMAIL is missing');
  sgMail.setApiKey(apiKey);
  return { from };
}

async function main() {
  const to = process.argv[2] || process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error('❌ No recipient provided. Usage: node scripts/send-test-email.cjs <email>');
    process.exit(1);
  }

  const { from } = checkEnv();
  console.log(`📧 Attempting to send test email to: ${to}`);

  const msg = {
    to,
    from,
    subject: 'Test Email from Vidality (SendGrid)',
    text: 'This is a plain text test email sent via SendGrid from the Vidality platform.',
    html: '<p>This is a <strong>test email</strong> sent via SendGrid from the Vidality platform.</p>'
  };

  try {
    const [res] = await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
    console.log(`📊 SendGrid status: ${res?.statusCode}`);
  } catch (err) {
    console.error('❌ Test email failed.');
    if (err?.response) {
      console.error('Status:', err.response.status);
      console.error('Body:', err.response.body);
      console.error('Headers:', err.response.headers);
    } else {
      console.error(err);
    }
    process.exit(2);
  }
}

main();
