# NTAG424 DNA Future Architecture

This phase does not implement NTAG424 DNA personalization or cryptographic
verification.

## Strategy boundary

```text
NfcVerificationStrategy
├── StaticNdefUrlStrategy
└── SecureDynamicMessageVerificationPort
```

The future adapter will support Secure Dynamic Messaging, AES-128 CMAC,
encrypted UID/read counter, replay detection, key versions, rotation, and tag
revocation without changing current Asset use cases.

## Key management

Keys must never be stored in Firestore, browser code, logs, or repository
configuration. Production keys belong in Cloud KMS/HSM or a dedicated secure
key service with separate personalization and verification identities.

## Future URL

```text
/app/a/{publicId}?picc_data={encrypted}&enc={data}&cmac={mac}
```

The public route will select the configured strategy, verify CMAC, reject replay
counters, and return generic errors without leaking cryptographic diagnostics.

## Prerequisites

- Approved NXP personalization specification and test vectors.
- Secure key ceremony and rotation policy.
- Compatible personalization hardware or native application.
- Security review, penetration test, and tag revocation workflow.
