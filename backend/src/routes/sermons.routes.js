// ==================================================
// Sermons Routes
// ==================================================

import { Router } from 'express'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

import {
  validateCreateSermon,
  validateDeleteSermon,
} from '../middleware/sermons.validation.js'

import {
  getPublicSermonsController,
  getAdminSermonsController,
  createSermonController,
  deleteSermonController,
} from '../controllers/sermons.controller.js'

// ==================================================
// PUBLIC ROUTER
// ==================================================

const publicRouter = Router()

publicRouter.get('/', getPublicSermonsController)

// ==================================================
// ADMIN ROUTER
// ==================================================

const adminRouter = Router()

adminRouter.use(authenticateAdmin)

adminRouter.get('/', getAdminSermonsController)

adminRouter.post(
  '/',
  validateCreateSermon,
  createSermonController,
)

adminRouter.delete(
  '/:id',
  validateDeleteSermon,
  deleteSermonController,
)

// ==================================================
// EXPORTS
// ==================================================

export { publicRouter, adminRouter }
