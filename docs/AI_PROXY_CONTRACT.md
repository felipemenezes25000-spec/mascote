# AI Proxy Contract

Endpoint: `POST /v1/mascot/reply`

## Request schema

```json
{
  "personality": "calmo | motivador | fofo | sabio",
  "message": "string",
  "history": [
    {
      "role": "user | mascot",
      "content": "string"
    }
  ],
  "mascotName": "string (optional)",
  "userId": "string (optional)",
  "system_prompt": "string",
  "personality_flavor": "string",
  "recent_replies": ["string"]
}
```

### Notes

- `system_prompt` already includes memory and DNA-safe descriptors (never raw genes).
- `history` is the latest conversation context from mobile.
- `recent_replies` should be used to reduce repeated phrasing.
- `userId` is optional and used only for backend telemetry/rate-limiting policies.

## Response schema

```json
{
  "reply": "string",
  "safety_flag": "safe | watch | high | critical",
  "usage": {
    "total_tokens": 123
  }
}
```

### Notes

- `reply` is required for success.
- `usage.total_tokens` is optional; when present, the client stores it for cost tracking.
