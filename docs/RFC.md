# Negotiable direct booking over WebMCP

Status: demo RFC, version 0.1.

## Motivation

Hotels commonly give an online travel agency a percentage of room revenue in exchange for distribution. A hotel website can show a lower direct rate, but until WebMCP it was not a place where the guest's browser agent could inspect live context and act in a shared session.

Parley turns part of the avoided commission into a deterministic negotiation envelope. The guest can receive a cash saving or low-cost perks, the hotel still nets more than the OTA outcome, and the platform takes a small fee.

## Roles on one page

- The guest gives intent to their browser agent.
- The browser agent uses tools registered by the hotel page and moves the interface the guest sees.
- The hotel policy engine computes offers from fixed commercial rules. It is not an LLM and does not improvise prices.
- The owner supplies the hard floor and can inspect the ledger.
- The guest alone decides whether to open visible checkout and confirm.

The timeline names the browser side as "Your agent" and the business side as "Casa do Zêzere · policy". These identities are intentionally explicit.

## Offer protocol

An offer contains a whole-euro room-night price, integer-cent totals, tax, rate plan, inclusions, terms, expiry, round, reason codes, an explanation, and a guest-value score. The reference demo offers are:

1. €110 per room-night, flexible, breakfast and late checkout, €1,650 room total.
2. €102 per room-night after a prepaid counter, non-refundable, same perks, €1,530 room total.

City tax is shown separately, so the second offer is €1,560 all-in. A later round cannot reduce guest value. Once the configured round cap is reached, Parley returns the standing final offer.

## Economic floor

For each room-night, Parley starts with the hotel's OTA net, adds the owner's minimum uplift, accounts for included-perk cost and the platform fee, then applies occupancy and payment caps. It always rounds upward to a whole euro. The engine is pure TypeScript: no network, clock, randomness, or LLM.

In the worked example, the hotel's net is €1,394.10. The same rooms at rack rate through a 20% commission OTA net €1,320. The hotel's uplift is therefore €74.10 after €90 perk cost and the €45.90 Parley fee.

## Human-only acceptance

There is no accept, pay, card, or cancellation tool. `get_stay_context` and `get_offer_status` state this explicitly. The visible button opens a short-lived demo checkout token bound to the visitor and negotiation. The form collects name and email only; it contains no card fields and processes no payment.

## Expiry and inventory

Holds expire after 15 minutes and offers after 10. A Postgres advisory lock makes hold creation atomic: availability is rechecked before a hold is inserted, preventing two concurrent holds from overselling the 12-room demo inventory. Cron closes stale rows and resets demo state.

## Security

- Strict JSON Schemas and Zod contracts reject extra or malformed fields.
- Personal and card-like fields are redacted from tool-call logs.
- A public property key identifies the hotel; origin policy and visitor cookies create the session boundary.
- Checkout tokens are stored only as SHA-256 hashes, expire quickly, and are single-use.
- Owner data and reset operations require the owner passcode.
- The debug shim exists only on localhost.

## Deliberate limits

The hackathon build has one property, one room type, seeded inventory, and a no-charge checkout. It does not claim PMS connectivity, real payment, multi-currency, guest authentication, or autonomous hotel intelligence. The integration path below keeps those boundaries explicit.
