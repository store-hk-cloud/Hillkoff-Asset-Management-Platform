# Routing

## Route groups

- `(auth)` contains `/login`.
- `(dashboard)` protects `/dashboard` and `/profile` through its server layout.
- Asset routes provide list, create, detail, edit, and history tabs.
- `api` contains health, authentication session, logout, CSRF, and profile
  route handlers.

Route groups do not change public URLs.

## Layout hierarchy

```text
Root layout
├── Auth route layout
└── Protected dashboard route layout
```

The root layout owns metadata, viewport configuration, global styles, and
application-wide providers. The dashboard route layout verifies a signed
Firebase session and active user profile before rendering protected content.

## Request proxy

Next.js 16 uses `src/proxy.ts` as the request boundary. Proxy performs only
fast cookie-presence redirects for protected pages. Signed session validation,
revocation checks, profile status, and authorization are repeated in the
data-access layer and route handlers.

## Routes

| Route                              | Access                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| `/`                                | Redirects according to verified session                |
| `/login`                           | Public; verified sessions redirect to dashboard        |
| `/dashboard`                       | Authenticated                                          |
| `/profile`                         | Authenticated                                          |
| `/offline`                         | Public PWA offline fallback                            |
| `/users`                           | Administrator user list                                |
| `/users/new`                       | Administrator account provisioning                     |
| `/users/{id}`                      | Administrator access management                        |
| `/api/users`                       | Admin-only list/create                                 |
| `/api/users/{id}`                  | Admin-only detail/update                               |
| `/api/users/{id}/password-reset`   | Admin-only resend of the 72-hour password invitation   |
| `/set-password`                    | Public one-time employee invitation landing page       |
| `/api/auth/invitations/redeem`     | Exchanges an invitation for a fresh Firebase reset URL |
| `/assets`                          | Authenticated and scope-filtered                       |
| `/assets/new`                      | Admin or warehouse                                     |
| `/assets/{id}`                     | Authenticated and scope-filtered                       |
| `/assets/{id}/edit`                | Admin or warehouse; active assets only                 |
| `/warehouse`                       | Warehouse operation menu                               |
| `/warehouse/receive`               | Admin or warehouse                                     |
| `/warehouse/transfer`              | Admin or warehouse                                     |
| `/warehouse/sale`                  | Admin, warehouse, or sales                             |
| `/warehouse/movements`             | Admin, warehouse, executive, or scoped branch          |
| `/installations`                   | Admin, sales, executive, assigned technician, customer |
| `/installations/schedule`          | Admin or sales                                         |
| `/installations/{id}`              | Role and installation scoped                           |
| `/api/installations`               | Scoped queue GET; admin/sales schedule POST            |
| `/api/installations/{id}`          | Scoped installation detail                             |
| `/api/installations/{id}/start`    | Admin or assigned technician                           |
| `/api/installations/{id}/complete` | Admin or assigned technician                           |
| `/repairs`                         | Role-scoped repair ticket list                         |
| `/repairs/new`                     | Authorized repair ticket creators                      |
| `/repairs/{id}`                    | Role and ticket scoped                                 |
| `/api/repairs`                     | Scoped list and ticket creation                        |
| `/api/repairs/{id}`                | Scoped detail and repair update                        |
| `/api/repairs/{id}/assign`         | Administrator only                                     |
| `/pm`                              | Role-scoped upcoming PM jobs                           |
| `/pm/schedule`                     | Admin or warehouse                                     |
| `/pm/calendar`                     | Role-scoped monthly PM calendar                        |
| `/pm/history`                      | Role-scoped completed PM history                       |
| `/pm/{id}`                         | Role and PM job scoped                                 |
| `/api/pm`                          | Scoped list and PM scheduling                          |
| `/api/pm/{id}`                     | Scoped PM detail                                       |
| `/api/pm/{id}/complete`            | Admin or assigned technician                           |
| `/inventory`                       | Admin, warehouse, technician, executive                |
| `/api/inventory/parts`             | Scoped list; admin/warehouse create                    |
| `/api/inventory/parts/{id}`        | Admin/warehouse update or deactivate                   |
| `/api/inventory/movements`         | Scoped history; admin/warehouse mutations              |
| `/notifications`                   | Admin or executive read-only queue                     |
| `/api/analytics/export/excel`      | Admin or executive Excel export                        |
| `/api/analytics/export/pdf`        | Admin or executive PDF export                          |
| `/api/agent/commands`              | Admin command dispatcher with CSRF and idempotency     |
| `/assets/{id}/identity`            | Authenticated and asset-scoped                         |
| `/app/a/{publicId}`                | Public allowlisted asset lookup                        |
| `/api/assets/{id}/qr`              | Authenticated QR generation                            |
| `/api/assets/{id}/nfc/register`    | Admin or warehouse                                     |
| `/api/assets/{id}/nfc/verify`      | Admin, warehouse, or technician                        |
| `/api/health`                      | Public                                                 |
| `/api/auth/csrf`                   | Public, short-lived anti-CSRF token                    |
| `/api/auth/session`                | Public POST with Firebase ID token and CSRF validation |
| `/api/auth/logout`                 | Same-origin POST                                       |
| `/api/profile`                     | Authenticated GET/PATCH                                |
