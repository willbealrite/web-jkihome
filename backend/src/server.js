import app from './app.js'
import pool from './config/database.js'
import { startThemePublisher } from './jobs/theme-publisher.job.js'
import { startMediaDeletionWorker } from './services/media-deletion.service.js'

const PORT = Number(process.env.PORT) || 3000

async function startServer() {
  let server
  let stopThemePublisher = () => {}
  let stopMediaDeletionWorker = () => {}
  let isShuttingDown = false

  async function shutdown(signal, exitCode = 0) {
    if (isShuttingDown) return

    isShuttingDown = true

    console.log(`${signal} received. Shutting down server...`)

    stopThemePublisher()
    stopMediaDeletionWorker()

    if (server) {
      server.close(async () => {
        try {
          await pool.end()
          console.log('HTTP server and database connections closed.')
          process.exit(exitCode)
        } catch (error) {
          console.error('Database shutdown error:', error.message)
          process.exit(1)
        }
      })
    } else {
      try {
        await pool.end()
      } catch (error) {
        console.error('Database shutdown error:', error.message)
        exitCode = 1
      }

      process.exit(exitCode)
    }
  }

  try {
    // ==================================================
    // 1. Verify Database Connection
    // ==================================================

    await pool.query('SELECT 1')

    // ==================================================
    // 2. Start HTTP Server
    // ==================================================

    server = app.listen(PORT, () => {
      console.log(`JKI Home Church API running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })

    // ==================================================
    // 3. Start Automatic Content Publisher
    // Annual Themes, Monthly Themes & Daily Devotionals
    // ==================================================

    stopThemePublisher = startThemePublisher()

    // ==================================================
    // 4. Start Media Deletion Worker
    // ==================================================

    stopMediaDeletionWorker = startMediaDeletionWorker()

    // ==================================================
    // 5. Handle HTTP Server Errors
    // ==================================================

    server.on('error', async (error) => {
      console.error('HTTP server error:', error.message)
      await shutdown('HTTP_SERVER_ERROR', 1)
    })

    // ==================================================
    // 6. Graceful Shutdown
    // ==================================================

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  } catch (error) {
    console.error('Failed to start server:', error.message)

    stopThemePublisher()
    stopMediaDeletionWorker()

    try {
      await pool.end()
    } catch (shutdownError) {
      console.error('Database shutdown error:', shutdownError.message)
    }

    process.exit(1)
  }
}

startServer()
