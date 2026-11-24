import { Router } from 'express'

import {
  listThemes,
  getThemeDetail,
  createThemeHandler,
  updateThemeHandler,
} from '../controllers/admin-theme.controller.js'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'
import validate from '../middleware/validate.middleware.js'

const router = Router()

function setThemeType(type) {
  return (req, res, next) => {
    req.params.type = type
    next()
  }
}

const annualCreateSchema = {
  body: {
    year: { required: true, type: 'number' },
    title: { required: true, type: 'string', maxLength: 200 },
    description: { type: 'string' },
    bible_verse: { type: 'string', maxLength: 255 },
    status: { type: 'string' },
    scheduled_at: { type: 'string' },
  },
}

const monthlyCreateSchema = {
  body: {
    annual_theme_id: { required: true, type: 'string' },
    month: { required: true, type: 'number' },
    title: { required: true, type: 'string', maxLength: 200 },
    description: { type: 'string' },
    bible_verse: { type: 'string', maxLength: 255 },
    status: { type: 'string' },
    scheduled_at: { type: 'string' },
  },
}

const updateSchema = {
  body: {
    year: { type: 'number' },
    annual_theme_id: { type: 'string' },
    month: { type: 'number' },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string' },
    bible_verse: { type: 'string', maxLength: 255 },
    status: { type: 'string' },
    scheduled_at: { type: 'string' },
  },
}

router.use(authenticateAdmin)

// Annual themes
router.get(
  '/annual',
  setThemeType('annual'),
  listThemes,
)

router.get(
  '/annual/:id',
  setThemeType('annual'),
  getThemeDetail,
)

router.post(
  '/annual',
  setThemeType('annual'),
  validate(annualCreateSchema),
  createThemeHandler,
)

router.patch(
  '/annual/:id',
  setThemeType('annual'),
  validate(updateSchema),
  updateThemeHandler,
)

// Monthly themes
router.get(
  '/monthly',
  setThemeType('monthly'),
  listThemes,
)

router.get(
  '/monthly/:id',
  setThemeType('monthly'),
  getThemeDetail,
)

router.post(
  '/monthly',
  setThemeType('monthly'),
  validate(monthlyCreateSchema),
  createThemeHandler,
)

router.patch(
  '/monthly/:id',
  setThemeType('monthly'),
  validate(updateSchema),
  updateThemeHandler,
)

export default router
