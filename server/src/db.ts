import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({
  path: 'server/.env',
})

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})