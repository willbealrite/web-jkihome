import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from './config/env.js'

import csrfProtection from './middleware/csrf.middleware.js'
import notFoundHandler from './middleware/notFound.middleware.js'
import errorHandler from './middleware/error.middleware.js'

import adminAuthRoutes from './routes/admin-auth.routes.js'
import adminDashboardRoutes from './routes/admin-dashboard.routes.js'
import adminThemeRoutes from './routes/admin-theme.routes.js'
import adminDevotionalRoutes from './routes/admin-devotional.routes.js'
import adminMediaRoutes from './routes/media.routes.js'
import publicThemeRoutes from './routes/public-theme.routes.js'
import devotionalRoutes from './routes/devotional.routes.js'
import speakerFlyerRoutes from './routes/speaker-flyer.routes.js'

import {
  publicRouter as serviceScheduleRoutes,
  adminRouter as adminServiceScheduleRoutes,
} from './routes/service-schedule.routes.js'

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
// 7. Admin Authentication Routes
// -----------------------------------------------------

app.use('/api/v1/admin/auth', adminAuthRoutes)

// -----------------------------------------------------
// 7.1 Admin Dashboard Routes
// -----------------------------------------------------

app.use('/api/v1/admin/dashboard', adminDashboardRoutes)

// -----------------------------------------------------
// 7.2 Admin Theme Routes
// -----------------------------------------------------

app.use('/api/v1/admin/themes', adminThemeRoutes)

// -----------------------------------------------------
// 7.3 Admin Devotional Routes
// -----------------------------------------------------

app.use('/api/v1/admin/devotionals', adminDevotionalRoutes)

// -----------------------------------------------------
// 7.4 Admin Media Routes
// -----------------------------------------------------

app.use('/api/v1/admin/media', adminMediaRoutes)

// -----------------------------------------------------
// 7.5 Public Theme Routes
// -----------------------------------------------------

app.use('/api/v1/themes', publicThemeRoutes)

// -----------------------------------------------------
// 7.6 Public Devotional Routes
// -----------------------------------------------------

app.use('/api/v1/devotionals', devotionalRoutes)

// -----------------------------------------------------
// 7.7 Speaker Flyer Routes
// -----------------------------------------------------

app.use('/api/v1/speaker-flyers', speakerFlyerRoutes)

// -----------------------------------------------------
// 7.8 Public Service Schedule Routes
// -----------------------------------------------------

app.use('/api/v1/service-schedules', serviceScheduleRoutes)

// -----------------------------------------------------
// 7.9 Admin Service Schedule Routes
// -----------------------------------------------------

app.use('/api/v1/admin/service-schedules', adminServiceScheduleRoutes)

// -----------------------------------------------------
// 8. Not Found Middleware
// -----------------------------------------------------

app.use(notFoundHandler)

// -----------------------------------------------------
// 9. Centralized Error Handler
// -----------------------------------------------------

app.use(errorHandler)

export default app
