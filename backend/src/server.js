import app from './app.js'
import pool from './config/database.js'

const PORT = Number(process.env.PORT) || 3000

async function startServer() {
  try {
    // Verify database connection before starting the server
    await pool.query('SELECT 1')

    const server = app.listen(PORT, () => {
      console.log(`JKI Home Church API running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })

    // Handle unexpected server errors
    server.on('error', async (error) => {
      console.error('HTTP server error:', error.message)
      await pool.end()
      process.exit(1)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down server...`)

      server.close(async () => {
        await pool.end()
        console.log('HTTP server and database connections closed.')
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('Failed to start server:', error.message)
    await pool.end()
    process.exit(1)
  }
}

startServer()
