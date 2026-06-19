# Inventory Module

Inventory uses `inventory_parts` and immutable `inventory_movements`.

- Admin and warehouse roles manage parts and stock.
- Receive, issue, and signed adjustment operations use optimistic Firestore
  transactions.
- `quantityOnHand <= reorderPoint` drives low-stock alerts.
- Repair completion resolves Parts Used by Part Number and atomically updates
  the repair, Asset Event, Audit Log, inventory parts, and repair-linked
  inventory movements.
- Missing parts, stale versions, or insufficient stock abort the entire repair
  completion.
