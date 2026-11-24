import { Router } from 'express'

import { getDashboard } from '../controllers/admin-dashboard.controller.js'
import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

const router = Router()

router.get('/', authenticateAdmin, getDashboard)

export default router
