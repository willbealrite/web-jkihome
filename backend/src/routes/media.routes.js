import { Router } from 'express'

import { authenticateAdmin } from '../middleware/admin-auth.middleware.js'

import {
  upload,
  validateImageSignature,
} from '../middleware/media-upload.middleware.js'

import {
  validateMediaListingQuery,
} from '../middleware/media-listing.validation.js'

import {
  uploadMediaController,
  getMediaListController,
  getMediaDetailController,
  requestMediaDeletionController,
  retryMediaDeletionController,
} from '../controllers/media.controller.js'

// -----------------------------------------------------
// 1. Media Router
// -----------------------------------------------------

const router = Router()

// -----------------------------------------------------
// 2. Admin Media Listing
// -----------------------------------------------------

router.get(
  '/',
  authenticateAdmin,
  validateMediaListingQuery,
  getMediaListController,
)

// -----------------------------------------------------
// 3. Admin Media Upload
// -----------------------------------------------------

router.post(
  '/upload',
  authenticateAdmin,
  upload.single('image'),
  validateImageSignature,
  uploadMediaController,
)

// -----------------------------------------------------
// 4. Admin Media Manual Retry
// -----------------------------------------------------

router.post(
  '/:id/retry-deletion',
  authenticateAdmin,
  retryMediaDeletionController,
)

// -----------------------------------------------------
// 5. Admin Media Detail
// -----------------------------------------------------

router.get(
  '/:id',
  authenticateAdmin,
  getMediaDetailController,
)

// -----------------------------------------------------
// 6. Admin Media Deletion Request
// -----------------------------------------------------

router.delete(
  '/:id',
  authenticateAdmin,
  requestMediaDeletionController,
)

// -----------------------------------------------------
// 7. Export Router
// -----------------------------------------------------

export default router
