import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from './config/env.js'
import csrfProtection from './middleware/csrf.middleware.js'
import notFoundHandler from './middleware/notFound.middleware.js'
import errorHandler from './middleware/error.middleware.js'

const app = express()

// -----------------------------------------------------
// 1. Security Headers
// -----------------------------------------------------

app.use(helmet())

// -----------------------------------------------------
// 2. CORS Configuration
// -----------------------------------------------------

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

// -----------------------------------------------------
// 3. Request Body Parser
// -----------------------------------------------------

app.use(express.json({ limit: '1mb' }))

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  }),
)

// -----------------------------------------------------
// 4. Cookie Parser
// -----------------------------------------------------

app.use(cookieParser())

// -----------------------------------------------------
// 5. CSRF / Origin Protection
// -----------------------------------------------------

app.use(csrfProtection)

// -----------------------------------------------------
// 6. Health Check
// -----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'JKI Home Church API is running',
    timestamp: new Date().toISOString(),
  })
})

// -----------------------------------------------------
// 7. Not Found Middleware
// -----------------------------------------------------

app.use(notFoundHandler)

// -----------------------------------------------------
// 8. Centralized Error Handler
// -----------------------------------------------------

app.use(errorHandler)

export default app
