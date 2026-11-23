import dotenv from 'dotenv'
import pool from '../config/database.js'

dotenv.config()

async function testDatabaseConnection() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        NOW() AS server_time
    `)

    console.log('Database connection successful!')
    console.log('Database:', result.rows[0].database)
    console.log('User:', result.rows[0].user)
    console.log('Server time:', result.rows[0].server_time)
  } catch (error) {
    console.error('Database connection failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

testDatabaseConnection()
