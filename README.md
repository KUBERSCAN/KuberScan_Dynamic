# DynamicAlerts API

Express + MongoDB backend for KUBERSCAN.

## Endpoints

### Alerts

- `POST /alert`
- `GET /data/alerts`

### Incidents

- `GET /data/incidents`
- `POST /incident` (manual create)
- `DELETE /incident` (soft delete => `status: deleted`)

### Pod lifecycle

- `POST /pod/quarantine`
- `DELETE /pod/quarantine`
- `POST /pod/delete`

### Quarantine

- `GET /data/quarantined`

## Manual incident create

`POST /incident`

```json
{
  "id": "sample-incident-001",
  "pod": "test-alert",
  "namespace": "default",
  "severity": "Critical",
  "alertCount": 1,
  "status": "open"
}
```

Required fields: `id`, `pod`, `namespace`, `severity`.

## Soft delete incident

`DELETE /incident`

Accepted filters:

- `{ "_id": "..." }`
- `{ "id": "..." }`
- `{ "pod": "...", "namespace": "..." }`

Result: matching incidents are updated with `status = "deleted"`.
