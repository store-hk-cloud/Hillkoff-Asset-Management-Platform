# Authentication Architecture

## Overview

Authentication uses Firebase Email/Password Authentication and two coordinated
sessions:

- The Firebase Web SDK session authenticates direct Firebase Storage requests.
- A Firebase Admin session cookie authenticates Next.js server routes, route
  handlers, and server components.

The server session cookie is `httpOnly`, `secure` in production, `sameSite=lax`,
and expires after five days by default. Firebase supports an expiry from five
minutes to fourteen days.

## Authorization source

The canonical role is stored in the Firebase custom claim `role`. The same role
is mirrored in `users/{uid}` for profile display and query use. Authentication
is denied when the claim and profile do not match.

Supported roles:

- `admin`
- `warehouse`
- `technician`
- `sales`
- `branch`
- `customer`
- `executive`

The user profile must also have `status: "active"`.

## Security boundaries

1. `src/proxy.ts` performs only an optimistic cookie-presence redirect.
2. `src/lib/auth/dal.ts` verifies the signed session cookie, revocation state,
   profile status, email, and role.
3. Route handlers repeat authorization near data access.
4. Firestore and Storage Rules enforce Firebase token claims for direct client
   SDK requests.
5. The Admin SDK bypasses Security Rules, so server repositories validate all
   accepted input and never expose unrestricted document writes.

Proxy is intentionally not the sole authorization layer.

## Login sequence

1. The client signs in with Firebase Email/Password.
2. The client requests a short-lived CSRF token.
3. The Firebase ID token and CSRF token are posted to `/api/auth/session`.
4. The server verifies token revocation, recent sign-in time, role, user
   profile, account status, and CSRF origin.
5. The server creates the secure Firebase session cookie.

## Protected routes

- `/dashboard`
- `/profile`

The route group layout calls `requireSession()`. API routes use
`getCurrentSession()` and return HTTP 401 rather than relying on a redirect.

## Role guards

`requireRole()` is the server authorization guard for route handlers and server
operations. `RoleGuard` is available for conditional server-rendered UI, but UI
visibility is never considered an authorization boundary.

## User administration

Active administrators manage accounts through `/users`. Creation, role changes,
scope changes, disabling, and password-reset requests are server-only
operations. Every access change revokes refresh tokens and writes an audit log.
See `docs/user-access-management.md`.

## Logout

Logout clears both the Firebase Web SDK session and the server session cookie.
Use Firebase refresh-token revocation for suspected credential theft or forced
global sign-out.

## Production checklist

- Enable Email/Password in Firebase Authentication.
- Configure authorized domains for production and preview environments.
- Store Admin SDK credentials only in Vercel encrypted environment variables,
  or use workload identity where available.
- Deploy Firestore and Storage Rules before enabling users.
- Configure App Check before exposing direct Firebase client operations.
- Enable MFA for administrators when Identity Platform is available.
- Monitor failed login, disabled account, role mismatch, and session failures.
- Rotate service-account credentials and test session revocation.
