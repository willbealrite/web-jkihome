import { Router } from 'express'

import {
  getCurrentThemesHandler,
} from '../controllers/public-theme.controller.js'

const router = Router()

router.get('/current', getCurrentThemesHandler)

export default router
