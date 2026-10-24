# SCEMS analytics service (FR-20)

A small Python service (FastAPI + pandas + scikit-learn) that predicts how many people will book
and attend upcoming events. **Owner: Role 6.**

It is internal: only the backend calls it, never the browser. The admin's analytics screen asks
the backend (`GET /api/admin/analytics/predictions`), the backend sends this service plain
numbers about past and upcoming events, and passes the answer on. This service never connects
to the database and never sees names, emails or event titles.

The descriptive numbers on the same screen (totals, attendance, ratings, by category, by month)
are computed by the backend itself, so they work even when this service is not running. See
`backend/src/modules/analytics/API.md`.

## Run it

```bash
cd analytics
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then set `ANALYTICS_URL="http://localhost:8000"` in the repo-root `.env` and restart the
backend. With Docker (`docker compose up --build`) use `http://analytics:8000`.

## Test it

```bash
cd analytics
python -m unittest -v
```

CI runs the same command (`.github/workflows/ci.yml`, job `analytics`).

## Endpoints

| Method and path | Purpose |
|---|---|
| `GET /health` | `{ success: true, data: { status: "up" } }` |
| `POST /predict-attendance` | body `{ history: PastEvent[], upcoming: UpcomingEvent[] }` |

Both event types carry `eventId, category, capacity, weekday (0 = Sunday), hour (campus time),
durationHours, leadDays, bookings`; past events also carry `checkIns`. The answer:

```json
{ "success": true, "data": {
    "method": "baseline", "trainedOn": 4, "showUpRate": 0.8,
    "predictions": [ { "eventId": "...", "expectedBookings": 48, "expectedAttendance": 38 } ] } }
```

## How the prediction works

Explained step by step at the top of `app/model.py`. In short:

1. **Demand** = the share of seats that get booked (fill rate). From 12 past events up, a random
   forest learns it from category, capacity, weekday, hour, length and how early the event was
   announced. With less history it uses the average of past events in the same category (or of
   all past events). It never predicts fewer bookings than an event already has, or more than
   its capacity.
2. **Show-up** = the share of confirmed seats that were checked in at past events where the
   organizer used check-in. 80% until there is such an event.
3. Expected attendance = expected bookings x show-up.

The `method` field says which one was used, so the screen can be honest about it.

## Data

`data/` is for raw historical exports while exploring. It is git-ignored: such files may hold
personal information. Never commit them.
