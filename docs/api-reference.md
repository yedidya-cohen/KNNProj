# API Reference

Base URL: `http://localhost:8000`

All application endpoints are under `/api/v1` except the health check.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Admin endpoints require a token for a user whose `role` is `admin`.

## Health

### GET `/`

Returns backend health status.

```json
{
  "status": "ok"
}
```

## Auth Endpoints

### POST `/api/v1/auth/register`

Creates a student user.

Request body:

```json
{
  "username": "student1",
  "password": "secret123",
  "full_name": "Student One",
  "department": "computer_science"
}
```

Response: `UserResponse`.

### POST `/api/v1/auth/login`

Authenticates a user and returns a JWT.

Content type: `application/x-www-form-urlencoded`

Fields:

- `username`
- `password`

Response:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

### GET `/api/v1/auth/me`

Returns the authenticated user.

Requires authentication.

## Courses

### GET `/api/v1/courses`

Lists active courses.

Requires authentication.

Query parameters:

- `department` optional.
- `search` optional, matches course name or code.

### GET `/api/v1/courses/{course_id}`

Returns one active course.

Requires authentication.

### POST `/api/v1/courses`

Creates a course.

Requires admin.

Request body:

```json
{
  "code": "CS101",
  "name": "Introduction to Computer Science",
  "description": "Course description",
  "credits": 4.0,
  "semester_recommended": 1,
  "department": "computer_science",
  "is_active": true
}
```

### PUT `/api/v1/courses/{course_id}`

Updates a course.

Requires admin.

### DELETE `/api/v1/courses/{course_id}`

Soft deletes a course by setting `is_active=false`.

Requires admin.

## Student Grades

### GET `/api/v1/grades/my`

Returns the authenticated student's grades.

Requires student authentication.

### POST `/api/v1/grades/`

Adds or updates one student grade.

Requires student authentication.

Request body:

```json
{
  "course_id": 1,
  "grade": 88
}
```

### PUT `/api/v1/grades/{grade_id}`

Updates an owned grade.

Requires student authentication. The `course_id` cannot be changed for an existing grade.

### DELETE `/api/v1/grades/{grade_id}`

Deletes an owned grade.

Requires student authentication.

### POST `/api/v1/grades/bulk`

Upserts multiple grades.

Requires student authentication.

Request body:

```json
{
  "grades": [
    {
      "course_id": 1,
      "grade": 88
    },
    {
      "course_id": 2,
      "grade": 91
    }
  ]
}
```

## Predictions

### POST `/api/v1/predictions/predict`

Predicts a grade for one target course and saves the prediction.

Requires student authentication and at least 3 existing student grades.

Request body:

```json
{
  "course_id": 4,
  "k_optional": 5
}
```

Response:

```json
{
  "predicted_grade": 84.25,
  "confidence": "medium",
  "k_value": 5,
  "neighbors": [
    {
      "id": 12,
      "avg_grade": 86.4,
      "target_grade": 83,
      "distance": 4.91
    }
  ]
}
```

### GET `/api/v1/predictions/recommend-top?n=3`

Returns top course recommendations for the authenticated student.

Requires student authentication.

### GET `/api/v1/predictions/my-history`

Returns saved prediction history for the authenticated student.

Requires student authentication.

### GET `/api/v1/predictions/{prediction_id}`

Returns one owned prediction.

Requires student authentication.

## Admin

All admin endpoints require admin authentication.

### GET `/api/v1/admin/dashboard`

Returns:

- total users
- total predictions
- average historical grade
- most predicted courses

### GET `/api/v1/admin/users`

Returns safe user records without password hashes.

### GET `/api/v1/admin/historical-students`

Returns historical student summaries with grade count and average grade.

### POST `/api/v1/admin/historical-students`

Manually adds one historical student.

Request body:

```json
{
  "graduation_year": 2026,
  "department": "computer_science",
  "grades": [
    {
      "course_id": 1,
      "grade": 92
    }
  ]
}
```

### POST `/api/v1/admin/seed`

Runs the synthetic seed process without an interactive prompt.

This recreates the synthetic database and should be used carefully.

### GET `/api/v1/admin/model-stats`

Evaluates the KNN model and returns:

- `mae`
- `rmse`
- `sample_size`
- `runtime_ms`

### GET `/api/v1/admin/settings/{key}`

Reads one system setting.

### PUT `/api/v1/admin/settings/{key}`

Creates or updates one setting.

Request body:

```json
{
  "value": "5"
}
```

For `knn_k`, the value must be a positive integer.

## Common Errors

- `400`: invalid request, duplicate course code, invalid setting, not enough grades.
- `401`: missing or invalid authentication token.
- `403`: authenticated user does not have the required role.
- `404`: requested resource does not exist or does not belong to the current user.
