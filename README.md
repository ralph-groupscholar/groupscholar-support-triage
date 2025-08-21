# Group Scholar Support Triage

A local-first support desk for scholar-facing cases with optional cloud sync. Capture new support requests, score urgency, surface overdue risks, and generate weekly briefs with shared visibility when needed.

## Features
- Case intake with urgency, category, owner, and SLA dates
- Priority scoring with due-soon and touchpoint SLA detection
- Action list for the top cases that need attention today
- Outreach plan for high-touch cases that need updates or escalations
- SLA outlook for upcoming due dates and touchpoint deadlines
- Recent activity feed for touches, resolves, and intake updates
- Case aging summary, channel mix, and signal breakdown insights
- Resolution velocity and SLA compliance tracking
- Weekly brief output ready for leadership updates
- JSON import/export for sharing snapshots across teams
- Local storage persistence
- Optional Postgres sync for team-wide visibility
- Storage health indicator in the UI

## Getting started (local)
Open `index.html` in your browser for local-first mode.

## Cloud sync
Deploy to Vercel and set `DATABASE_URL` to a Postgres connection string. The API lives in `api/cases.js` (plus `api/health.js` and `api/seed.js`), and the schema + seed SQL live in `data/schema.sql` and `data/seed.sql`. The UI automatically checks `/api/health` and switches to the shared database when available.

To initialize the production database with schema + sample data, run:

```bash
DATABASE_URL="postgres://user:pass@host:port/db" npm run setup-db
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
- Node.js (Vercel serverless functions)
- PostgreSQL (optional sync)
