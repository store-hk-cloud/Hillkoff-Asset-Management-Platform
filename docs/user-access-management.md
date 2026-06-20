# User and Access Management

## Purpose

The module gives active administrators a controlled interface for employee and
external-user provisioning. There is no public registration flow and no
password is displayed or stored by the application.

## Provisioning flow

1. An administrator enters the email, display name, role, and required scope.
2. Firebase Authentication creates an account with an unguessable random
   temporary password.
3. The canonical role is written to Firebase custom claims.
4. An `invited` `users/{uid}` profile is created with matching role and scope.
5. A one-time Hillkoff invitation is sent through Google Workspace SMTP.
6. The invitation remains valid for 72 hours. Opening it creates a fresh,
   short-lived Firebase password-reset action link.
7. Redeeming the invitation activates the profile and opens Firebase's secure
   password setup page.
8. The operation is written to `audit_logs`.

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

The administrator can resend an invitation. A new invitation revokes every
older pending invitation for the same account. Invitation issuance and
redemption are audited.

## Email delivery

Invitations are sent with Google Workspace SMTP using the configured Hillkoff
sender. Production must configure SPF, DKIM, and DMARC for the sender domain.
SMTP credentials are server-only Vercel environment variables and must never be
exposed as `NEXT_PUBLIC_*`.

Required production variables:

```text
USER_INVITATION_EXPIRES_IN_HOURS=72
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@hillkoff.com
SMTP_PASSWORD=<Google Workspace app password>
SMTP_FROM_EMAIL=no-reply@hillkoff.com
SMTP_FROM_NAME=Hillkoff Asset Management
SMTP_REPLY_TO=store-hk@hillkoff.com
```

For `smtp.gmail.com`, enable two-step verification on the sender account and
create an App Password. Organizations using Google Workspace SMTP Relay can
instead supply the approved relay host and credentials. Verify SPF, enable DKIM
in Google Admin, and publish a DMARC policy before production rollout.

## Security boundary

Browser clients cannot create users or modify privileged profile fields.
Management routes require:

- a valid server session;
- an active `admin` role;
- same-origin and CSRF validation for mutations.

The Firebase Admin SDK performs the privileged changes. Firestore Rules continue
to deny direct client creation, deletion, role changes, and status changes.
