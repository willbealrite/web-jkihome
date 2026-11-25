import { Router } from 'express'

import {
  getAdminDevotionalsController,
  getAdminDevotionalByIdController,
  createAdminDevotionalController,
  updateAdminDevotionalController
} from '../controllers/admin-devotional.controller.js'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

import {
  adminDevotionalListValidation,
  adminDevotionalDetailValidation,
  adminDevotionalCreateValidation,
  adminDevotionalUpdateValidation
} from '../middleware/admin-devotional.validation.js'

const router = Router()

// ==================================================
// 1. Admin Authentication
// Seluruh endpoint membutuhkan autentikasi Admin
// ==================================================

router.use(authenticateAdmin)

// ==================================================
// 2. Admin Devotional List
// GET /api/v1/admin/devotionals
// ==================================================

router.get(
  '/',
  adminDevotionalListValidation,
  getAdminDevotionalsController
)

// ==================================================
// 3. Admin Devotional Detail
// GET /api/v1/admin/devotionals/:id
// ==================================================

router.get(
  '/:id',
  adminDevotionalDetailValidation,
  getAdminDevotionalByIdController
)

// ==================================================
// 4. Admin Devotional Create
// POST /api/v1/admin/devotionals
// ==================================================

router.post(
  '/',
  adminDevotionalCreateValidation,
  createAdminDevotionalController
)

// ==================================================
// 5. Admin Devotional Update
// PATCH /api/v1/admin/devotionals/:id
// ==================================================

router.patch(
  '/:id',
  adminDevotionalUpdateValidation,
  updateAdminDevotionalController
)

export default router
