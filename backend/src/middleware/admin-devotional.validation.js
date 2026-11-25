import validate from './validate.middleware.js'


// -----------------------------------------------------
// 1. Admin Devotional List Validation
// GET /api/v1/admin/devotionals
// -----------------------------------------------------

export const adminDevotionalListValidation = validate(
  {
    query: {
      page: {
        type: 'string',
      },
      limit: {
        type: 'string',
      },
      status: {
        type: 'string',
      },
      from: {
        type: 'string',
      },
      to: {
        type: 'string',
      },
      monthly_theme_id: {
        type: 'string',
      },
      search: {
        type: 'string',
        maxLength: 200,
      },
    },
  },
  { statusCode: 422 },
)


// -----------------------------------------------------
// 2. Admin Devotional Detail Validation
// GET /api/v1/admin/devotionals/:id
// -----------------------------------------------------

export const adminDevotionalDetailValidation = validate(
  {
    params: {
      id: {
        type: 'string',
        required: true,
      },
    },
  },
  { statusCode: 422 },
)


// -----------------------------------------------------
// 3. Admin Devotional Create Validation
// POST /api/v1/admin/devotionals
// -----------------------------------------------------

export const adminDevotionalCreateValidation = validate(
  {
    body: {
      monthly_theme_id: {
        type: 'string',
      },
      title: {
        type: 'string',
        required: true,
        maxLength: 200,
      },
      date: {
        type: 'string',
        required: true,
      },
      bible_verse: {
        type: 'string',
        required: true,
        maxLength: 255,
      },
      content: {
        type: 'string',
        required: true,
      },
      reflection: {
        type: 'string',
      },
      prayer: {
        type: 'string',
      },
    },
  },
  { statusCode: 422 },
)


// -----------------------------------------------------
// 4. Admin Devotional Update Validation
// PATCH /api/v1/admin/devotionals/:id
// -----------------------------------------------------

export const adminDevotionalUpdateValidation = validate(
  {
    params: {
      id: {
        type: 'string',
        required: true,
      },
    },
    body: {
      monthly_theme_id: {
        type: 'string',
      },
      title: {
        type: 'string',
        maxLength: 200,
      },
      date: {
        type: 'string',
      },
      bible_verse: {
        type: 'string',
        maxLength: 255,
      },
      content: {
        type: 'string',
      },
      reflection: {
        type: 'string',
      },
      prayer: {
        type: 'string',
      },
      status: {
        type: 'string',
      },
      scheduled_at: {
        type: 'string',
      },
    },
  },
  { statusCode: 422 },
)
