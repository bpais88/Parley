# Booking-engine and PMS integration path

Parley currently uses seeded inventory and a no-charge checkout. A production hotel should keep its existing booking engine and payment relationship.

## Read availability and rates

Connect the hotel's ARI source through its PMS, CRS, channel manager, or booking-engine API. Common providers include Mews, apaleo, Cloudbeds, SiteMinder, and Channex. Map property-local dates, room-type codes, restrictions, taxes, and inventory into Parley's normalized availability contract.

The negotiation engine should receive an immutable snapshot for a session. Money remains integer cents and occupancy dates remain in the property timezone.

## Hold inventory

Use a provider's tentative-reservation endpoint when supported. Otherwise, create a short database hold and recheck the provider immediately before redemption. The provider remains the inventory authority.

## Redeem an offer

After a human selects the visible acceptance button, create a single-use rate code or signed offer token containing the room type, dates, room count, total, inclusions, terms, and expiry. Redirect or post that code to the hotel's existing booking engine.

The hotel collects payment through its existing PCI-compliant checkout. Card data never enters a WebMCP tool or Parley's logs.

## Confirm and reconcile

Store the provider confirmation reference, then write the economic ledger from the accepted offer. Webhooks should handle provider cancellation or modification. A cancelled direct booking reverses inventory and is shown as cancelled; it must not silently rewrite the original offer trail.

## Production controls

- Use durable distributed rate limiting rather than the demo's instance-local limiter.
- Use hotel SSO or staff accounts instead of a shared passcode.
- Rotate signing keys and scope provider credentials per property.
- Apply idempotency keys to hold, redemption, payment handoff, and webhook processing.
- Audit policy changes and owner overrides.
- Test oversell, expiry, retry, timezone, and webhook-ordering cases against the provider sandbox.
