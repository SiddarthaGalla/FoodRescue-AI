# API Contract — Auth + Donations (v1)

> DRAFT for review. Both parties agree on this file BEFORE implementing. Frontend codes against it; backend implements it exactly.
> Base URL: `http://localhost:8000/api/v1` (frontend uses `VITE_API_BASE_URL`).

## Conventions

- All endpoints require `Authorization: Bearer <token>` (except none in this phase).
- Role values (from JWT): `admin` | `donor` | `ngo` | `volunteer`.
- JSON field names are `camelCase`. Timestamps are ISO 8601 UTC strings.
- Errors: FastAPI default → HTTP status + `{ "detail": "message" }` (frontend `api.ts` already parses `detail`).
- Works without MongoDB (mock fallback) for both sides during development.
- Returns `404` with `{ "detail": "Donation not found" }` for unknown ids.

## Auth

Two token types are accepted in the `Authorization: Bearer <token>` header; `GET /auth/me` returns the current user for either.

### Kinde Bearer tokens (primary)

- Kinde access tokens are **RS256 JWTs** verified against the tenant's JWKS endpoint: `https://{KINDE_DOMAIN}/.well-known/jwks`
- Enabled when the backend `KINDE_DOMAIN` env var is set; `KINDE_AUDIENCE` is optional and, if set, validated against the token's `aud` claim
- Relevant claims: `sub` (user id), `email`, `given_name`, `family_name`, `name`, `picture`, `permissions`
- App role derived from `permissions` array (first match among `["admin", "donor", "ngo", "volunteer"]`, case-insensitive); falls back to a `role` claim; default `"donor"`; note the `permissions` claim is only present when the Kinde token audience is configured

### Legacy dev auth endpoints (fallback, while `KINDE_DOMAIN` is empty)

Issued tokens are HS256 JWTs signed with `SECRET_KEY` (dev only — never in production).

#### POST `/auth/register` — create account
Request: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123", "phone": "+1234567890", "role": "donor", "profileImage": null }`
`role` ∈ `admin | donor | ngo | volunteer` (default `donor`). Response `201`:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "phone": "+1234567890", "role": "donor", "profileImage": "https://...", "isVerified": true, "createdAt": "...", "updatedAt": "..." } }
```
`400` if the email is already registered.

#### POST `/auth/login` — email/password login
Request: `{ "email": "jane@example.com", "password": "secret123", "rememberMe": false }`
Response: same `Token` shape as register. `401` on incorrect credentials.

#### POST `/auth/send-otp` — request a dev OTP
Request: `{ "target": "user@example.com" }` (`target` = email or phone).
Response: `{ "message": "...", "otp": "<code>", "target": "user@example.com", "expires_in_minutes": 5 }`
> Dev-only: the OTP is returned in the response body, and literal `123456` always verifies.

#### POST `/auth/verify-otp` — verify OTP, get or create user
Request: `{ "target": "user@example.com", "otp": "123456", "role": "donor", "name": "Jane" }`
Response: `Token` shape. `400` on invalid/expired OTP.

#### POST `/auth/google` — Google OAuth sign-in
Request: `{ "idToken": null, "email": "jane@example.com", "name": "Jane Doe", "profileImage": "https://...", "role": "donor" }`
Response: `Token` shape.

#### POST `/auth/logout` — logout (auth required)
Response: `{ "message": "Successfully logged out" }`

#### GET `/auth/me` — current user (auth required)
Returns the `user` object (`UserResponse` shape above) for **either token type**. `401` without a valid token.

## Donation object

```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "donor": { "id": "...", "name": "Spice Garden" },
  "title": "Paneer Butter Masala",
  "description": "20 kg of fresh cooked curry, sealed containers",
  "foodCategory": "cooked_meals",
  "quantity": 20,
  "unit": "kg",
  "expiryAt": "2026-08-06T18:00:00Z",
  "pickupDeadline": "2026-08-06T20:00:00Z",
  "pickupAddress": "12 MG Road, Bengaluru",
  "photos": ["https://..."],
  "status": "available",
  "createdAt": "2026-08-05T10:00:00Z"
}
```

**`status` lifecycle** (only these transitions allowed):

```
available → claimed → picked_up → completed
    └────── cancelled
```

Phase 2 adds volunteer assignment between `claimed` and `picked_up`.

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/donations` | donor | Create a listing |
| GET | `/donations` | all roles | Browse (filters below) |
| GET | `/donations/{id}` | all roles | Detail |
| GET | `/donations/mine` | donor | Own listings |
| PATCH | `/donations/{id}` | donor (owner) | Edit own listing |
| POST | `/donations/{id}/cancel` | donor (owner) | available → cancelled |
| POST | `/donations/{id}/claim` | ngo | available → claimed |
| POST | `/donations/{id}/status` | donor/ngo/volunteer | Pickup/complete in phase 2 |

### POST `/donations` — create

Request body (all `camelCase`):

```json
{
  "title": "Paneer Butter Masala",
  "description": "20 kg of fresh cooked curry, sealed containers",
  "foodCategory": "cooked_meals",
  "quantity": 20,
  "unit": "kg",
  "expiryAt": "2026-08-06T18:00:00Z",
  "pickupDeadline": "2026-08-06T20:00:00Z",
  "pickupAddress": "12 MG Road, Bengaluru",
  "photos": []
}
```

- Required: `title`, `quantity` (> 0), `expiryAt`, `pickupDeadline`, `pickupAddress`.
- `foodCategory` enum: `cooked_meals | raw_produce | bakery | packaged | dairy | other`.
- `unit` enum: `kg | g | liters | meals | packets | other`.
- Response: `201` + Donation object. Status starts `available`.

### GET `/donations` — browse

Query params (all optional): `status`, `foodCategory`, `search` (title/description contains), `donorId`, `page` (default 1), `pageSize` (default 20, max 50).

Response:

```json
{
  "items": [ "Donation objects..." ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

Newest first.

### GET `/donations/mine` — own listings

Same paginated response shape as browse, filtered to the authenticated donor.

### PATCH `/donations/{id}` — edit

Full or partial update of the create body fields. Cannot change `status` here (use dedicated endpoints). 403 if not the owner. Returns the updated Donation object.

### POST `/donations/{id}/cancel`

403 if not the owner. 409 `{ "detail": "Only available donations can be cancelled" }` if status ≠ available. Returns updated Donation.

### POST `/donations/{id}/claim`

403 unless role `ngo`. 409 if status ≠ available. Sets status `claimed` (first claim wins). Returns updated Donation.

## Phase 2 (NOT in this contract)

- Volunteer pickup/delivery flow (`picked_up`, assignment, `POST /donations/{id}/status`).
- Notifications / chat.
- Admin analytics endpoints.
