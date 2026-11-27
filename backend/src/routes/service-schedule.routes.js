import { Router } from 'express'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

import {
  validateCreateServiceSchedule,
  validateUpdateServiceSchedule,
  validateDeleteServiceSchedule,
  validateReorderServiceSchedules,
} from '../middleware/service-schedule.validation.js'

import {
  getPublicServiceSchedulesController,
  getAdminServiceSchedulesController,
  createServiceScheduleController,
  updateServiceScheduleController,
  deleteServiceScheduleController,
  reorderServiceSchedulesController,
} from '../controllers/service-schedule.controller.js'

// -----------------------------------------------------
// Public Router
// -----------------------------------------------------

const publicRouter = Router()

publicRouter.get('/', getPublicServiceSchedulesController)

// -----------------------------------------------------
// Admin Router
// -----------------------------------------------------

const adminRouter = Router()

adminRouter.use(authenticateAdmin)

adminRouter.get('/', getAdminServiceSchedulesController)

adminRouter.post(
  '/',
  validateCreateServiceSchedule,
  createServiceScheduleController,
)

adminRouter.patch(
  '/reorder',
  validateReorderServiceSchedules,
  reorderServiceSchedulesController,
)

adminRouter.patch(
  '/:id',
  validateUpdateServiceSchedule,
  updateServiceScheduleController,
)

adminRouter.delete(
  '/:id',
  validateDeleteServiceSchedule,
  deleteServiceScheduleController,
)

export { publicRouter, adminRouter }
