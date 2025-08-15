# Group Scholar Support Triage

A local-first support desk for scholar-facing cases. Capture new support requests, score urgency, surface overdue risks, and generate weekly briefs without standing up new infrastructure.

## Features
- Case intake with urgency, category, owner, and SLA dates
- Priority scoring with due-soon and touchpoint SLA detection
- Action list for the top cases that need attention today
- Weekly brief output ready for leadership updates
- JSON import/export for sharing snapshots across teams
- Local storage persistence
- Optional shared Postgres storage for team-wide visibility

## Getting started (local)
Open `index.html` in your browser.

## Getting started (shared database)
1. Install dependencies:

```bash
npm install
```

2. Start the API server (reads `DATABASE_URL` if set, otherwise uses local file storage):

```bash
node server.js
```

3. Open `http://localhost:3000`.

## Database seeding
Seed the production database with realistic sample cases using the helper script. This requires `DATABASE_URL` to be set in your environment (do not commit credentials).

```bash
node scripts/seed-db.js
```

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
- Node.js, Express, Postgres (optional)
- Local browser storage
