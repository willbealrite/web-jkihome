import './config/env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

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

export default app
