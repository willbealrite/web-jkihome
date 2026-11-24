import app from './app.js'
import pool from './config/database.js'
import { startThemePublisher } from './jobs/theme-publisher.job.js'

const PORT = Number(process.env.PORT) || 3000

async function startServer() {
  try {
    // Verify database connection before starting the server.
    await pool.query('SELECT 1')

    const server = app.listen(PORT, () => {
      console.log(`JKI Home Church API running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })

    // Start automatic theme publication.
    const stopThemePublisher = startThemePublisher()

    // Handle unexpected server errors.
    server.on('error', async (error) => {
      console.error('HTTP server error:', error.message)

      stopThemePublisher()
      await pool.end()

      process.exit(1)
    })

    // Graceful shutdown.
    let isShuttingDown = false

    const shutdown = async (signal) => {
      if (isShuttingDown) return

      isShuttingDown = true

      console.log(`${signal} received. Shutting down server...`)

      // Stop the scheduler before closing database connections.
      stopThemePublisher()

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
