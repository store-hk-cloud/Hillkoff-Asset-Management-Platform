# NFC and QR Module

## Asset identity

Every newly created asset receives an internal Asset ID, random 128-bit Public
ID, NFC URL, and QR URL. The canonical public URL is:

```text
https://{application-domain}/app/a/{publicId}
```

Public IDs are immutable and are not derived from Asset Code, serial number, or
Firestore ID.

## Public lookup

Public lookup runs through a server repository. Anonymous Firestore access
remains denied.

- Anonymous visitors see only the machine Serial Number and operational status
  (`in_stock`, `sold`, `in_use`, or `archived`).
- Signed-in users see Asset Code, name, category, condition, NFC status,
  current branch/location, and the number of active machines with the same
  Asset Code that remain in branch stock.

Customer identity, documents, internal history, and internal Asset ID are never
returned by the verification projection.

## QR generation

QR images are generated on demand as SVG for display/print and 1024-pixel PNG
for download. No generated QR file is stored.

## NTAG213 and NTAG215

The module writes one NDEF URL record through Web NFC.

- NTAG213: 144 bytes user memory.
- NTAG215: 504 bytes user memory.

The browser performs a conservative capacity check. Web NFC requires HTTPS, a
user gesture, permission, NFC-enabled hardware, and Chrome on Android.

The application does not automatically call `makeReadOnly()`, because locking a
tag is irreversible.

## Registration and verification

Registration and verification each commit Asset NFC state, NFC registration,
Asset Event, and Audit Log atomically. Verification records `verified` or
`mismatch`.

NFC serial number is optional evidence only. NTAG213/215 static URLs do not
provide cryptographic proof of authenticity.

## Migration

Existing assets can be backfilled with:

```bash
npm run identity:backfill
```

This requires `NEXT_PUBLIC_APP_URL`, `IDENTITY_MIGRATION_ACTOR_UID`, and
Application Default Credentials. Each migration is atomic and audited.
