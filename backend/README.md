# Backend — JKI Home Church Official Website

## 1. Project Overview

Backend merupakan REST API untuk JKI Home Church Official Website. Backend menyediakan layanan autentikasi Admin, pengelolaan konten gereja, publikasi konten, media management, dan data untuk Public Website serta Admin Dashboard.

Backend menggunakan Node.js, Express.js, dan PostgreSQL.

Repository: <https://github.com/willbealrite/web-jkihome>

Branch aktif: `main`

### Application Scope

### Public Website

- Home
- About Us & Church Information
- Services Schedule
- Daily Devotional
- Sermons
- Photo Gallery
- Announcements
- Contact
- Speaker Flyer Gallery

### Admin Dashboard

- Dashboard
- Annual Theme
- Monthly Theme
- Daily Devotional
- Services Schedule
- Sermons
- Photo Gallery
- Announcements
- Homepage Settings
- Church Information
- Church Documents
- Media Library
- Admin Activity Logs
- System Settings

> Speaker Management is not part of the project scope. Speakers are represented through church-published flyers and related content, not through a separate Speaker Management module.
> Admin Handover / administrator account transfer is not part of the project scope.
---

## 2. Technology Stack

- Node.js
- Express.js 5
- PostgreSQL 18
- `pg` / node-postgres
- JWT
- bcrypt
- express-rate-limit
- Helmet
- CORS
- cookie-parser
- dotenv
- Cloudinary
- Sharp
- Nodemon

---

## 3. Architecture

Backend architecture:

`Routes → Controllers → Services → PostgreSQL`

Responsibilities:

- Routes: API endpoint definitions, middleware, authentication and request validation.
- Controllers: request/response handling.
- Services: business logic, database operations and transactional workflows.
- Middleware: authentication, validation, security and error handling.
- Jobs: scheduled publishing and background lifecycle processing.
- SQL migrations: database schema, constraints, indexes and triggers.

---

## 4. Backend Structure

```text
backend/
├── sql/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── config/
    ├── controllers/
    ├── jobs/
    ├── middleware/
    ├── routes/
    ├── scripts/
    └── services/
```

---

## 5. Environment Configuration

Environment configuration is stored in `backend/.env`.

Required configuration includes:

- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`

Cloudinary configuration is required for media management.

Never commit `.env` or secret credentials.

---

## 6. Database & Migration Inventory

The repository contains database migrations numbered 001–018.

| Migration | Purpose |
| --- | --- |
| 001 | Foundation / database infrastructure |
| 002 | Admin account |
| 003 | Admin sessions and refresh tokens |
| 004 | Media Library |
| 005 | Annual Themes, Monthly Themes and Devotionals |
| 006 | Speaker-related schema |
| 007 | Services Schedule |
| 008 | Sermons |
| 009 | Photo Gallery |
| 010 | Announcements |
| 011 | Homepage Settings |
| 012 | Church Settings |
| 013 | Church Documents |
| 014 | Admin Activity Logs |
| 015 | Scheduler and gallery-related indexes / supporting schema |
| 016 | Daily Devotional date uniqueness |
| 017 | Speaker Flyer Gallery |
| 018 | Media deletion lifecycle |

Migration history should be preserved. Schema changes must be introduced through new migrations rather than modifying already-applied migrations without a deliberate migration strategy.

---

## 7. Implemented Backend Modules

### 7.1 Backend Foundation

Status: IMPLEMENTED

- Express application
- PostgreSQL connection pool
- Environment validation
- Health endpoint
- Centralized error handling
- Not-found handler
- Request validation middleware
- Helmet
- CORS
- Cookie parser
- Request body size limit
- CSRF / Origin protection
- Graceful shutdown

### 7.2 Admin Authentication & Session Security

Status: IMPLEMENTED

- Admin provisioning CLI
- Single Admin account constraint
- Login
- JWT access token
- Refresh token
- Refresh token rotation
- Refresh token reuse detection
- HttpOnly Secure refresh cookie
- Logout
- Admin `/me`
- Session listing
- Session revocation
- Password change
- Current password verification
- Password validation
- Session / refresh token invalidation after password change
- Authentication rate limiting
- Security activity logging

Admin account transfer / handover is explicitly out of scope.

### 7.3 Annual Themes & Monthly Themes

Status: IMPLEMENTED

Admin functionality:

- Listing
- Detail
- Create
- Update
- Status management

Public functionality:

- Current theme endpoint

Additional:

- Scheduled publishing
- Activity logging
- Database constraints and indexes

### 7.4 Daily Devotional

Status: IMPLEMENTED

Admin functionality:

- Listing
- Pagination
- Filtering
- Detail
- Create
- Update
- Auto slug generation
- Status management

Content lifecycle:

- DRAFT
- SCHEDULED
- PUBLISHED
- ARCHIVED

Public functionality:

- Public listing
- Detail by slug
- Today's devotional

Additional:

- Scheduled publishing
- Unique devotional date constraint
- Activity logging

### 7.5 Admin Dashboard

Status: IMPLEMENTED

Endpoint:

`GET /api/v1/admin/dashboard`

Dashboard data includes overview statistics and recent activity, with statistics for existing and planned content modules.

Dashboard statistics do not imply that all associated content management APIs have been implemented.

### 7.6 Media Library

Status: IMPLEMENTED — PRIMARY LIFECYCLE TESTED

Features:

- Media upload
- Cloudinary integration
- Image validation
- File signature validation
- Image decoding and re-encoding using Sharp
- File size restrictions
- Media listing
- Pagination
- Search
- Filters
- Sorting
- Media detail
- Media reference protection
- Media deletion lifecycle
- Deletion retry
- Background deletion processing
- Activity logging

### 7.7 Speaker Flyer Gallery

Status: IMPLEMENTED — LIFECYCLE TESTED

Public endpoint:

- `GET /api/v1/speaker-flyers`

Admin endpoints:

- `GET /api/v1/speaker-flyers/admin`
- `POST /api/v1/speaker-flyers/admin`
- `PATCH /api/v1/speaker-flyers/admin/:id`
- `DELETE /api/v1/speaker-flyers/admin/:id`

Features:

- Gallery listing
- Add gallery entry using Media Library media ID
- Activate / deactivate gallery item
- Delete gallery entry
- Public listing filters active entries
- Admin listing includes inactive entries
- Media reference protection
- Activity logging

Deleting a gallery entry does not delete its Media Library asset.

Implementation checkpoint: commit `66312ab`.

---

## 8. Modules with Database Foundation — API Implementation Pending

The database foundation for these modules already exists. They must not be treated as new database design projects.

### 8.1 Services Schedule

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 007

Planned API functionality:

- Admin listing
- Admin detail
- Create
- Update
- Status management
- Scheduled publishing
- Public listing
- Activity logging

The project uses the term Services Schedule.

Speaker Management is not included in scope.

### 8.2 Sermons

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 008

Planned functionality:

- Admin listing
- Admin detail
- Create
- Update
- Slug management
- YouTube video integration
- Status lifecycle
- Scheduled publishing
- Public listing
- Public detail
- Activity logging

### 8.3 Photo Gallery

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 009

Planned functionality:

- Gallery category management as required
- Album management
- Album listing
- Album detail
- Create
- Update
- Photo management
- Photo ordering
- Cover photo management
- Public album listing
- Public album detail
- Activity logging

### 8.4 Announcements

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 010

Planned functionality:

- Category management as required
- Admin listing
- Admin detail
- Create
- Update
- Image/media association
- Status lifecycle
- Scheduled publishing
- Public listing
- Public detail
- Activity logging

### 8.5 Homepage Settings

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 011

Planned functionality:

- Admin settings retrieval
- Admin settings update
- Homepage section visibility management
- Hero content management
- Hero media management
- Featured content management
- Public homepage configuration
- Activity logging

### 8.6 Church Information

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 012

Planned functionality:

- Admin settings retrieval
- Admin settings update
- Church information management
- History
- Vision
- Mission
- Core values
- Ministries
- Address and contact information
- Social media
- Public information endpoints
- Activity logging

### 8.7 Church Documents

Status: DATABASE IMPLEMENTED — API MANAGEMENT PENDING

Migration: 013

Planned functionality:

- Admin listing
- Admin detail
- Create
- Update
- Media association
- Document type management as required
- Status lifecycle
- Scheduled publishing
- Public documents listing
- Activity logging

### 8.8 Admin Activity Logs Query API

Status: LOGGING INFRASTRUCTURE IMPLEMENTED — QUERY API PENDING

Migration: 014

Activity logging is already integrated into several implemented modules.

Remaining functionality:

- Admin activity listing
- Pagination
- Filtering by module
- Filtering by action
- Filtering by date
- Filtering by Admin
- Query validation
- Testing

---

## 9. Scheduler

Status: IMPLEMENTED FOR THEMES & DEVOTIONALS

Current scheduled publishing supports:

- Annual Themes
- Monthly Themes
- Daily Devotional

Scheduler features:

- Automatic processing
- Scheduled interval
- Batch processing
- Transaction handling
- Concurrent job protection
- Activity logging

Scheduler extension is required when additional scheduled-publishing modules are implemented.

Potential extensions:

- Services Schedule
- Sermons
- Photo Gallery
- Announcements
- Church Documents

Existing scheduler must be extended, not rebuilt.

---

## 10. Testing Status

### Manual Testing Previously Performed

Manual tests have been performed during implementation, including:

- Authentication endpoints
- Admin session-related operations
- Devotional API checks
- Media upload
- Media lifecycle
- Speaker Flyer Gallery lifecycle

### Automated Testing

Status: AUTOMATED BACKEND TEST SUITE NOT YET ESTABLISHED / NOT VERIFIED

Remaining:

- Unit tests
- Service tests
- Route integration tests
- Database integration tests
- Scheduler tests
- Authentication edge cases
- Full backend integration testing

Testing status must be recorded separately from implementation status.

---

## 11. Security & Reliability Review

Security foundations already implemented include:

- Helmet
- CORS
- CSRF / Origin protection
- Secure refresh cookies
- JWT
- Refresh token rotation
- Refresh token reuse detection
- Authentication rate limiting
- Parameterized SQL
- Request validation
- Central error handling
- Image validation
- Image re-encoding
- Media lifecycle protection
- Database constraints

Remaining:

- Final security review
- Authorization coverage review
- Authentication edge cases
- Validation consistency
- Database integrity review
- Scheduler reliability review
- Error handling review
- Production configuration review

This is a review and validation task, not a rebuild of existing security infrastructure.

---

## 12. Backend Development Roadmap

### Main API Modules Remaining

1. Services Schedule
2. Sermons
3. Photo Gallery
4. Announcements
5. Homepage Settings
6. Church Information
7. Church Documents
8. Admin Activity Logs Query API

### Cross-Module Tasks

1. Extend scheduler for additional scheduled content.
2. Establish automated backend tests.
3. Perform full backend integration testing.
4. Complete security and reliability review.
5. Review API contracts where necessary for remaining modules.
6. Integrate frontend with backend.
7. Production deployment and verification.

---

## 13. Project Status Summary

### Implemented

- Backend Foundation
- Admin Authentication & Session Security
- Annual Themes
- Monthly Themes
- Daily Devotional
- Admin Dashboard
- Media Library
- Speaker Flyer Gallery

### Database Foundation Available — API Pending

- Services Schedule
- Sermons
- Photo Gallery
- Announcements
- Homepage Settings
- Church Information
- Church Documents
- Admin Activity Logs Query API

### Explicitly Out of Scope

- Speaker Management
- Admin Handover / account transfer

### Current Backend Checkpoint

Repository: `willbealrite/web-jkihome`

Branch: `main`

Checkpoint commit: `66312ab`

Checkpoint description:

`feat(backend): implement speaker flyer gallery API`

At this checkpoint, Speaker Flyer Gallery implementation has been committed and pushed. The working tree was clean after the push.

---

## 14. Handover Instructions for Future Development Sessions

Before implementing a new module:

1. Read this README in full.
2. Inspect the actual GitHub repository and current branch.
3. Verify the current code, migrations, routes, controllers, services, jobs and middleware.
4. Confirm the module's actual implementation status.
5. Do not reimplement modules marked IMPLEMENTED.
6. Distinguish existing implementation from incomplete testing.
7. Use existing database migrations and infrastructure whenever applicable.
8. Follow the established Routes → Controllers → Services architecture.
9. Preserve existing authentication, security, logging and validation conventions.
10. Update this README when a module or significant milestone is completed.

Do not assume that a module is incomplete merely because it appears on an old roadmap.

The repository and this README are the primary checkpoint references for continuing backend development.
