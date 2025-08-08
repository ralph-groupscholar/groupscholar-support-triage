# Group Scholar Support Triage

A local-first support desk for scholar-facing cases. Capture new support requests, score urgency, surface overdue risks, and generate weekly briefs without standing up new infrastructure.

## Features
- Case intake with urgency, category, owner, and SLA dates
- Priority scoring with overdue and stale touchpoint detection
- Action list for the top cases that need attention today
- Weekly brief output ready for leadership updates
- JSON import/export for sharing snapshots across teams
- Local storage persistence

## Getting started
Open `index.html` in your browser.

## Data format
Exported JSON is structured as:

```json
{
  "generatedAt": "2026-02-07T00:00:00.000Z",
  "cases": [
    {
      "id": "...",
      "scholar": "...",
      "summary": "...",
      "channel": "...",
      "category": "...",
      "urgency": "...",
      "status": "...",
      "owner": "...",
      "nextStep": "...",
      "created": "YYYY-MM-DD",
      "lastTouch": "YYYY-MM-DD",
      "due": "YYYY-MM-DD"
    }
  ]
}
```

## Tech
- HTML, CSS, JavaScript
- Local browser storage
