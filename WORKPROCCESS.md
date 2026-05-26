# Work Process: Authentication System

## Branch

This work was implemented on the `AuthSystem` branch, created from `DBModels` so the authentication layer uses the SQLAlchemy models already defined there.

## Goal

The authentication system lets students register, log in with a username and password, receive a JWT bearer token, and call authenticated endpoints such as `/api/v1/auth/me`. Admin-only dependencies are also available for future admin routes.

## Files Changed

### `backend/app/core/security.py`

This file owns low-level authentication primitives:

- `hash_password(plain)` hashes a plaintext password using `passlib[bcrypt]`.
- `verify_password(plain, hashed)` checks a plaintext password against a stored hash.
- `create_access_token(data)` copies the supplied JWT payload, adds an expiration claim, and signs it with `python-jose`.
- `decode_token(token)` verifies and decodes JWT tokens with the configured secret and algorithm.

JWT settings come from `backend/app/config.py`. The algorithm is `HS256`, and the default expiry is 1440 minutes, which is 24 hours.

### `backend/app/core/dependencies.py`

This file defines reusable FastAPI security dependencies:

- `oauth2_scheme` reads bearer tokens using FastAPI's OAuth2 password bearer helper.
- `get_current_user(token, db)` decodes the JWT, reads the `sub` claim as the username, loads the matching `User` from the database, and raises `401` when the token is invalid or the user no longer exists.
- `require_admin(user)` checks `user.role`. It returns the user when the role is `admin` and raises `403` otherwise.

### `backend/app/schemas/user.py`

This file defines the Pydantic schemas used by auth routes:

- `UserCreate`: request body for registration. Includes `username`, `password`, `full_name`, and optional `department`.
- `UserResponse`: safe user response shape. It exposes identity fields but never exposes `password_hash`.
- `LoginRequest`: username/password schema for JSON-style login use if needed later.
- `TokenResponse`: login response with `access_token` and `token_type`.

### `backend/app/services/auth_service.py`

This service contains the auth business logic:

- `register_user(db, user_data)` checks whether the username already exists. If it does, it raises `ValueError`. Otherwise it hashes the password, creates a student `User`, commits it, refreshes it, and returns the created user.
- `authenticate_user(db, username, password)` loads a user by username and verifies the password. It returns the `User` on success and `None` on failure.

### `backend/app/routers/auth.py`

This router exposes the API endpoints under `/api/v1/auth`:

- `POST /api/v1/auth/register`: accepts a `UserCreate` JSON body and creates a student user.
- `POST /api/v1/auth/login`: accepts form data fields `username` and `password`, authenticates the user, and returns a JWT bearer token.
- `GET /api/v1/auth/me`: requires a bearer token and returns the current user.

### `backend/app/main.py`

The auth router is registered with `app.include_router(auth.router)`, so the endpoints become part of the FastAPI application.

### `backend/app/config.py`

The default JWT expiration was changed from 60 minutes to 1440 minutes to meet the 24-hour requirement.

## Authentication Flow

1. A client registers with `POST /api/v1/auth/register`.
2. The router passes the request to `register_user`.
3. The service checks username uniqueness, hashes the password, stores the user with role `student`, and returns a safe `UserResponse`.
4. A client logs in with `POST /api/v1/auth/login` using form data.
5. The router calls `authenticate_user`.
6. If credentials are valid, `create_access_token({"sub": user.username})` creates a 24-hour JWT.
7. For protected routes, clients send `Authorization: Bearer <token>`.
8. `get_current_user` decodes the token, extracts `sub`, loads the user, and returns it to the route.
9. Admin routes can compose `require_admin` to reject non-admin users with `403`.

## Important Design Notes

- Password hashes are stored only in `User.password_hash`.
- API responses never return password hashes.
- JWT subject (`sub`) is the username because `username` is unique.
- The default registered user role is always `student`.
- Admin creation remains handled by the seed script, which creates `admin / admin123`.
- The router uses form login because FastAPI's OAuth2 password flow and the project requirement specify form fields.

