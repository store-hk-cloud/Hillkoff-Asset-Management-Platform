# Environment Setup

## Local requirements

- Node.js 20.9 or newer
- npm 10 or newer
- Firebase CLI for emulator and deployment workflows
- A Firebase/Google Cloud project for runtime integration

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add Firebase Web configuration.
3. Use Application Default Credentials where possible for server workloads.
4. Run `npm install`.
5. Run `npm run dev`.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run functions:build`

Never commit environment files, service-account JSON, private keys, or signed
URLs.

`NEXT_PUBLIC_APP_URL` must be the canonical HTTPS origin used in QR and NFC
labels. Changing it later requires issuing new labels or a controlled redirect.
