# User and Access Management

## Purpose

The module gives active administrators a controlled interface for employee and
external-user provisioning. There is no public registration flow and no
password is displayed or stored by the application.

## Provisioning flow

1. An administrator enters the email, display name, role, and required scope.
2. Firebase Authentication creates a disabled-safe account with a random
   temporary password.
3. The canonical role is written to Firebase custom claims.
4. An active `users/{uid}` profile is created with matching role and scope.
5. Firebase sends a password-reset email so the user chooses their password.
6. The operation is written to `audit_logs`.

If provisioning fails, the partially created Firebase Authentication account is
removed.

## Role and scope rules

- `branch` requires `branchId` and cannot carry `customerId`.
- `customer` requires `customerId` and cannot carry `branchId`.
- Other roles are organization-wide and carry neither scope field.
- Administrators cannot disable themselves or remove their own administrator
  role.

## Role changes and disabling

Role, status, display name, and scope changes update Firebase Authentication,
custom claims, and Firestore. Refresh tokens are revoked after a successful
change, so the affected user must sign in again.

The administrator can resend a password-reset email. Reset requests and access
changes are audited.

## Security boundary

Browser clients cannot create users or modify privileged profile fields.
Management routes require:

- a valid server session;
- an active `admin` role;
- same-origin and CSRF validation for mutations.

The Firebase Admin SDK performs the privileged changes. Firestore Rules continue
to deny direct client creation, deletion, role changes, and status changes.
