# User Provisioning

There is no public registration flow. Every account must be provisioned by an
authorized administrator.

## Required records

For each user:

1. Create the Firebase Authentication account.
2. Set one custom claim: `{ "role": "<supported-role>" }`.
3. Create `users/{uid}` with the same email and role.
4. Set `status` to `active` only after the record has been reviewed.
5. Force the user to obtain a fresh ID token after a role change.

## Firestore document

```json
{
  "uid": "firebase-auth-uid",
  "email": "user@example.com",
  "displayName": "User name",
  "phoneNumber": null,
  "photoURL": null,
  "role": "technician",
  "status": "active",
  "branchId": null,
  "customerId": null,
  "lastLoginAt": null,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp",
  "version": 0
}
```

## Role changes

Role changes are privileged server operations. Update the custom claim first,
then the Firestore profile, revoke existing refresh tokens, and require the
user to sign in again. Never allow a browser client to write `role`, `status`,
`email`, `branchId`, or `customerId`.

## Disabling a user

Disable the Firebase Authentication account, set the Firestore profile status
to `disabled`, and revoke refresh tokens. The application and Security Rules
both deny disabled profiles.

Administrators can provision and manage accounts through `/users`. The
server-only workflow synchronizes Firebase Authentication, custom claims, and
Firestore profiles, and records privileged changes in `audit_logs`.

## First administrator

Provision the first administrator from a trusted terminal with Firebase Admin
credentials or Google Application Default Credentials:

```bash
npm run auth:provision-admin
```

The command prompts for the email, display name, and password. Password input is
masked and is never written to the repository. It creates or updates the
Firebase Authentication account, applies the `admin` custom claim, and creates
the matching active Firestore profile.

The command is idempotent and can repair an incomplete administrator account:

```bash
npm run auth:provision-admin -- \
  --email admin@hillkoff.com \
  --display-name "Hillkoff Administrator"
```

For controlled non-interactive environments, the command also accepts
`HILLKOFF_ADMIN_EMAIL`, `HILLKOFF_ADMIN_DISPLAY_NAME`, and
`HILLKOFF_ADMIN_PASSWORD`. Do not store those values in committed files, shell
history, CI logs, or shared deployment configuration.
