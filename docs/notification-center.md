# Notification Center

`notification_queue` is a server-owned durable queue. UI clients have read-only
access for admin and executive roles and cannot enqueue or send notifications.

Cloud Functions enqueue Repair, PM, Installation, and low-stock System
notifications. Assignment notifications are addressed to the assigned
technician and are visible only to that technician, administrators, and
executives. Reassigning PM or Installation work creates a new notification for
the new technician.
`processNotificationQueue` runs every five minutes and supports:

- `pending`
- `sent`
- `failed`
- `retry`

The worker currently implements durable in-app/system delivery. Email, FCM,
LINE, or another provider can be inserted at the worker delivery boundary
without changing producers or UI.
