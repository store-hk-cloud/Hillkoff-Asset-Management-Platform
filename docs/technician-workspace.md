# Technician Workspace

`/technician` is the mobile-first field workspace for authenticated users with
the `technician` role. It combines assigned Repair, PM, and Installation work
without replacing the existing module detail pages.

## Workflow

1. An authorized dispatcher selects an active technician account.
2. The assignment is stored as `pending` and a notification is queued by Cloud
   Functions.
3. The technician accepts or rejects the assignment. Rejection requires a
   reason.
4. Accepted work can be performed from its existing Repair, PM, or Installation
   detail page.
5. Assignment changes create both `asset_events` and `audit_logs`.

Existing records without `assignmentStatus` are treated as `accepted` so the
deployment remains backward compatible.

## Workspace views

- New assignments, work in progress, and overdue counters.
- Today's work and all active Repair, PM, and Installation work.
- Completed, closed, cancelled, and rejected history.
- QR, NFC URL, Public ID, Asset ID, Asset Code, or Serial Number lookup.
- Web NFC scan on supported Android Chrome devices.
- Native phone QR/NFC scans open Asset Verification and show the signed-in
  technician's assigned work-order links.
- Read-only workload and history at `/technicians/[technicianId]` for
  administrators and executives.

Administrators can open a technician's history from the user-management detail
page.

## Assignment permissions

| Work type    | Roles that can assign |
| ------------ | --------------------- |
| Repair       | `admin`               |
| PM           | `admin`, `warehouse`  |
| Installation | `admin`, `sales`      |

The API resolves the technician name from the real `users` collection and
rejects disabled or non-technician accounts. A submitted display name is never
trusted.

## Offline behavior

Checklist and note drafts are stored in IndexedDB on the technician's device.
Repair and Installation photos selected while offline are queued locally and
uploaded when the browser receives the `online` event.

For security, protected pages are not cached as public HTML. The technician
must open a work page at least once while online before continuing that page
offline. The server remains authoritative: completion and status transitions
are submitted only after connectivity returns.

## Deployment

The Vercel deployment contains the web application. The following Firebase
resources must also be deployed after this feature is released:

```text
firebase deploy --only firestore:rules,firestore:indexes,functions
```

This activates technician notification triggers and the composite indexes used
by assigned-work and notification queries.
