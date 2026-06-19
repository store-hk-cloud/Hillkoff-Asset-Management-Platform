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

An administrative provisioning interface should be introduced as a dedicated
future identity-management feature with audit events and approval controls.
