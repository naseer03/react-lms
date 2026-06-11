# LMS Platform — API Documentation

Base URL: `https://yourdomain.com/api`

Authentication: HttpOnly cookie (`accessToken`) set on login. Send `credentials: 'include'` with all requests.

---

## Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login with email/mobile + password |
| POST | `/auth/logout` | User | Logout and clear cookies |
| POST | `/auth/refresh` | Cookie | Rotate refresh token |
| GET | `/auth/me` | User | Get current user profile |
| PUT | `/auth/change-password` | User | Change password |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password/:token` | Public | Reset via email token |

### Login Request
```json
POST /auth/login
{ "identifier": "admin@lms.com", "password": "Admin@1234" }
```

### Login Response
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Super Admin", "email": "admin@lms.com", "role": "admin" },
    "accessToken": "...",
    "mustChangePassword": false
  }
}
```

---

## Students (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/students` | List students (paginated, searchable) |
| POST | `/admin/students` | Create student |
| GET | `/admin/students/stats` | Dashboard stats |
| GET | `/admin/students/:id` | Get student |
| PUT | `/admin/students/:id` | Update student |
| PATCH | `/admin/students/:id/block` | Block student |
| PATCH | `/admin/students/:id/unblock` | Unblock student |
| POST | `/admin/students/:id/reset-password` | Reset & email new password |
| DELETE | `/admin/students/:id` | Delete student |

### Query Params for GET /admin/students
```
?page=1&limit=10&search=alice&status=active&courseId=<id>
```

---

## Courses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/courses` | Admin | List all courses |
| POST | `/courses` | Admin | Create course |
| GET | `/courses/stats` | Admin | Course stats |
| GET | `/courses/published` | User | Published courses for students |
| GET | `/courses/:id?modules=true` | User | Get course (with modules if modules=true) |
| PUT | `/courses/:id` | Admin | Update course |
| DELETE | `/courses/:id` | Admin | Delete course |
| POST | `/courses/:id/thumbnail` | Admin | Upload thumbnail (multipart) |
| POST | `/courses/:id/modules` | Admin | Add module |
| PUT | `/courses/modules/:moduleId` | Admin | Update module |
| DELETE | `/courses/modules/:moduleId` | Admin | Delete module |
| POST | `/courses/:id/modules/reorder` | Admin | Reorder modules |
| POST | `/courses/:courseId/modules/:moduleId/lessons` | Admin | Add lesson |
| PUT | `/courses/lessons/:lessonId` | Admin | Update lesson |
| DELETE | `/courses/lessons/:lessonId` | Admin | Delete lesson |
| POST | `/courses/lessons/:lessonId/pdf` | Admin | Upload PDF (multipart) |

---

## Videos

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/videos/upload` | Admin | Upload video (multipart, up to 2GB) |
| GET | `/videos/:videoId/status` | Admin | Check HLS processing status |
| GET | `/videos/stream-token/:lessonId` | User | Get signed stream token |
| GET | `/videos/stream/:videoId/*?token=...` | Token | Stream HLS manifest/segments |
| POST | `/videos/progress/:courseId/:lessonId` | User | Save watch progress |
| GET | `/videos/progress/lesson/:lessonId` | User | Get lesson progress |
| GET | `/videos/progress/course/:courseId` | User | Get course progress |

---

## Tests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/tests` | Admin | List tests |
| POST | `/tests` | Admin | Create test |
| GET | `/tests/stats` | Admin | Test statistics |
| GET | `/tests/:id?questions=true` | User | Get test (with questions) |
| PUT | `/tests/:id` | Admin | Update test |
| DELETE | `/tests/:id` | Admin | Delete test |
| PATCH | `/tests/:id/publish` | Admin | Publish test |
| POST | `/tests/:testId/questions` | Admin | Add question |
| PUT | `/tests/questions/:questionId` | Admin | Update question |
| DELETE | `/tests/questions/:questionId` | Admin | Delete question |
| POST | `/tests/:testId/questions/reorder` | Admin | Reorder questions |
| POST | `/tests/:testId/attempt/start` | Student | Start attempt |
| POST | `/tests/attempt/:attemptId/save` | Student | Auto-save draft |
| POST | `/tests/attempt/:attemptId/submit` | Student | Submit answers |
| GET | `/tests/attempt/:attemptId/result` | User | Get result |
| GET | `/tests/:testId/my-attempts` | Student | My attempt history |
| GET | `/tests/:testId/attempts` | Admin | All attempts for test |

---

## Coding

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/coding/run` | User | Run against visible test cases |
| POST | `/coding/submit` | User | Submit against all test cases |
| POST | `/coding/custom` | User | Run with custom stdin input |
| GET | `/coding/history/:questionId` | User | Submission history |

### Run/Submit Request
```json
{
  "questionId": "...",
  "language": "python",
  "code": "n = int(input())\nprint(n * 2)",
  "attemptId": "..."  // for submit only
}
```

---

## Certificates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/certificates/verify/:id` | Public | Verify certificate authenticity |
| GET | `/certificates` | Admin | List all certificates |
| POST | `/certificates/generate` | Admin | Generate single certificate |
| POST | `/certificates/batch/:courseId` | Admin | Batch generate for course |
| GET | `/certificates/stats` | Admin | Certificate stats |
| GET | `/certificates/my/list` | Student | My certificates |
| GET | `/certificates/:id` | User | Get certificate |
| GET | `/certificates/:id/download` | User | Download PDF |
| PATCH | `/certificates/:id/revoke` | Admin | Revoke certificate |

---

## Reports (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/students` | Student report data |
| GET | `/reports/courses` | Course report data |
| GET | `/reports/tests` | Test report data |
| GET | `/reports/certificates` | Certificate report data |
| GET | `/reports/export/pdf/:type` | Export PDF (type: students/courses/tests/certificates) |
| GET | `/reports/export/excel/:type` | Export Excel |

---

## Settings (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/settings` | Get all settings |
| PUT | `/settings` | Update settings |
| POST | `/settings/logo` | Upload institute logo |
| POST | `/settings/cert-background` | Upload certificate background |
| POST | `/settings/cert-signature` | Upload signature image |

---

## Backups (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/backups/logs` | View backup history |
| POST | `/backups/database` | Trigger manual DB backup |
| POST | `/backups/media` | Trigger manual media backup |

---

## Response Format

All responses follow this structure:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... },
  "errors": [ ... ]  // only on validation failures
}
```

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (not logged in / token expired) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate record) |
| 429 | Rate Limited |
| 500 | Internal Server Error |
