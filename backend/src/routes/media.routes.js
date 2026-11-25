import { Router } from 'express'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

import {
  upload,
  validateImageSignature,
} from '../middleware/media-upload.middleware.js'

import {
  uploadMediaController,
} from '../controllers/media.controller.js'

// -----------------------------------------------------
// 1. Media Router
// -----------------------------------------------------

const router = Router()

// -----------------------------------------------------
// 2. Admin Media Upload
// -----------------------------------------------------

router.post(
  '/upload',
  authenticateAdmin,
  upload.single('image'),
  validateImageSignature,
  uploadMediaController,
)

// -----------------------------------------------------
// 3. Export Router
// -----------------------------------------------------

export default router
