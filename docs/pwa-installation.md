# Progressive Web App

## Installation

### Android

Open the production site in Chrome, sign in, and select **Install app**. Chrome
may also show an install icon in the address bar. The installed application
runs in standalone mode.

### iPhone and iPad

Open the production site in Safari, use **Share**, then select **Add to Home
Screen**. iOS does not expose the automatic install prompt used by Android.

## Offline policy

The service worker caches only:

- the offline fallback page;
- the web app manifest and application icons;
- immutable Next.js static assets requested by the browser.

Authenticated pages, APIs, Firebase data, session responses, asset records, and
business transactions are never cached by the service worker. Navigation uses
the network and falls back to `/offline` only when the network is unavailable.

Business mutations remain online-only to preserve Firestore transaction,
version, audit, and authorization guarantees.

## NFC limitations

Installing the PWA does not change browser NFC support:

- Android Chrome and an NFC-enabled device can write and verify NTAG213/215.
- iPhone and iPad can install the PWA, scan normal NFC links at the operating
  system level, and open public asset pages, but Web NFC writing and
  verification are not available.
