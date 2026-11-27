import { Router } from 'express'

import {
  listPublicFlyers,
  listAdminFlyers,
  createFlyer,
  updateFlyer,
  deleteFlyer,
} from '../controllers/speaker-flyer.controller.js'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'
import validate from '../middleware/validate.middleware.js'

const router = Router()

// -----------------------------------------------------
// 1. Public Routes
// -----------------------------------------------------

router.get(
  '/',
  listPublicFlyers,
)

// -----------------------------------------------------
// 2. Admin Routes
// -----------------------------------------------------

router.get(
  '/admin',
  authenticateAdmin,
  listAdminFlyers,
)

router.post(
  '/admin',
  authenticateAdmin,
  validate({
    body: {
      media_id: {
        required: true,
        type: 'string',
      },
    },
  }),
  createFlyer,
)

router.patch(
  '/admin/:id',
  authenticateAdmin,
  validate({
    params: {
      id: {
        required: true,
        type: 'string',
      },
    },
    body: {
      is_active: {
        required: true,
        type: 'boolean',
      },
    },
  }),
  updateFlyer,
)

router.delete(
  '/admin/:id',
  authenticateAdmin,
  validate({
    params: {
      id: {
        required: true,
        type: 'string',
      },
    },
  }),
  deleteFlyer,
)

export default router
