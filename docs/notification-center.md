# Notification Center

`notification_queue` is a server-owned durable queue. UI clients have read-only
access for admin and executive roles and cannot enqueue or send notifications.

Cloud Functions enqueue Repair, PM, and low-stock System notifications.
`processNotificationQueue` runs every five minutes and supports:

- `pending`
- `sent`
- `failed`
- `retry`

The worker currently implements durable in-app/system delivery. Email, FCM,
LINE, or another provider can be inserted at the worker delivery boundary
without changing producers or UI.
