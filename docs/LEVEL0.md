# Level 0: negotiable hotel discovery

Version 0.1.

Level 0 is a small `/.well-known/negotiate.json` document that lets any agent discover whether a hotel accepts structured direct-deal requests before page-specific tools are loaded.

## Example

```json
{
  "version": "0.1",
  "negotiable": true,
  "property": {
    "name": "Casa do Zêzere",
    "website": "https://parleywebmcp.vercel.app/demo",
    "city": "Ferreira do Zêzere, PT"
  },
  "direct_deal": {
    "beats_ota_rate_up_to_pct": 12,
    "perks": ["breakfast", "late_checkout", "upgrade_when_available"]
  },
  "channels": { "webmcp": true },
  "group_threshold_rooms": 4,
  "human_only": ["accept", "payment", "cancellation_elsewhere"]
}
```

## Fields

- `version`: specification version; consumers must tolerate unknown fields.
- `negotiable`: whether the property currently accepts direct-deal requests.
- `property`: display name, canonical website, and optional city.
- `direct_deal`: an indicative maximum saving and machine-readable perk codes. It is discovery, not a binding quote.
- `channels.webmcp`: whether the page registers WebMCP tools.
- `group_threshold_rooms`: the count the hotel regards as a group.
- `human_only`: actions an agent must not attempt.

Unknown fields should be ignored. Missing arrays default to empty. A consumer must still use live availability and offer tools; the Level 0 document never creates a hold or booking.

## Alternate discovery

Sites that cannot serve a well-known path may publish:

```html
<meta name="negotiate" content="https://hotel.example/negotiate.json">
```

The current hackathon build demonstrates the well-known document and WebMCP channel. Email fallback and remote URL validation were cut from the submission scope and are not claimed.
