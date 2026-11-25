import { Router } from 'express'

import {
  getTodayDevotionalController,
  getPublicDevotionalsController,
  getPublicDevotionalBySlugController
} from '../controllers/devotional.controller.js'

import validate from '../middleware/validate.middleware.js'

const router = Router()

// ==================================================
// 1. GET TODAY DEVOTIONAL
// ==================================================

router.get(
  '/today',
  getTodayDevotionalController
)

// ==================================================
// 2. GET PUBLIC DEVOTIONAL LIST
// ==================================================

router.get(
  '/',
  validate({
    query: {
      page: {
        type: 'string'
      },
      limit: {
        type: 'string'
      },
      from: {
        type: 'string'
      },
      to: {
        type: 'string'
      }
    }
  }, { statusCode: 422 }),
  getPublicDevotionalsController
)

// ==================================================
// 3. GET PUBLIC DEVOTIONAL DETAIL
// ==================================================

router.get(
  '/:slug',
  validate({
    params: {
      slug: {
        required: true,
        type: 'string',
        maxLength: 220
      }
    }
  }, { statusCode: 422 }),
  getPublicDevotionalBySlugController
)

export default router
