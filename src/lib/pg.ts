import { Pool } from 'pg'

// Build connection from DATABASE_URL or individual DB_* env vars
const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SSL,
  DB_SSL_MODE,
} = process.env

function buildConnectionString(): string | undefined {
  if (DATABASE_URL) return DATABASE_URL
  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const port = DB_PORT || '5432'
    const sslMode = (DB_SSL_MODE || (DB_SSL ? 'require' : 'disable')) as string
    return `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}?sslmode=${sslMode}`
  }
  return undefined
}

const connectionString = buildConnectionString()
if (!connectionString) {
  // Soft warn at import time to avoid crashing edge runtimes; callers should handle missing config
  console.warn('PostgreSQL connection string is not configured. Set DATABASE_URL or DB_* env vars.')
}

export const pool = new Pool({
  connectionString: connectionString,
  // Azure PostgreSQL requires SSL
  ssl: (() => {
    // If the URL has sslmode=require, node-postgres accepts ssl: true
    // Avoid rejecting unauthorized in managed services
    const requireSsl = (connectionString && /sslmode=require/i.test(connectionString)) || DB_SSL === 'true'
    return requireSsl ? { rejectUnauthorized: false } : false
  })(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

export async function query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  return pool.query(text, params)
}

export async function withTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    throw err
  } finally {
    client.release()
  }
}
