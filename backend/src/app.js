import './config/env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import notFoundHandler from './middleware/notFound.middleware.js'
import errorHandler from './middleware/error.middleware.js'

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
)

// Request body parser
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'JKI Home Church API is running',
    timestamp: new Date().toISOString(),
  })
})

// Not Found middleware
app.use(notFoundHandler)

// Centralized Error Handling middleware
app.use(errorHandler)

export default app
